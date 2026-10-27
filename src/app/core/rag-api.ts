import { Observable } from 'rxjs';
import { Analytics, AnswerEvent, AskRequest, Collection, Feedback, PolicyDocument } from './models';

/**
 * Everything the UI needs from the RAG backend.
 * Today it's backed by MockRagApi; a client for docs-ai-assistant will implement the same contract.
 */
export abstract class RagApi {
  abstract collections(): Observable<Collection[]>;
  abstract documents(): Observable<PolicyDocument[]>;
  abstract document(id: string): Observable<PolicyDocument | undefined>;
  /** Emits the document after every pipeline step until it is ready or failed. */
  abstract upload(file: File, collectionId: string): Observable<PolicyDocument>;
  abstract deleteDocument(id: string): Observable<void>;
  /** Streams one answer: trace first, then tokens, then citations. */
  abstract ask(request: AskRequest): Observable<AnswerEvent>;
  abstract sendFeedback(feedback: Feedback): Observable<void>;
  abstract analytics(): Observable<Analytics>;
}
