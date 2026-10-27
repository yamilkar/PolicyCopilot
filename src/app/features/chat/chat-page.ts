import { afterRenderEffect, Component, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { ChatStore } from '../../core/chat-store';
import { Citation, FeedbackReason } from '../../core/models';
import { RagApi } from '../../core/rag-api';
import { SUGGESTED_QUESTIONS } from '../../core/mock/corpus';
import { Icon } from '../../shared/icon';
import { Composer } from './composer';
import { Message } from './message';
import { SourceViewer } from './source-viewer';

const DEV_MODE_KEY = 'policy-copilot.dev-mode';

@Component({
  selector: 'app-chat-page',
  imports: [Composer, Icon, Message, SourceViewer],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.scss',
})
export class ChatPage {
  private readonly api = inject(RagApi);
  private readonly router = inject(Router);
  protected readonly store = inject(ChatStore);

  /** Conversation id from the route (`/ask/:id`). */
  readonly id = input<string>();

  protected readonly collections = rxResource({ stream: () => this.api.collections() });
  protected readonly suggestions = SUGGESTED_QUESTIONS;
  protected readonly source = signal<Citation | null>(null);
  protected readonly devMode = signal(readDevMode());

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly composer = viewChild.required(Composer);
  private stickToBottom = true;

  constructor() {
    effect(() => {
      const id = this.id() ?? null;
      untracked(() => {
        this.store.open(id);
        this.source.set(null);
        this.stickToBottom = true;
      });
    });

    effect(() => {
      const on = this.devMode();
      try {
        localStorage.setItem(DEV_MODE_KEY, String(on));
      } catch {
        // Not critical.
      }
    });

    // Follow the streaming answer unless the user scrolled up to read something.
    afterRenderEffect(() => {
      this.store.messages();
      const el = this.scroller()?.nativeElement;
      if (el && this.stickToBottom) el.scrollTop = el.scrollHeight;
    });
  }

  protected ask(question: string): void {
    this.stickToBottom = true;
    const id = this.store.ask(question);
    if (this.id() !== id) this.router.navigate(['/ask', id], { replaceUrl: !this.id() });
  }

  protected toggleScope(collectionId: string): void {
    this.store.scope.update((scope) => (scope.includes(collectionId) ? scope.filter((s) => s !== collectionId) : [...scope, collectionId]));
  }

  protected rate(messageId: string, feedback: { helpful: boolean; reason?: FeedbackReason }): void {
    this.store.rate(messageId, feedback.helpful, feedback.reason);
  }

  protected onScroll(el: HTMLElement): void {
    this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  protected closeSource(): void {
    this.source.set(null);
    this.composer().focus();
  }
}

function readDevMode(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}
