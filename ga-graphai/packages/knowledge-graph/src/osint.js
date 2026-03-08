"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRss = parseRss;
exports.normalizeOsintRecords = normalizeOsintRecords;
exports.fetchOsintFeed = fetchOsintFeed;
const node_crypto_1 = __importDefault(require("node:crypto"));
function extractTag(block, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = block.match(regex);
    if (!match) {
        return undefined;
    }
    return match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, '').trim();
}
function parseRss(xml) {
    const items = xml.match(/<item[\s\S]*?>[\s\S]*?<\/item>/gi) ?? [];
    const entries = xml.match(/<entry[\s\S]*?>[\s\S]*?<\/entry>/gi) ?? [];
    const blocks = items.length > 0 ? items : entries;
    return blocks
        .map((block) => {
        const title = extractTag(block, 'title') ?? 'Untitled';
        const link = extractTag(block, 'link') ?? extractTag(block, 'id') ?? '';
        const summary = extractTag(block, 'description') ?? extractTag(block, 'summary');
        const publishedAt = extractTag(block, 'pubDate') ?? extractTag(block, 'updated');
        return {
            title,
            link,
            summary,
            publishedAt,
        };
    })
        .filter((item) => item.link);
}
function contentHash(item) {
    return node_crypto_1.default
        .createHash('sha256')
        .update([item.title, item.link, item.summary ?? ''].join('|'))
        .digest('hex');
}
function normalizeOsintRecords(profile, items) {
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
async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchOsintFeed(profile, options = {}) {
    const fetchFn = options.fetchFn ?? fetch;
    const maxRetries = options.maxRetries ?? 3;
    const backoffMs = options.backoffMs ?? 250;
    const timeoutMs = options.timeoutMs ?? 8000;
    let lastError;
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
            const items = profile.type === 'rss' ? parseRss(body) : JSON.parse(body);
            return normalizeOsintRecords(profile, items);
        }
        catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                await sleep(backoffMs * (attempt + 1));
            }
        }
    }
    throw lastError ?? new Error('OSINT fetch failed');
}
