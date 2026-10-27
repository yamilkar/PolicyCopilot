import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RetrievalTrace } from '../../core/models';

/** What happened behind an answer: query rewrite, retrieved chunks and time per stage. */
@Component({
  selector: 'app-retrieval-inspector',
  imports: [DecimalPipe],
  template: `
    @let t = trace();
    <dl class="meta">
      <div><dt>Rewritten query</dt><dd><code>{{ t.rewrittenQuery }}</code></dd></div>
      <div><dt>Collections</dt><dd>{{ t.collections.join(', ') }}</dd></div>
      <div><dt>Model</dt><dd>{{ t.model }}</dd></div>
      <div><dt>Tokens</dt><dd>{{ t.tokens.prompt | number }} in · {{ t.tokens.completion | number }} out</dd></div>
    </dl>

    <h4>Latency · {{ total() | number }} ms</h4>
    <div class="stages" role="img" [attr.aria-label]="stagesLabel()">
      @for (s of stages(); track s.name) {
        <span [style.flex-grow]="s.ms" [class]="s.name" [title]="s.name + ': ' + s.ms + ' ms'"></span>
      }
    </div>
    <ul class="legend">
      @for (s of stages(); track s.name) {
        <li><i [class]="s.name"></i>{{ s.name }} {{ s.ms }} ms</li>
      }
    </ul>

    <h4>Top {{ t.retrieved.length }} retrieved chunks</h4>
    <table>
      <thead><tr><th scope="col">Chunk</th><th scope="col">Section</th><th scope="col" class="num">Score</th></tr></thead>
      <tbody>
        @for (r of t.retrieved; track r.chunkId) {
          <tr>
            <td><code>{{ r.chunkId }}</code></td>
            <td>{{ r.documentTitle }} › {{ r.heading }}</td>
            <td class="num">
              <span class="bar"><span [style.width.%]="r.score * 100"></span></span>
              {{ r.score | number: '1.2-2' }}
            </td>
          </tr>
        } @empty {
          <tr><td colspan="3">No chunks matched.</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host { display: block; padding: 12px 14px; border: 1px dashed var(--border); border-radius: var(--radius-sm); background: var(--surface-2); font-size: 13px; }
    .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 16px; margin: 0 0 12px; }
    dt { color: var(--text-3); font-size: 12px; }
    dd { margin: 0; }
    code { font: 12px var(--mono); }
    td code { white-space: nowrap; }
    @media (max-width: 600px) { th:first-child, td:first-child { display: none; } }
    h4 { margin: 12px 0 6px; font-size: 12px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; }
    .stages { display: flex; gap: 2px; height: 10px; border-radius: 4px; overflow: hidden; }
    .stages span { min-width: 3px; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 6px 0 0; padding: 0; list-style: none; color: var(--text-2); }
    .legend i { display: inline-block; width: 8px; height: 8px; margin-right: 5px; border-radius: 2px; }
    .embed { background: #7c95ff; } .search { background: #3fb5a3; } .rerank { background: #e0a43a; } .generate { background: #b07cd8; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; color: var(--text-3); font-weight: 500; font-size: 12px; }
    th, td { padding: 4px 6px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .bar { display: inline-block; width: 48px; height: 6px; margin-right: 6px; border-radius: 3px; background: var(--surface-3); vertical-align: middle; }
    .bar span { display: block; height: 100%; border-radius: 3px; background: var(--accent); }
  `,
})
export class RetrievalInspector {
  readonly trace = input.required<RetrievalTrace>();

  protected readonly stages = computed(() => {
    const t = this.trace().timings;
    return [
      { name: 'embed', ms: t.embedMs },
      { name: 'search', ms: t.searchMs },
      { name: 'rerank', ms: t.rerankMs },
      { name: 'generate', ms: t.generateMs },
    ];
  });
  protected readonly total = computed(() => this.stages().reduce((n, s) => n + s.ms, 0));
  protected readonly stagesLabel = computed(() => 'Latency by stage: ' + this.stages().map((s) => `${s.name} ${s.ms} ms`).join(', '));
}
