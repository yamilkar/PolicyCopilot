import { Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DailyCount } from '../../core/models';

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };
const GAP = 2; // surface gap between stacked segments

interface Bar {
  day: DailyCount;
  x: number;
  width: number;
  answeredPath: string;
  unansweredPath: string | null;
}

/** Stacked daily bars: answered (blue) and unanswered (orange), with hover tooltip and a table view. */
@Component({
  selector: 'app-daily-chart',
  imports: [DatePipe],
  template: `
    <div class="head">
      <ul class="legend">
        <li><i class="answered"></i>Answered</li>
        <li><i class="unanswered"></i>Not answered</li>
      </ul>
      <button class="btn ghost" (click)="showTable.set(!showTable())" [attr.aria-pressed]="showTable()">
        {{ showTable() ? 'Show chart' : 'Show table' }}
      </button>
    </div>

    @if (showTable()) {
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Date</th><th scope="col" class="num">Answered</th><th scope="col" class="num">Not answered</th></tr></thead>
          <tbody>
            @for (d of data(); track d.date) {
              <tr><td>{{ d.date | date: 'EEE d MMM' }}</td><td class="num">{{ d.answered }}</td><td class="num">{{ d.unanswered }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="plot" (mouseleave)="hover.set(null)">
        <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="summary()">
          @for (t of ticks(); track t.value) {
            <line class="grid" [attr.x1]="padLeft" [attr.x2]="width - padRight" [attr.y1]="t.y" [attr.y2]="t.y" />
            <text class="axis" [attr.x]="padLeft - 6" [attr.y]="t.y + 4" text-anchor="end">{{ t.value }}</text>
          }
          @for (b of bars(); track b.day.date; let i = $index) {
            <path class="answered" [attr.d]="b.answeredPath" [class.dim]="hover() !== null && hover() !== i" />
            @if (b.unansweredPath) {
              <path class="unanswered" [attr.d]="b.unansweredPath" [class.dim]="hover() !== null && hover() !== i" />
            }
            <!-- Weekly labels counted back from today, so the last bar is always labelled. -->
            @if ((bars().length - 1 - i) % 7 === 0) {
              <text class="axis" [attr.x]="b.x + b.width / 2" [attr.y]="height - 8" text-anchor="middle">{{ b.day.date | date: 'd MMM' }}</text>
            }
            <!-- Full-height hit target, wider than the mark. -->
            <rect class="hit" [attr.x]="b.x - 1" [attr.y]="padTop" [attr.width]="b.width + 2" [attr.height]="plotHeight" (mouseenter)="hover.set(i)" />
          }
          <line class="baseline" [attr.x1]="padLeft" [attr.x2]="width - padRight" [attr.y1]="baseY" [attr.y2]="baseY" />
        </svg>
        @if (hovered(); as h) {
          <div class="tooltip" [style.left.%]="h.leftPct">
            <strong>{{ h.bar.day.date | date: 'EEEE d MMM' }}</strong>
            <span><i class="answered"></i>Answered <b>{{ h.bar.day.answered }}</b></span>
            <span><i class="unanswered"></i>Not answered <b>{{ h.bar.day.unanswered }}</b></span>
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; --series-1: #2a78d6; --series-2: #eb6834; }
    :host-context([data-theme='dark']) { --series-1: #3987e5; --series-2: #d95926; }
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; padding: 0; list-style: none; color: var(--text-2); font-size: 13px; }
    .legend li { white-space: nowrap; }
    i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; vertical-align: -1px; }
    i.answered { background: var(--series-1); } i.unanswered { background: var(--series-2); }
    .plot { position: relative; }
    svg { display: block; width: 100%; height: auto; overflow: visible; }
    .grid { stroke: var(--border); stroke-dasharray: 2 4; }
    .baseline { stroke: var(--text-3); stroke-width: 1; }
    .axis { fill: var(--text-3); font-size: 11px; font-variant-numeric: tabular-nums; }
    path.answered { fill: var(--series-1); } path.unanswered { fill: var(--series-2); }
    path { transition: opacity 0.15s; } .dim { opacity: 0.35; }
    .hit { fill: transparent; cursor: default; }
    .tooltip {
      position: absolute; top: 0; transform: translate(-50%, -100%); pointer-events: none;
      display: grid; gap: 2px; padding: 8px 10px; white-space: nowrap;
      border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface);
      box-shadow: var(--shadow-lg); color: var(--text-2); font-size: 12px;
      strong { color: var(--text); } b { color: var(--text); margin-left: 4px; }
    }
    .table-wrap { max-height: 240px; overflow-y: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: left; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
  `,
})
export class DailyChart {
  readonly data = input.required<DailyCount[]>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly padLeft = PAD.left;
  protected readonly padRight = PAD.right;
  protected readonly padTop = PAD.top;
  protected readonly plotHeight = H - PAD.top - PAD.bottom;
  protected readonly baseY = H - PAD.bottom;

  protected readonly showTable = signal(false);
  protected readonly hover = signal<number | null>(null);

  private readonly max = computed(() => niceMax(Math.max(1, ...this.data().map((d) => d.answered + d.unanswered))));

  protected readonly ticks = computed(() => {
    const max = this.max();
    return [0, max / 2, max].map((value) => ({ value, y: this.y(value) }));
  });

  protected readonly bars = computed<Bar[]>(() => {
    const data = this.data();
    const slot = (W - PAD.left - PAD.right) / data.length;
    const width = Math.max(4, slot * 0.66);
    return data.map((day, i) => {
      const x = PAD.left + i * slot + (slot - width) / 2;
      const answeredTop = this.y(day.answered);
      const totalTop = this.y(day.answered + day.unanswered);
      const hasUnanswered = day.unanswered > 0 && answeredTop - totalTop > GAP + 1;
      return {
        day,
        x,
        width,
        answeredPath: column(x, answeredTop, width, this.baseY - answeredTop, hasUnanswered ? 0 : 4),
        unansweredPath: hasUnanswered ? column(x, totalTop, width, answeredTop - GAP - totalTop, 4) : null,
      };
    });
  });

  protected readonly hovered = computed(() => {
    const i = this.hover();
    if (i === null) return null;
    const bar = this.bars()[i];
    return bar ? { bar, leftPct: ((bar.x + bar.width / 2) / W) * 100 } : null;
  });

  protected readonly summary = computed(() => {
    const data = this.data();
    const total = data.reduce((n, d) => n + d.answered + d.unanswered, 0);
    return `Questions per day over the last ${data.length} days, ${total} in total. Use Show table for exact values.`;
  });

  private y(value: number): number {
    return this.baseY - (value / this.max()) * this.plotHeight;
  }
}

/** A bar anchored to the baseline with only its data end rounded. */
function column(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function niceMax(value: number): number {
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}
