import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ChatStore } from '../core/chat-store';
import { ThemeService } from '../core/theme';
import { SUGGESTED_QUESTIONS } from '../core/mock/corpus';
import { Icon, IconName } from './icon';

interface Command {
  label: string;
  group: string;
  icon: IconName;
  run: () => void;
}

/** ⌘K / Ctrl+K: jump anywhere, reopen a conversation or ask a question. */
@Component({
  selector: 'app-command-palette',
  imports: [Icon],
  template: `
    <dialog #dialog aria-label="Command palette" (close)="query.set('')" (click)="onBackdrop($event)">
      <div class="search">
        <app-icon name="search" />
        <input
          #input
          type="text"
          placeholder="Search or ask a question…"
          aria-label="Search commands"
          role="combobox"
          aria-controls="palette-list"
          aria-expanded="true"
          [attr.aria-activedescendant]="'cmd-' + activeIndex()"
          [value]="query()"
          (input)="query.set(input.value); activeIndex.set(0)"
          (keydown)="onKeydown($event)"
        />
      </div>
      <ul id="palette-list" role="listbox">
        @for (command of results(); track command.label; let i = $index) {
          @if (i === 0 || results()[i - 1].group !== command.group) {
            <li class="group" role="presentation">{{ command.group }}</li>
          }
          <li
            [id]="'cmd-' + i"
            role="option"
            [attr.aria-selected]="i === activeIndex()"
            (click)="execute(command)"
            (mousemove)="activeIndex.set(i)"
          >
            <app-icon [name]="command.icon" [size]="16" />
            <span>{{ command.label }}</span>
          </li>
        }
      </ul>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(560px, calc(100vw - 32px));
      margin: 12vh auto auto;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-lg);
      &::backdrop { background: rgb(0 0 0 / 35%); }
    }
    .search {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text-3);
    }
    input { flex: 1; border: 0; outline: 0; background: none; font-size: 16px; }
    ul { max-height: 50vh; margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
    .group { padding: 8px 10px 4px; color: var(--text-3); font-size: 12px; font-weight: 600; }
    [role='option'] {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer;
      &[aria-selected='true'] { background: var(--accent-soft); color: var(--accent-strong); }
    }
  `,
})
export class CommandPalette {
  private readonly router = inject(Router);
  private readonly store = inject(ChatStore);
  private readonly theme = inject(ThemeService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly commands = computed<Command[]>(() => [
    { label: 'New question', group: 'Go to', icon: 'plus', run: () => this.go('/ask', null) },
    { label: 'Documents', group: 'Go to', icon: 'file', run: () => this.router.navigateByUrl('/documents') },
    { label: 'Insights', group: 'Go to', icon: 'chart', run: () => this.router.navigateByUrl('/insights') },
    { label: 'Toggle dark mode', group: 'Go to', icon: 'moon', run: () => this.theme.toggle() },
    ...this.store.conversations().slice(0, 8).map<Command>((c) => ({ label: c.title, group: 'Recent', icon: 'chat', run: () => this.go(`/ask/${c.id}`, c.id) })),
    ...SUGGESTED_QUESTIONS.map<Command>((q) => ({ label: q, group: 'Suggested questions', icon: 'sparkle', run: () => this.ask(q) })),
  ]);

  protected readonly results = computed<Command[]>(() => {
    const q = this.query().trim().toLowerCase();
    const matches = this.commands().filter((c) => !q || c.label.toLowerCase().includes(q));
    // Free text can always be asked as a question.
    return q ? [...matches, { label: `Ask “${this.query().trim()}”`, group: 'Ask', icon: 'send', run: () => this.ask(this.query().trim()) }] : matches;
  });

  open(): void {
    this.activeIndex.set(0);
    this.dialog().nativeElement.showModal();
    this.input().nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown') this.activeIndex.update((i) => (i + 1) % count);
    else if (event.key === 'ArrowUp') this.activeIndex.update((i) => (i - 1 + count) % count);
    else if (event.key === 'Enter') this.execute(this.results()[this.activeIndex()]);
    else return;
    event.preventDefault();
    this.dialog().nativeElement.querySelector(`#cmd-${this.activeIndex()}`)?.scrollIntoView({ block: 'nearest' });
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
  }

  protected execute(command: Command | undefined): void {
    if (!command) return;
    this.dialog().nativeElement.close();
    command.run();
  }

  private go(url: string, conversationId: string | null): void {
    this.store.open(conversationId);
    this.router.navigateByUrl(url);
  }

  private ask(question: string): void {
    this.store.open(null);
    const id = this.store.ask(question);
    this.router.navigateByUrl(`/ask/${id}`);
  }
}
