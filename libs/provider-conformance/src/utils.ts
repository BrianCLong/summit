import crypto from 'node:crypto';

export const redactApiKey = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return trimmed;
  }
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export const hashPrompt = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

export const pickRateLimitHeaders = (
  headers: Record<string, string>,
): { limit?: string; remaining?: string; reset?: string } => {
  const limit =
    headers['x-ratelimit-limit'] ?? headers['ratelimit-limit'] ?? headers['x-rate-limit-limit'];
  const remaining =
    headers['x-ratelimit-remaining'] ??
    headers['ratelimit-remaining'] ??
    headers['x-rate-limit-remaining'];
  const reset =
    headers['x-ratelimit-reset'] ?? headers['ratelimit-reset'] ?? headers['x-rate-limit-reset'];

  return {
    limit,
    remaining,
    reset,
  };
};

export const normalizeHeaders = (headers: Headers): Record<string, string> => {
  const normalized: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
};

export const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const safeJsonParse = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const wordCount = (value: string): number => {
  return value.trim().split(/\s+/).filter(Boolean).length;
};
