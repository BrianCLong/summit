import type { BreadcrumbEvent, SpanLike } from './types';

export interface RegisteredClient {
  captureException: (error: unknown) => string | undefined;
  captureMessage: (message: string, context?: unknown) => string | undefined;
  addBreadcrumb: (breadcrumb: BreadcrumbEvent) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  configureScope: (callback: (scope: unknown) => void) => void;
  startTransaction?: (...args: unknown[]) => SpanLike;
  startSpan?: (...args: unknown[]) => SpanLike;
}

let activeClient: RegisteredClient | null = null;

export function registerClient(client: RegisteredClient): void {
  activeClient = client;
}

export function getClient(): RegisteredClient {
  if (!activeClient) {
    throw new Error('Sentry client has not been initialised. Call an initialise function first.');
  }
  return activeClient;
}

export function resetClient(): void {
  activeClient = null;
}
