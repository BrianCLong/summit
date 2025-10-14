import fs from 'node:fs/promises';
import path from 'node:path';

import { FetchResult } from './types.js';

const WAYBACK_PREFIX = 'https://web.archive.org/web/0/';

function buildUserAgent(): string {
  return 'govbrief/0.1 (+https://summit.example/internal)';
}

export async function fetchWithWayback(url: string): Promise<FetchResult> {
  const headers = { 'User-Agent': buildUserAgent() };
  const start = Date.now();
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const html = await response.text();
      return {
        html,
        usedUrl: url,
        retrievedAt: new Date(start).toISOString()
      };
    }
  } catch (error) {
    console.warn(`Direct fetch failed for ${url}: ${(error as Error).message}`);
  }

  const fallbackUrl = `${WAYBACK_PREFIX}${url}`;
  const fallbackResponse = await fetch(fallbackUrl, { headers });
  if (!fallbackResponse.ok) {
    throw new Error(`Failed to fetch article from live and Wayback sources: ${fallbackResponse.status}`);
  }
  const html = await fallbackResponse.text();
  return {
    html,
    usedUrl: url,
    archiveUrl: fallbackResponse.url,
    retrievedAt: new Date(start).toISOString()
  };
}

export async function ensureDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeFile(dir: string, filename: string, content: string): Promise<void> {
  await ensureDirectory(dir);
  await fs.writeFile(path.join(dir, filename), content, 'utf8');
}
