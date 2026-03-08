/**
 * Typed API client for the Summit Code UI backend.
 * All requests go to /api/* which the Vite dev server proxies to Express on :3741.
 */
import type {
  PromptSearchResult,
  ArtifactListResult,
  DashboardData,
  GoNoGoData,
} from './types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

export function searchPrompts(
  q: string,
  page = 1,
  pageSize = 20,
  registry?: string,
): Promise<PromptSearchResult> {
  const params = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
  if (registry) params.set('registry', registry);
  return get<PromptSearchResult>(`/prompts/search?${params}`);
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

export function listArtifacts(
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<ArtifactListResult> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  return get<ArtifactListResult>(`/artifacts?${params}`);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function getDashboard(): Promise<DashboardData> {
  return get<DashboardData>('/dashboard');
}

// ─── Go/No-Go ─────────────────────────────────────────────────────────────────

export function getGoNoGo(): Promise<GoNoGoData> {
  return get<GoNoGoData>('/release/gonogo');
}

// ─── Streaming search ─────────────────────────────────────────────────────────

/**
 * Streams prompt search results via Server-Sent Events.
 * onChunk is called for each partial result line; onDone when the stream closes.
 */
export function streamPromptSearch(
  q: string,
  registry: string | undefined,
  onChunk: (line: string) => void,
  onDone: () => void,
): () => void {
  const params = new URLSearchParams({ q });
  if (registry) params.set('registry', registry);
  const es = new EventSource(`${BASE}/prompts/stream?${params}`);
  es.addEventListener('result', (e) => onChunk(e.data));
  es.addEventListener('done', () => { es.close(); onDone(); });
  es.onerror = () => { es.close(); onDone(); };
  return () => es.close();
}
