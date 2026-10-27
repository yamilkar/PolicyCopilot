import { Component, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ChatStore } from './core/chat-store';
import { ThemeService } from './core/theme';
import { Icon } from './shared/icon';
import { CommandPalette } from './shared/command-palette';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, CommandPalette],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class App {
  protected readonly store = inject(ChatStore);
  protected readonly theme = inject(ThemeService);
  protected readonly menuOpen = signal(false);
  protected readonly shortcut = navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K';
  private readonly palette = viewChild.required(CommandPalette);

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.palette().open();
    }
  }

  protected openPalette(): void {
    this.palette().open();
  }
}
