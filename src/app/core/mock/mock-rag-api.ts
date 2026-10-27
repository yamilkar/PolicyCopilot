import { Observable, of, defer, delay } from 'rxjs';
import { Analytics, AnswerEvent, AskRequest, Citation, Collection, DailyCount, Feedback, IngestionStatus, PolicyDocument } from '../models';
import { RagApi } from '../rag-api';
import { COLLECTIONS, seedDocuments } from './corpus';
import { chunkText, composeAnswer, confidenceFor, findCurated, search, toCitations, toRetrieved } from './retrieval';

const MAX_UPLOAD_MB = 10;
const TEXT_EXTENSIONS = ['txt', 'md'];
const ACCEPTED_EXTENSIONS = [...TEXT_EXTENSIONS, 'pdf', 'docx'];
const PIPELINE: IngestionStatus[] = ['uploading', 'parsing', 'chunking', 'embedding', 'ready'];

interface AskLog {
  question: string;
  answered: boolean;
  latencyMs: number;
  documentTitles: string[];
}

/**
 * In-browser stand-in for the docs-ai-assistant API.
 * Retrieval is lexical (see retrieval.ts) and answers are extractive or hand-written, but the
 * shape of every response, including streaming and the retrieval trace, matches what the real API will send.
 */
export class MockRagApi extends RagApi {
  private docs = seedDocuments();
  private readonly asked: AskLog[] = [];
  private readonly feedback: Feedback[] = [];

  /** Simulated network latency multiplier; tests set it to 0. */
  constructor(private readonly speed = 1) {
    super();
  }

  collections(): Observable<Collection[]> {
    return this.respond(COLLECTIONS);
  }

  documents(): Observable<PolicyDocument[]> {
    return defer(() => this.respond(this.docs.map((d) => ({ ...d }))));
  }

  document(id: string): Observable<PolicyDocument | undefined> {
    return defer(() => this.respond(this.docs.find((d) => d.id === id)));
  }

  deleteDocument(id: string): Observable<void> {
    return defer(() => {
      this.docs = this.docs.filter((d) => d.id !== id);
      return this.respond(undefined);
    });
  }

  upload(file: File, collectionId: string): Observable<PolicyDocument> {
    return new Observable<PolicyDocument>((subscriber) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const id = `upload-${Date.now().toString(36)}`;
      let doc: PolicyDocument = {
        id,
        title: file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        collectionId,
        fileName: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        updatedAt: new Date().toISOString().slice(0, 10),
        owner: 'You',
        status: 'uploading',
        progress: 5,
        chunks: [],
      };
      this.docs = [doc, ...this.docs];
      const update = (patch: Partial<PolicyDocument>) => {
        doc = { ...doc, ...patch };
        this.docs = this.docs.map((d) => (d.id === id ? doc : d));
        subscriber.next(doc);
      };
      subscriber.next(doc);

      const timers: ReturnType<typeof setTimeout>[] = [];
      const fail = (error: string) => {
        update({ status: 'failed', error });
        subscriber.complete();
      };

      const run = async () => {
        let chunks = TEXT_EXTENSIONS.includes(extension) ? chunkText(id, await file.text()) : [];
        if (!TEXT_EXTENSIONS.includes(extension)) {
          chunks = [
            {
              id: `${id}-1`,
              documentId: id,
              heading: 'Demo mode',
              text: `Demo mode: text extraction for ${extension.toUpperCase()} files runs in the docs-ai-assistant API. Upload a .txt or .md file to ask questions about your own content.`,
            },
          ];
        }
        for (const [step, status] of PIPELINE.entries()) {
          await new Promise((resolve) => timers.push(setTimeout(resolve, 650 * this.speed)));
          if (subscriber.closed) return;
          if (status === 'parsing' && !ACCEPTED_EXTENSIONS.includes(extension)) return fail(`Unsupported file type .${extension}. Use PDF, DOCX, Markdown or plain text.`);
          if (status === 'parsing' && file.size > MAX_UPLOAD_MB * 1024 * 1024) return fail(`File is larger than ${MAX_UPLOAD_MB} MB.`);
          if (status === 'chunking' && chunks.length === 0) return fail('No readable text found in the file.');
          update({ status, progress: Math.round(((step + 1) / PIPELINE.length) * 100), chunks: status === 'ready' ? chunks : doc.chunks });
        }
        subscriber.complete();
      };
      run();
      return () => timers.forEach(clearTimeout);
    });
  }

  ask(request: AskRequest): Observable<AnswerEvent> {
    return new Observable<AnswerEvent>((subscriber) => {
      const started = performance.now();
      const scoped = this.docs.filter((d) => !request.collectionIds.length || request.collectionIds.includes(d.collectionId));
      const results = search(request.question, scoped);
      const curated = findCurated(request.question);
      const curatedInScope = curated?.chunkIds.every((id) => scoped.some((d) => d.chunks.some((c) => c.id === id)));
      const confidence = curatedInScope ? 'high' : confidenceFor(results);

      let answer: string;
      let citations: Citation[];
      let followUps: string[];
      if (curated && curatedInScope) {
        answer = curated.answer;
        citations = toCitations(
          curated.chunkIds.map((chunkId) => {
            const document = scoped.find((d) => d.chunks.some((c) => c.id === chunkId))!;
            const score = results.find((r) => r.chunk.id === chunkId)?.score ?? 0.7;
            return { document, chunk: document.chunks.find((c) => c.id === chunkId)!, score };
          }),
        );
        followUps = curated.followUps;
      } else if (confidence === 'none') {
        answer =
          "I couldn't find a reliable answer to that in the selected policies, so I'd rather not guess. " +
          (results.length ? 'These are the closest passages I found; they may still help:' : 'Try rephrasing the question or widening the collections you search.');
        citations = toCitations(results.slice(0, 3));
        followUps = [];
      } else {
        const composed = composeAnswer(request.question, results);
        answer = composed.answer;
        citations = toCitations(composed.used);
        followUps = [];
      }

      const words = answer.split(/(?<=\s)/);
      const timings = {
        embedMs: jitter(38),
        searchMs: jitter(22),
        rerankMs: jitter(64),
        generateMs: words.length * 28,
      };
      const trace = {
        rewrittenQuery: request.question.trim().replace(/\?*$/, '').toLowerCase(),
        collections: request.collectionIds.length ? request.collectionIds : COLLECTIONS.map((c) => c.id),
        retrieved: toRetrieved(results),
        timings,
        tokens: { prompt: 420 + results.length * 180, completion: Math.round(words.length * 1.3) },
        model: 'mock · Claude on Amazon Bedrock in production',
      };

      const timers: ReturnType<typeof setTimeout>[] = [];
      const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms * this.speed));
      let t = 450;
      at(t, () => subscriber.next({ type: 'trace', trace }));
      // Emit two or three words at a time, like a token stream.
      for (let i = 0; i < words.length; i += 3) {
        t += 45;
        const text = words.slice(i, i + 3).join('');
        at(t, () => subscriber.next({ type: 'token', text }));
      }
      at(t + 60, () => {
        this.asked.push({
          question: request.question,
          answered: confidence !== 'none',
          latencyMs: Math.round(performance.now() - started),
          documentTitles: confidence === 'none' ? [] : citations.map((c) => c.documentTitle),
        });
        subscriber.next({ type: 'done', citations, confidence, followUps });
        subscriber.complete();
      });
      return () => timers.forEach(clearTimeout);
    });
  }

  sendFeedback(feedback: Feedback): Observable<void> {
    return defer(() => {
      this.feedback.push(feedback);
      return this.respond(undefined);
    });
  }

  analytics(): Observable<Analytics> {
    return defer(() => this.respond(this.buildAnalytics()));
  }

  private buildAnalytics(): Analytics {
    const daily = seededDaily(30);
    const today = daily[daily.length - 1];
    today.answered += this.asked.filter((a) => a.answered).length;
    today.unanswered += this.asked.filter((a) => !a.answered).length;

    const answered = daily.reduce((n, d) => n + d.answered, 0);
    const unansweredCount = daily.reduce((n, d) => n + d.unanswered, 0);

    const unanswered = new Map(SEEDED_UNANSWERED.map(([q, n]) => [q, n]));
    for (const a of this.asked.filter((a) => !a.answered)) unanswered.set(a.question, (unanswered.get(a.question) ?? 0) + 1);

    const cited = new Map(SEEDED_CITATIONS.map(([t, n]) => [t, n]));
    for (const title of this.asked.flatMap((a) => a.documentTitles)) cited.set(title, (cited.get(title) ?? 0) + 1);

    const helpful = 412 + this.feedback.filter((f) => f.helpful).length;
    const rated = 468 + this.feedback.length;

    return {
      totalQuestions: answered + unansweredCount,
      answerRate: answered / (answered + unansweredCount),
      helpfulRate: helpful / rated,
      medianLatencyMs: 1840,
      daily,
      unanswered: [...unanswered].map(([question, count]) => ({ question, count })).sort((a, b) => b.count - a.count).slice(0, 6),
      topDocuments: [...cited].map(([title, citations]) => ({ title, citations })).sort((a, b) => b.citations - a.citations).slice(0, 6),
    };
  }

  private respond<T>(value: T): Observable<T> {
    return of(value).pipe(delay(180 * this.speed));
  }
}

const SEEDED_UNANSWERED: [string, number][] = [
  ['Is there a gym or wellness allowance?', 14],
  ['What is the bereavement leave policy?', 11],
  ['Do we get a company phone?', 7],
  ['How does the bonus scheme work?', 6],
  ['Can I bring my dog to the office?', 4],
];

const SEEDED_CITATIONS: [string, number][] = [
  ['Employee Handbook 2026', 182],
  ['Travel & Expense Policy', 141],
  ['Parental Leave Policy', 96],
  ['Remote & Hybrid Work Policy', 88],
  ['Information Security Policy', 61],
  ['Acceptable Use of AI Tools', 43],
];

/** Deterministic 30-day history, so the dashboard looks the same on every load. */
function seededDaily(days: number): DailyCount[] {
  let seed = 42;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const result: DailyCount[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const base = weekend ? 6 : 38 + (days - i) * 0.6; // adoption growing over the month
    const total = Math.round(base * (0.8 + random() * 0.4));
    const unanswered = Math.round(total * (0.06 + random() * 0.06));
    result.push({ date: toIsoDate(date), answered: total - unanswered, unanswered });
  }
  return result;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function jitter(ms: number): number {
  return Math.round(ms * (0.8 + Math.random() * 0.4));
}
