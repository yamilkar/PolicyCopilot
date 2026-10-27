# Policy Copilot

Employees waste time hunting through handbooks and PDFs for answers like "how much parental leave do I get in Spain?". Generic chatbots answer confidently and are sometimes wrong.

**Policy Copilot** is an Angular client for a RAG (retrieval-augmented generation) API. It answers questions only from the company's own policy documents, cites a source for every claim, and says "I don't know" when the documents don't cover the question.

> Demo mode: everything runs in the browser against synthetic policies for a fictional company, Brightwell Labs. No backend or API key needed. The real backend is [docs-ai-assistant](https://github.com/yamilkar/docs-ai-assistant) (ASP.NET Core, Claude on Amazon Bedrock, pgvector), still in progress.

## Features

- **Streaming answers with inline citations.** Hover a `[1]` to preview the passage, click it to open the document scrolled to the highlighted text.
- **Honest "no answer" state.** When retrieval confidence is low, the app shows the closest passages instead of guessing.
- **Scope chips.** Search all policies or only HR, IT & Security, Finance, Legal.
- **Retrieval details.** Toggle on to see the rewritten query, top-k chunks with similarity scores, latency per pipeline stage and token counts.
- **Feedback loop.** Thumbs up/down with a reason; copy an answer with its sources.
- **Documents.** Drag-and-drop upload with a live ingestion pipeline (upload → parse → chunk → embed → ready), filters and a chunk viewer. In demo mode, `.md` and `.txt` files are really chunked and become searchable.
- **Insights.** Questions per day, answer rate, helpfulness, the knowledge gaps (questions nobody could answer) and the most cited documents.
- **Polish.** ⌘K / Ctrl+K command palette, conversation history, dark mode, responsive layout, keyboard and screen-reader friendly.

### Try this demo story

1. Open **Insights**: "What is the bereavement leave policy?" is a top knowledge gap.
2. Ask it on **Ask**: the app says it has no reliable answer.
3. On **Documents**, download the sample policy and drop it back in. Watch it go through the pipeline.
4. Ask again: now it answers with citations to the new document.

## Tech

- **Angular 22**: standalone components, zoneless change detection, OnPush by default, signals (`signal`, `computed`, `linkedSignal`, `effect`, `afterRenderEffect`).
- **Signal Forms** for the question composer (`form`, `[formField]`, `required`, `maxLength`).
- **`rxResource`** for data loading, RxJS `Observable`s for streamed answers and ingestion progress.
- **`@Service()`** singletons, lazy-loaded routes with route-param input binding and view transitions.
- **No UI library**: design tokens in CSS custom properties, light/dark themes, an inline SVG icon set and a hand-built accessible chart (hover tooltip, table view, color-blind-safe palette).
- **Vitest** unit tests for retrieval, answer parsing and the mock API.

## Architecture

```
src/app
├── core
│   ├── models.ts           # API contract types
│   ├── rag-api.ts          # abstract RagApi the UI depends on
│   ├── chat-store.ts       # conversations, streaming, feedback (signals)
│   ├── answer-format.ts    # answer text → blocks, no innerHTML
│   └── mock/               # in-browser RagApi: corpus, lexical retriever, streaming
├── features
│   ├── chat/               # chat page, message, composer, source viewer, retrieval inspector
│   ├── documents/          # upload + ingestion pipeline + document table
│   └── insights/           # KPIs, daily chart, knowledge gaps
└── shared/                 # icons, command palette
```

The UI talks only to the abstract `RagApi`. `MockRagApi` is registered in `app.config.ts`; connecting the real backend means adding an HTTP implementation of the same contract and swapping that one provider.

The mock retriever scores chunks by **coverage**: how much of the question's IDF-weighted meaning a chunk matches. A rare word that no document contains (e.g. "bereavement") drags the score below the answer threshold, which is what lets the app refuse instead of answering from a chunk that only shares the word "leave".

## Run it

Requires Node.js 22+.

```bash
npm install
npm start
```

Open http://localhost:4200.

```bash
npm test          # unit tests (Vitest)
npm run build     # production build in dist/
```
