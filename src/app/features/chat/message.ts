import { Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { parseAnswer } from '../../core/answer-format';
import { ChatMessage, Citation, FeedbackReason } from '../../core/models';
import { Icon } from '../../shared/icon';
import { RetrievalInspector } from './retrieval-inspector';

@Component({
  selector: 'app-message',
  imports: [DecimalPipe, Icon, RetrievalInspector],
  templateUrl: './message.html',
  styleUrl: './message.scss',
  host: { '[class]': 'message().role' },
})
export class Message {
  readonly message = input.required<ChatMessage>();
  readonly devMode = input(false);
  readonly selectedChunkId = input<string | null>(null);
  readonly openSource = output<Citation>();
  readonly followUp = output<string>();
  readonly rate = output<{ helpful: boolean; reason?: FeedbackReason }>();

  protected readonly blocks = computed(() => parseAnswer(this.message().text));
  protected readonly askingReason = signal(false);
  protected readonly copied = signal(false);
  protected readonly reasons: { id: FeedbackReason; label: string }[] = [
    { id: 'wrong-source', label: 'Wrong source' },
    { id: 'outdated', label: 'Outdated' },
    { id: 'incomplete', label: 'Incomplete' },
    { id: 'other', label: 'Something else' },
  ];

  protected citation(index: number): Citation | undefined {
    return this.message().citations?.find((c) => c.index === index);
  }

  protected onCite(index: number): void {
    const citation = this.citation(index);
    if (citation) this.openSource.emit(citation);
  }

  protected thumbsUp(): void {
    this.askingReason.set(false);
    this.rate.emit({ helpful: true });
  }

  protected thumbsDown(reason?: FeedbackReason): void {
    if (!reason) {
      this.askingReason.set(true);
      return;
    }
    this.askingReason.set(false);
    this.rate.emit({ helpful: false, reason });
  }

  protected async copy(): Promise<void> {
    const text = this.message().text.replace(/\*\*/g, '');
    const sources = (this.message().citations ?? []).map((c) => `[${c.index}] ${c.documentTitle} › ${c.heading}`).join('\n');
    try {
      await navigator.clipboard.writeText(sources ? `${text}\n\nSources:\n${sources}` : text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }
}
