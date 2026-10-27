import { computed, inject, Service, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatMessage, Conversation, FeedbackReason } from './models';
import { RagApi } from './rag-api';

const STORAGE_KEY = 'policy-copilot.conversations';

/** Conversations, the active one, the search scope and the in-flight answer. */
@Service()
export class ChatStore {
  private readonly api = inject(RagApi);
  private streaming?: Subscription;

  readonly conversations = signal<Conversation[]>(load());
  readonly activeId = signal<string | null>(null);
  /** Empty means all collections. */
  readonly scope = signal<string[]>([]);
  readonly busy = signal(false);

  readonly active = computed(() => this.conversations().find((c) => c.id === this.activeId()) ?? null);
  readonly messages = computed(() => this.active()?.messages ?? []);

  open(id: string | null): void {
    // Navigating to the conversation that is already open (e.g. right after asking) keeps the stream.
    if (id === this.activeId()) return;
    this.stop();
    this.activeId.set(id && this.conversations().some((c) => c.id === id) ? id : null);
  }

  /** Asks a question in the active conversation, starting one if needed. Returns the conversation id. */
  ask(question: string): string {
    question = question.trim();
    this.stop();
    let id = this.activeId();
    if (!id) {
      id = newId();
      const conversation: Conversation = { id, title: question.length > 60 ? question.slice(0, 57) + '…' : question, createdAt: now(), messages: [] };
      this.conversations.update((list) => [conversation, ...list]);
      this.activeId.set(id);
    }
    const conversationId = id;
    const answerId = newId();
    this.append(conversationId, { id: newId(), role: 'user', text: question, createdAt: now() });
    this.append(conversationId, { id: answerId, role: 'assistant', text: '', createdAt: now(), streaming: true });
    this.busy.set(true);

    this.streaming = this.api.ask({ question, collectionIds: this.scope() }).subscribe({
      next: (event) => {
        switch (event.type) {
          case 'trace':
            return this.patch(conversationId, answerId, () => ({ trace: event.trace }));
          case 'token':
            return this.patch(conversationId, answerId, (m) => ({ text: m.text + event.text }));
          case 'done':
            return this.patch(conversationId, answerId, () => ({
              streaming: false,
              citations: event.citations,
              confidence: event.confidence,
              followUps: event.followUps,
            }));
        }
      },
      error: () => {
        this.patch(conversationId, answerId, () => ({ streaming: false, error: 'Something went wrong while answering. Please try again.' }));
        this.busy.set(false);
      },
      complete: () => {
        this.busy.set(false);
        this.save();
      },
    });
    return conversationId;
  }

  stop(): void {
    if (!this.streaming || this.streaming.closed) return;
    this.streaming.unsubscribe();
    for (const c of this.conversations()) {
      for (const m of c.messages.filter((m) => m.streaming)) {
        this.patch(c.id, m.id, (msg) => ({ streaming: false, text: msg.text + ' …', error: 'Stopped.' }));
      }
    }
    this.busy.set(false);
    this.save();
  }

  rate(messageId: string, helpful: boolean, reason?: FeedbackReason): void {
    const conversation = this.active();
    if (!conversation) return;
    const index = conversation.messages.findIndex((m) => m.id === messageId);
    const question = conversation.messages[index - 1]?.text ?? '';
    this.patch(conversation.id, messageId, () => ({ feedback: helpful ? 'up' : 'down' }));
    this.api.sendFeedback({ messageId, question, helpful, reason }).subscribe();
    this.save();
  }

  remove(id: string): void {
    if (this.activeId() === id) this.open(null);
    this.conversations.update((list) => list.filter((c) => c.id !== id));
    this.save();
  }

  private append(conversationId: string, message: ChatMessage): void {
    this.conversations.update((list) => list.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c)));
  }

  private patch(conversationId: string, messageId: string, change: (m: ChatMessage) => Partial<ChatMessage>): void {
    this.conversations.update((list) =>
      list.map((c) =>
        c.id !== conversationId ? c : { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...change(m) } : m)) },
      ),
    );
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.conversations().slice(0, 30)));
    } catch {
      // Storage can be unavailable (private mode); history then lasts for the session only.
    }
  }
}

function load(): Conversation[] {
  try {
    const conversations = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Conversation[];
    return Array.isArray(conversations) ? conversations : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}
