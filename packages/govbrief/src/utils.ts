import crypto from 'node:crypto';

export function createSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function splitIntoSentences(text: string): string[] {
  const sanitized = text
    .replace(/\s+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1. $2');
  return sanitized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return `${words.slice(0, maxWords).join(' ')}…`;
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function ensureIsoDate(input: string | undefined): string {
  if (!input) {
    return '';
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().split('T')[0];
}
