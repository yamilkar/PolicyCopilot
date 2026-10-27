import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { Icon } from '../../shared/icon';

const MAX_LENGTH = 4000; // Same limit as ChatRequest in docs-ai-assistant.

@Component({
  selector: 'app-composer',
  imports: [FormField, Icon],
  template: `
    <form class="composer card" (submit)="send($event)">
      <label class="sr-only" for="question">Ask a question about company policies</label>
      <textarea
        id="question"
        #textarea
        rows="1"
        placeholder="Ask about leave, travel, security, expenses…"
        [formField]="questionForm.question"
        (keydown)="onKeydown($event)"
        (input)="autoGrow()"
      ></textarea>
      <div class="row">
        <span class="hint">
          @if (remaining() < 500) {
            <span [class.over]="remaining() < 0">{{ remaining() }} characters left</span>
          } @else {
            Enter to send · Shift + Enter for a new line
          }
        </span>
        @if (busy()) {
          <button type="button" class="btn" (click)="stop.emit()"><app-icon name="stop" [size]="14" /> Stop</button>
        } @else {
          <button type="submit" class="btn primary" [disabled]="questionForm().invalid()" aria-label="Send question">
            <app-icon name="send" [size]="16" /> Ask
          </button>
        }
      </div>
    </form>
  `,
  styles: `
    .composer { padding: 10px 12px; }
    textarea {
      width: 100%; max-height: 200px; padding: 4px 2px; resize: none;
      border: 0; outline: 0; background: none; font-size: 15px; line-height: 1.5;
    }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .hint { color: var(--text-3); font-size: 12px; }
    .over { color: var(--danger); font-weight: 600; }
  `,
})
export class Composer {
  readonly busy = input(false);
  readonly ask = output<string>();
  readonly stop = output();

  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly model = signal({ question: '' });
  protected readonly questionForm = form(this.model, (path) => {
    required(path.question);
    maxLength(path.question, MAX_LENGTH);
  });

  protected remaining(): number {
    return MAX_LENGTH - this.model().question.length;
  }

  focus(): void {
    this.textarea().nativeElement.focus();
  }

  protected send(event?: Event): void {
    event?.preventDefault();
    const question = this.model().question.trim();
    if (this.busy() || !question || this.questionForm().invalid()) return;
    this.ask.emit(question);
    this.model.set({ question: '' });
    queueMicrotask(() => this.autoGrow());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) this.send(event);
  }

  protected autoGrow(): void {
    const el = this.textarea().nativeElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
}
