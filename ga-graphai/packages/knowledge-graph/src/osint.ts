import crypto from "node:crypto";

export type OsintFeedType = "rss" | "http";

export interface OsintFeedProfile {
  id: string;
  name: string;
  url: string;
  type: OsintFeedType;
  terms?: string;
  allowScrape?: boolean;
  consentRequired?: boolean;
}

export interface OsintFeedItem {
  title: string;
  link: string;
  summary?: string;
  publishedAt?: string;
}

export interface OsintLineage {
  profileId: string;
  sourceUrl: string;
  fetchedAt: string;
  contentHash: string;
  terms?: string;
  consentRecorded: boolean;
}

export interface OsintRecord {
  id: string;
  title: string;
  link: string;
  summary?: string;
  publishedAt?: string;
  contentHash: string;
  lineage: OsintLineage;
}

export interface OsintFetchOptions {
  fetchFn?: typeof fetch;
  maxRetries?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

function extractTag(block: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(regex);
  if (!match) {
    return undefined;
  }
  return match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim();
}

export function parseRss(xml: string): OsintFeedItem[] {
  const items = xml.match(/<item[\s\S]*?>[\s\S]*?<\/item>/gi) ?? [];
  const entries = xml.match(/<entry[\s\S]*?>[\s\S]*?<\/entry>/gi) ?? [];
  const blocks = items.length > 0 ? items : entries;
  return blocks
    .map((block) => {
      const title = extractTag(block, "title") ?? "Untitled";
      const link = extractTag(block, "link") ?? extractTag(block, "id") ?? "";
      const summary = extractTag(block, "description") ?? extractTag(block, "summary");
      const publishedAt = extractTag(block, "pubDate") ?? extractTag(block, "updated");
      return {
        title,
        link,
        summary,
        publishedAt,
      };
    })
    .filter((item) => item.link);
}

function contentHash(item: OsintFeedItem): string {
  return crypto
    .createHash("sha256")
    .update([item.title, item.link, item.summary ?? ""].join("|"))
    .digest("hex");
}

export function normalizeOsintRecords(
  profile: OsintFeedProfile,
  items: OsintFeedItem[]
): OsintRecord[] {
  const fetchedAt = new Date().toISOString();
  return items.map((item) => {
    const hash = contentHash(item);
    return {
      id: `osint:${profile.id}:${hash.slice(0, 12)}`,
      title: item.title,
      link: item.link,
      summary: item.summary,
      publishedAt: item.publishedAt,
      contentHash: hash,
      lineage: {
        profileId: profile.id,
        sourceUrl: profile.url,
        fetchedAt,
        contentHash: hash,
        terms: profile.terms,
        consentRecorded: !profile.consentRequired,
      },
    };
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchOsintFeed(
  profile: OsintFeedProfile,
  options: OsintFetchOptions = {}
): Promise<OsintRecord[]> {
  const fetchFn = options.fetchFn ?? fetch;
  const maxRetries = options.maxRetries ?? 3;
  const backoffMs = options.backoffMs ?? 250;
  const timeoutMs = options.timeoutMs ?? 8000;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetchFn(profile.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`OSINT fetch failed with ${response.status}`);
      }
      const body = await response.text();
      const items = profile.type === "rss" ? parseRss(body) : (JSON.parse(body) as OsintFeedItem[]);
      return normalizeOsintRecords(profile, items);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await sleep(backoffMs * (attempt + 1));
      }
    }
  }
  throw lastError ?? new Error("OSINT fetch failed");
}
