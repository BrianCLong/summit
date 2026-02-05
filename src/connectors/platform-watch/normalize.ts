import crypto from 'crypto';
import { EvidenceItem, SourceDocument } from './types';
import { normalizeSourceUrl } from './sources';
import { redactText } from './redact';

export interface NormalizedDocument {
  title: string;
  text: string;
  contentHash: string;
  tags: string[];
}

const TAG_KEYWORDS: Array<[RegExp, string]> = [
  [/release|version|notes/i, 'release-notes'],
  [/introduc|announce|launch/i, 'announcement'],
  [/pricing|license/i, 'pricing'],
  [/integration/i, 'integration'],
];

export function normalizeDocument(doc: SourceDocument): NormalizedDocument {
  const title = extractTitle(doc.raw) || doc.source.name;
  const text = redactText(sanitizeForMarkdown(stripHtml(doc.raw)));
  const contentHash = sha256(text);
  const tags = deriveTags(title, text);
  return { title, text, contentHash, tags };
}

export function toEvidenceItem(doc: SourceDocument, normalized: NormalizedDocument): EvidenceItem {
  return {
    id: '',
    platform: doc.source.platform,
    source_url: normalizeSourceUrl(doc.source.url),
    title: normalized.title,
    content_hash: normalized.contentHash,
    summary: summarize(normalized.text),
    tags: normalized.tags,
  };
}

export function stripHtml(input: string): string {
  const withoutScripts = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

export function sanitizeForMarkdown(input: string): string {
  return input
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(input: string): string | null {
  const match = /<title>([^<]+)<\/title>/i.exec(input);
  return match?.[1]?.trim() ?? null;
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function deriveTags(title: string, text: string): string[] {
  const combined = `${title} ${text}`;
  const tags = TAG_KEYWORDS.filter(([regex]) => regex.test(combined)).map(([, tag]) => tag);
  return tags.length ? Array.from(new Set(tags)) : ['general'];
}

function summarize(text: string): string {
  if (text.length <= 240) return text;
  return `${text.slice(0, 237)}...`;
}
