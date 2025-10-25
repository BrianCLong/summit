import type { ReactElement } from 'react';

type Primitive = string | number | boolean | null | undefined;

type ExtraValue = Primitive | Primitive[] | ExtraValueMap | ExtraValueMap[];
interface ExtraValueMap {
  [key: string]: ExtraValue;
}

type ExtraData = ExtraValueMap;

type BreadcrumbData = Record<string, Primitive | Primitive[]>;

export type Integration = Record<string, unknown>;

export interface BaseErrorTrackingConfig {
  dsn: string;
  environment: string;
  release?: string;
  dist?: string;
  debug?: boolean;
  enabled?: boolean;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  sampleRate?: number;
  attachStacktrace?: boolean;
  normalizeDepth?: number;
  integrations?: Integration[];
  sendClientReports?: boolean;
}

export interface NodeErrorTrackingConfig extends BaseErrorTrackingConfig {
  serverName?: string;
  autoSessionTracking?: boolean;
  enableTracing?: boolean;
}

export interface BrowserErrorTrackingConfig extends BaseErrorTrackingConfig {
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  enableTracing?: boolean;
}

export interface UserContext {
  id?: string;
  username?: string;
  email?: string;
  ipAddress?: string;
  segment?: string;
  [key: string]: unknown;
}

export interface BreadcrumbOptions {
  category?: string;
  level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message?: string;
  data?: BreadcrumbData;
}

export interface PerformanceSpanOptions {
  name: string;
  op?: string;
  description?: string;
  data?: ExtraData;
}

export interface PerformanceTransactionOptions extends PerformanceSpanOptions {
  sampled?: boolean;
  metadata?: ExtraData;
}

export interface AlertRule {
  name: string;
  environment: string;
  actionMatch: 'all' | 'any';
  conditions: Array<{
    id: string;
    target?: string;
    value?: string;
  }>;
  actions: Array<{
    id: string;
    targetType: 'team' | 'member' | 'email';
    targetIdentifier: string;
  }>;
  owner: string;
}

export interface SourceMapUploadOptions {
  authToken: string;
  org: string;
  project: string;
  release: string;
  dist?: string;
  include: string[];
  urlPrefix?: string;
  finalize?: boolean;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export type ErrorBoundaryFallback = (props: ErrorBoundaryFallbackProps) => ReactElement;

export interface ErrorBoundaryOptions {
  fallback: ErrorBoundaryFallback;
  onError?: (error: Error, componentStack: string) => void;
  onReset?: () => void;
}

export interface BreadcrumbEvent {
  category?: string;
  level?: string;
  message?: string;
  data?: BreadcrumbData;
  timestamp?: number;
}

export interface SpanLike {
  setStatus(status: string): void;
  finish(): void;
}

export type SpanContext = Record<string, unknown>;
export type TransactionContext = Record<string, unknown>;
