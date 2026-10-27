import { afterRenderEffect, Component, ElementRef, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { RagApi } from '../../core/rag-api';
import { COLLECTIONS } from '../../core/mock/corpus';
import { Icon } from '../../shared/icon';

/** Opens the cited document next to the answer, scrolled to and highlighting the cited passage. */
@Component({
  selector: 'app-source-viewer',
  imports: [DatePipe, Icon],
  host: { role: 'complementary', 'aria-label': 'Source document', '(keydown.escape)': 'close.emit()' },
  template: `
    <header>
      @if (doc.value(); as d) {
        <div>
          <span class="badge accent">{{ collectionName(d.collectionId) }}</span>
          <h2>{{ d.title }}</h2>
          <p>{{ d.fileName }} · {{ d.owner }} · updated {{ d.updatedAt | date: 'mediumDate' }}</p>
        </div>
      } @else {
        <div class="skeleton" style="height: 48px; flex: 1"></div>
      }
      <button class="btn ghost icon" (click)="close.emit()" aria-label="Close source"><app-icon name="close" /></button>
    </header>

    <div class="content">
      @if (doc.isLoading()) {
        @for (i of [1, 2, 3]; track i) {
          <div class="skeleton" style="height: 90px; margin-bottom: 16px"></div>
        }
      } @else if (doc.value(); as d) {
        @for (chunk of d.chunks; track chunk.id) {
          <section [class.hit]="chunk.id === chunkId()" [attr.data-chunk]="chunk.id">
            <h3>{{ chunk.heading }}</h3>
            <p>{{ chunk.text }}</p>
            @if (chunk.id === chunkId()) {
              <span class="badge accent">Cited passage</span>
            }
          </section>
        }
      } @else {
        <p>This document is no longer available.</p>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; background: var(--surface); border-left: 1px solid var(--border); }
    header { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
    header > div { flex: 1; min-width: 0; }
    h2 { margin: 6px 0 2px; font-size: 17px; }
    header p { margin: 0; color: var(--text-3); font-size: 13px; }
    .content { flex: 1; overflow-y: auto; padding: 8px 18px 24px; }
    section { margin: 0 -10px; padding: 10px; border-radius: var(--radius-sm); scroll-margin: 24px; transition: background 0.3s; }
    section.hit { background: var(--highlight); box-shadow: inset 3px 0 0 var(--warning); }
    h3 { margin-bottom: 4px; font-size: 14px; }
    p { margin: 0; color: var(--text-2); font-size: 14px; }
    .badge { margin-top: 6px; }
  `,
})
export class SourceViewer {
  private readonly api = inject(RagApi);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly documentId = input.required<string>();
  readonly chunkId = input<string | null>(null);
  readonly close = output();

  protected readonly doc = rxResource({
    params: () => this.documentId(),
    stream: ({ params }) => this.api.document(params),
  });

  constructor() {
    afterRenderEffect(() => {
      if (!this.doc.value()) return;
      const chunkId = this.chunkId();
      this.host.nativeElement.querySelector(`[data-chunk="${chunkId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  protected collectionName(id: string): string {
    return COLLECTIONS.find((c) => c.id === id)?.name ?? id;
  }
}
