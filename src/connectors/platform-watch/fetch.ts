import { ALLOWED_URL_PREFIXES, normalizeSourceUrl } from './sources';
import { SourceDocument, SourceSpec } from './types';

export interface FetchOptions {
  timeoutMs?: number;
  userAgent?: string;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchSource(source: SourceSpec, options: FetchOptions = {}): Promise<SourceDocument> {
  const url = normalizeSourceUrl(source.url);
  assertAllowedUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': options.userAgent ?? 'Summit-Platform-Watch/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
      },
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') ?? 'text/plain';
    const raw = await res.text();

    return {
      source,
      fetched_at: new Date().toISOString(),
      content_type: contentType,
      raw,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function assertAllowedUrl(url: string, allowlist: string[] = ALLOWED_URL_PREFIXES): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error(`URL must use https: ${url}`);
  }
  const allowed = allowlist.some((prefix) => url.startsWith(prefix));
  if (!allowed) {
    throw new Error(`URL not in allowlist: ${url}`);
  }
}
