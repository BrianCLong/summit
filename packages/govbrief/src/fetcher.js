"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithWayback = fetchWithWayback;
exports.ensureDirectory = ensureDirectory;
exports.writeFile = writeFile;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const WAYBACK_PREFIX = 'https://web.archive.org/web/0/';
function buildUserAgent() {
    return 'govbrief/0.1 (+https://summit.example/internal)';
}
async function fetchWithWayback(url) {
    const headers = { 'User-Agent': buildUserAgent() };
    const start = Date.now();
    try {
        const response = await fetch(url, { headers });
        if (response.ok) {
            const html = await response.text();
            return {
                html,
                usedUrl: url,
                retrievedAt: new Date(start).toISOString(),
            };
        }
    }
    catch (error) {
        console.warn(`Direct fetch failed for ${url}: ${error.message}`);
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
        retrievedAt: new Date(start).toISOString(),
    };
}
async function ensureDirectory(dir) {
    await promises_1.default.mkdir(dir, { recursive: true });
}
async function writeFile(dir, filename, content) {
    await ensureDirectory(dir);
    await promises_1.default.writeFile(node_path_1.default.join(dir, filename), content, 'utf8');
}
