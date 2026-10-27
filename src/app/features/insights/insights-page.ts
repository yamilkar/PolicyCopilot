import { Component, computed, inject } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { ChatStore } from '../../core/chat-store';
import { RagApi } from '../../core/rag-api';
import { Icon } from '../../shared/icon';
import { DailyChart } from './daily-chart';

@Component({
  selector: 'app-insights-page',
  imports: [DecimalPipe, PercentPipe, RouterLink, Icon, DailyChart],
  templateUrl: './insights-page.html',
  styleUrl: './insights-page.scss',
})
export class InsightsPage {
  private readonly api = inject(RagApi);
  private readonly store = inject(ChatStore);
  private readonly router = inject(Router);

  protected readonly analytics = rxResource({ stream: () => this.api.analytics() });
  protected readonly maxCitations = computed(() => Math.max(1, ...(this.analytics.value()?.topDocuments.map((d) => d.citations) ?? [])));

  protected askAgain(question: string): void {
    this.store.open(null);
    const id = this.store.ask(question);
    this.router.navigate(['/ask', id]);
  }
}
