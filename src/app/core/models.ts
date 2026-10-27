export interface Collection {
  id: string;
  name: string;
  description: string;
}

export type IngestionStatus = 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'ready' | 'failed';

export interface PolicyDocument {
  id: string;
  title: string;
  collectionId: string;
  fileName: string;
  sizeKb: number;
  updatedAt: string; // ISO date
  owner: string;
  status: IngestionStatus;
  progress: number; // 0..100 across the whole pipeline
  error?: string;
  chunks: Chunk[];
}

export interface Chunk {
  id: string;
  documentId: string;
  heading: string;
  text: string;
}

/** A source the answer points to with a [n] marker. */
export interface Citation {
  index: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  heading: string;
  snippet: string;
  score: number;
}

export interface RetrievedChunk {
  chunkId: string;
  documentTitle: string;
  heading: string;
  score: number;
}

/** What the retrieval pipeline did for one question; shown in the inspector. */
export interface RetrievalTrace {
  rewrittenQuery: string;
  collections: string[];
  retrieved: RetrievedChunk[];
  timings: { embedMs: number; searchMs: number; rerankMs: number; generateMs: number };
  tokens: { prompt: number; completion: number };
  model: string;
}

export type Confidence = 'high' | 'medium' | 'none';

/** Events of one streamed answer, in order: trace, token*, done. */
export type AnswerEvent =
  | { type: 'trace'; trace: RetrievalTrace }
  | { type: 'token'; text: string }
  | { type: 'done'; citations: Citation[]; confidence: Confidence; followUps: string[] };

export interface AskRequest {
  question: string;
  collectionIds: string[];
}

export type FeedbackReason = 'wrong-source' | 'outdated' | 'incomplete' | 'other';

export interface Feedback {
  messageId: string;
  question: string;
  helpful: boolean;
  reason?: FeedbackReason;
}

export interface DailyCount {
  date: string; // ISO date
  answered: number;
  unanswered: number;
}

export interface Analytics {
  totalQuestions: number;
  answerRate: number; // 0..1
  helpfulRate: number; // 0..1
  medianLatencyMs: number;
  daily: DailyCount[];
  unanswered: { question: string; count: number }[];
  topDocuments: { title: string; citations: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  streaming?: boolean;
  citations?: Citation[];
  confidence?: Confidence;
  followUps?: string[];
  trace?: RetrievalTrace;
  feedback?: 'up' | 'down';
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}
