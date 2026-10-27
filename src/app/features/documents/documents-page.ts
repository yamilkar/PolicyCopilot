import { Component, computed, DestroyRef, inject, linkedSignal, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { IngestionStatus, PolicyDocument } from '../../core/models';
import { RagApi } from '../../core/rag-api';
import { Icon } from '../../shared/icon';
import { SourceViewer } from '../chat/source-viewer';

const STEPS: { status: IngestionStatus; label: string }[] = [
  { status: 'uploading', label: 'Upload' },
  { status: 'parsing', label: 'Parse' },
  { status: 'chunking', label: 'Chunk' },
  { status: 'embedding', label: 'Embed' },
  { status: 'ready', label: 'Ready' },
];

@Component({
  selector: 'app-documents-page',
  imports: [DatePipe, DecimalPipe, Icon, SourceViewer],
  templateUrl: './documents-page.html',
  styleUrl: './documents-page.scss',
})
export class DocumentsPage {
  private readonly api = inject(RagApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps = STEPS;
  protected readonly collections = rxResource({ stream: () => this.api.collections() });
  private readonly loaded = rxResource({ stream: () => this.api.documents() });
  /** Server list, plus local changes while uploads progress. */
  protected readonly documents = linkedSignal(() => this.loaded.value() ?? []);
  protected readonly loading = this.loaded.isLoading;

  protected readonly query = signal('');
  protected readonly collectionFilter = signal<string | null>(null);
  protected readonly uploadCollection = signal('hr');
  protected readonly dragging = signal(false);
  protected readonly viewing = signal<PolicyDocument | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const collection = this.collectionFilter();
    return this.documents().filter(
      (d) => (!collection || d.collectionId === collection) && (!q || `${d.title} ${d.fileName} ${d.owner}`.toLowerCase().includes(q)),
    );
  });
  protected readonly totals = computed(() => {
    const ready = this.documents().filter((d) => d.status === 'ready');
    return { documents: ready.length, chunks: ready.reduce((n, d) => n + d.chunks.length, 0) };
  });

  protected collectionName(id: string): string {
    return this.collections.value()?.find((c) => c.id === id)?.name ?? id;
  }

  protected stepIndex(status: IngestionStatus): number {
    return STEPS.findIndex((s) => s.status === status);
  }

  protected onFiles(files: FileList | null): void {
    for (const file of Array.from(files ?? [])) {
      const subscription = this.api.upload(file, this.uploadCollection()).subscribe((doc) => {
        this.documents.update((list) => (list.some((d) => d.id === doc.id) ? list.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...list]));
      });
      this.destroyRef.onDestroy(() => subscription.unsubscribe());
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.onFiles(event.dataTransfer?.files ?? null);
  }

  protected remove(doc: PolicyDocument): void {
    if (!confirm(`Remove "${doc.title}" from the knowledge base? Answers will no longer cite it.`)) return;
    this.api.deleteDocument(doc.id).subscribe(() => {
      this.documents.update((list) => list.filter((d) => d.id !== doc.id));
      if (this.viewing()?.id === doc.id) this.viewing.set(null);
    });
  }
}
