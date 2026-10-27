import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { RagApi } from './core/rag-api';
import { MockRagApi } from './core/mock/mock-rag-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    // Swap for an HTTP client of docs-ai-assistant once its RAG endpoints exist.
    { provide: RagApi, useFactory: () => new MockRagApi() },
  ],
};
