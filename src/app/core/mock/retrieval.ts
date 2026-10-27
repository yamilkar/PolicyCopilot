import { Chunk, Citation, Confidence, PolicyDocument, RetrievedChunk } from '../models';
import { CURATED, CuratedAnswer } from './corpus';

// A tiny lexical retriever that stands in for embeddings + pgvector in the demo.
// Pure functions, so they're easy to unit test.

const STOP_WORDS = new Set(
  'a an and are as at be by can could do does for from get how i if in is it its me my of on or our should so that the this to we what when where which who will with you your am have has much many any'.split(' '),
);

/** Query words employees use mapped to the words the policies use. */
const SYNONYMS: Record<string, string[]> = {
  vacation: ['paid', 'time', 'off'],
  vacations: ['paid', 'time', 'off'],
  holiday: ['paid', 'time', 'off', 'public'],
  holidays: ['paid', 'time', 'off', 'public'],
  pto: ['paid', 'time', 'off'],
  maternity: ['parental', 'caregiver'],
  paternity: ['parental', 'caregiver'],
  baby: ['parental', 'birth'],
  wfh: ['remote', 'home'],
  abroad: ['another', 'country'],
  hotel: ['hotels'],
  phishing: ['incident', 'phishing'],
  hacked: ['incident'],
  laptop: ['devices', 'laptop'],
  stolen: ['lost', 'stolen'],
  chatgpt: ['ai', 'tools', 'approved'],
  ai: ['ai', 'tools'],
  gift: ['gifts', 'hospitality'],
  training: ['learning', 'budget', 'courses'],
  course: ['learning', 'courses'],
  reimbursement: ['expenses', 'reimbursed'],
  expense: ['expenses'],
  sick: ['sick', 'ill'],
  delete: ['deletion', 'deleted'],
  length: ['characters'],
  long: ['weeks', 'days'],
  car: ['car', 'mileage'],
  taxi: ['expenses', 'travel'],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Each word of the question with its singular form and synonyms, like a query-rewriting step would. */
function termGroups(question: string): string[][] {
  return [...new Set(tokenize(question))].map((token) => {
    const group = new Set([token, ...(SYNONYMS[token] ?? [])]);
    if (token.endsWith('s') && token.length > 3) group.add(token.slice(0, -1));
    return [...group];
  });
}

export function expandQuery(question: string): string[] {
  return [...new Set(termGroups(question).flat())];
}

export interface ScoredChunk {
  chunk: Chunk;
  document: PolicyDocument;
  score: number; // 0..1
}

/**
 * Scores chunks in 0..1 so it reads like a similarity score. The score is mostly coverage: how much
 * of the question's (IDF-weighted) meaning a chunk matches. A rare question word that no chunk
 * contains, like "bereavement", pulls every score down, so we say "I don't know" instead of
 * answering from a chunk that only shares the word "leave".
 */
export function search(question: string, documents: PolicyDocument[], topK = 5): ScoredChunk[] {
  const groups = termGroups(question);
  const terms = groups.flat();
  const candidates = documents
    .filter((d) => d.status === 'ready')
    .flatMap((document) =>
      document.chunks.map((chunk) => ({ chunk, document, tokens: tokenize(`${document.title} ${chunk.heading} ${chunk.text}`), heading: tokenize(chunk.heading) })),
    );
  if (!terms.length || !candidates.length) return [];

  const idf = new Map<string, number>();
  for (const term of terms) {
    const df = candidates.filter((c) => c.tokens.includes(term)).length;
    idf.set(term, Math.log(1 + candidates.length / (1 + df)));
  }
  // A word is as informative as its rarest form; unseen words get the maximum weight.
  const groupWeight = groups.map((g) => Math.max(...g.map((t) => idf.get(t)!)));
  const totalWeight = groupWeight.reduce((a, b) => a + b, 0);

  return candidates
    .map(({ chunk, document, tokens, heading }) => {
      let raw = 0;
      let covered = 0;
      groups.forEach((group, i) => {
        let matched = false;
        for (const term of group) {
          const tf = tokens.filter((t) => t === term).length;
          if (!tf) continue;
          matched = true;
          raw += (1 + Math.log(tf)) * idf.get(term)!;
          // Matching the section heading is a strong signal.
          if (heading.includes(term)) raw += idf.get(term)!;
        }
        if (matched) covered += groupWeight[i];
      });
      const coverage = covered / totalWeight;
      return { chunk, document, score: round(coverage * (0.55 + (0.45 * raw) / (raw + 4))) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export const ANSWER_THRESHOLD = 0.45;

export function confidenceFor(results: ScoredChunk[]): Confidence {
  const top = results[0]?.score ?? 0;
  if (top < ANSWER_THRESHOLD) return 'none';
  return top >= 0.62 ? 'high' : 'medium';
}

/** Finds a hand-written answer when the question is (nearly) one of the suggested ones. */
export function findCurated(question: string): CuratedAnswer | undefined {
  const words = new Set(tokenize(question));
  return CURATED.find((c) => {
    const curated = new Set(tokenize(c.question));
    const overlap = [...words].filter((w) => curated.has(w)).length;
    return overlap / new Set([...words, ...curated]).size >= 0.7;
  });
}

/** Builds an extractive answer from the best sentence of each top chunk. */
export function composeAnswer(question: string, results: ScoredChunk[]): { answer: string; used: ScoredChunk[] } {
  const terms = new Set(expandQuery(question));
  // Only cite passages close to the best one; a distant third hit is usually off-topic.
  const cutoff = Math.max(ANSWER_THRESHOLD, results[0].score * 0.62);
  const used = results.filter((r) => r.score >= cutoff).slice(0, 3);
  const sentences = used.map((r) => bestSentence(r.chunk.text, terms));

  const [first, ...rest] = sentences;
  let answer = `According to the ${used[0].document.title}: ${first} [1]`;
  if (rest.length) {
    answer += '\n\nAlso relevant:\n\n' + rest.map((s, i) => `- ${s} [${i + 2}]`).join('\n');
  }
  return { answer, used };
}

function bestSentence(text: string, terms: Set<string>): string {
  const sentences = text.match(/[^.!?]+[.!?]/g) ?? [text];
  let best = sentences[0];
  let bestHits = -1;
  for (const sentence of sentences) {
    const hits = tokenize(sentence).filter((t) => terms.has(t)).length;
    if (hits > bestHits) [best, bestHits] = [sentence, hits];
  }
  return best.trim();
}

export function toCitations(used: { chunk: Chunk; document: PolicyDocument; score: number }[]): Citation[] {
  return used.map(({ chunk, document, score }, i) => ({
    index: i + 1,
    chunkId: chunk.id,
    documentId: document.id,
    documentTitle: document.title,
    heading: chunk.heading,
    snippet: chunk.text.length > 180 ? chunk.text.slice(0, 177) + '…' : chunk.text,
    score,
  }));
}

export function toRetrieved(results: ScoredChunk[]): RetrievedChunk[] {
  return results.map((r) => ({ chunkId: r.chunk.id, documentTitle: r.document.title, heading: r.chunk.heading, score: r.score }));
}

/** Splits plain text into roughly paragraph-sized chunks, the way the ingestion pipeline would. */
export function chunkText(documentId: string, text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let heading = 'Introduction';
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.trim().split('\n');
    const markdownHeading = lines[0].match(/^#{1,6}\s+(.*)$/);
    if (markdownHeading) {
      heading = markdownHeading[1].trim();
      lines.shift();
    }
    const paragraph = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph.length < 20) continue;
    chunks.push({ id: `${documentId}-${chunks.length + 1}`, documentId, heading, text: paragraph.slice(0, 1200) });
  }
  return chunks;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
