import { ProviderAuthError, ProviderRateLimitError, ProviderRequestError } from '../errors.js';
import { normalizeHeaders } from '../utils.js';
import type { NormalizedRequest, NormalizedResponse } from '../types.js';

export interface HttpAdapterConfig {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  request: NormalizedRequest;
}

const streamProbe = async (response: Response): Promise<boolean> => {
  if (!response.body) {
    return false;
  }
  const reader = response.body.getReader();
  const result = await reader.read();
  await reader.cancel();
  return Boolean(result.value && result.value.length > 0);
};

export const postJson = async (config: HttpAdapterConfig): Promise<NormalizedResponse> => {
  const start = Date.now();
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(config.body),
  });

  const headers = normalizeHeaders(response.headers);
  const durationMs = Date.now() - start;

  if (response.status === 401 || response.status === 403) {
    throw new ProviderAuthError(`Authentication failed with status ${response.status}`);
  }

  if (response.status === 429) {
    throw new ProviderRateLimitError('Rate limit signaled by provider');
  }

  if (!response.ok) {
    const payload = await response.text();
    throw new ProviderRequestError(`Provider error ${response.status}: ${payload}`);
  }

  if (config.request.stream) {
    const streaming = await streamProbe(response);
    return {
      status: response.status,
      headers,
      durationMs,
      streaming,
    };
  }

  const payload = await response.json();
  return {
    status: response.status,
    headers,
    durationMs,
    raw: payload,
  };
};
