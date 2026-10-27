import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ask' },
  { path: 'ask', title: 'Ask · Policy Copilot', loadComponent: () => import('./features/chat/chat-page').then((m) => m.ChatPage) },
  { path: 'ask/:id', title: 'Ask · Policy Copilot', loadComponent: () => import('./features/chat/chat-page').then((m) => m.ChatPage) },
  { path: 'documents', title: 'Documents · Policy Copilot', loadComponent: () => import('./features/documents/documents-page').then((m) => m.DocumentsPage) },
  { path: 'insights', title: 'Insights · Policy Copilot', loadComponent: () => import('./features/insights/insights-page').then((m) => m.InsightsPage) },
  { path: '**', redirectTo: 'ask' },
];
