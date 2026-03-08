"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptsRouter = void 0;
/**
 * /api/prompts
 *
 * Searches across .agentic-prompts/, .claude/, and .jules/ for prompt/doc files.
 * Supports both paginated JSON and SSE streaming responses.
 */
const express_1 = require("express");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const config_js_1 = require("../config.js");
const metrics_js_1 = require("../utils/metrics.js");
exports.promptsRouter = (0, express_1.Router)();
const REGISTRIES = {
    'agentic-prompts': config_js_1.PATHS.agenticPrompts,
    claude: config_js_1.PATHS.claude,
    jules: config_js_1.PATHS.jules,
};
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.rego']);
async function collectFiles(dir, registry) {
    const results = [];
    async function walk(current) {
        let entries;
        try {
            entries = await (0, promises_1.readdir)(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const e of entries) {
            const full = (0, path_1.join)(current, e.name);
            if (e.isDirectory()) {
                await walk(full);
            }
            else if (TEXT_EXTS.has((0, path_1.extname)(e.name).toLowerCase())) {
                let content = '';
                try {
                    content = await (0, promises_1.readFile)(full, 'utf-8');
                }
                catch {
                    continue;
                }
                const lines = content.split('\n');
                const heading = lines.find((l) => l.startsWith('#'));
                const title = heading ? heading.replace(/^#+\s*/, '').trim() : (0, path_1.basename)(e.name, (0, path_1.extname)(e.name));
                const textLines = lines.filter((l) => !l.startsWith('#') && l.trim().length > 0);
                const excerpt = textLines.slice(0, 3).join(' ').slice(0, 200);
                results.push({
                    registry,
                    file: e.name,
                    title,
                    excerpt,
                    path: (0, path_1.relative)(config_js_1.REPO_ROOT, full),
                });
            }
        }
    }
    await walk(dir);
    return results;
}
async function getAllPrompts(registryFilter) {
    const toSearch = registryFilter && REGISTRIES[registryFilter]
        ? { [registryFilter]: REGISTRIES[registryFilter] }
        : REGISTRIES;
    const lists = await Promise.all(Object.entries(toSearch).map(([name, dir]) => collectFiles(dir, name)));
    return lists.flat();
}
function matches(entry, q) {
    const lq = q.toLowerCase();
    return (entry.title.toLowerCase().includes(lq) ||
        entry.excerpt.toLowerCase().includes(lq) ||
        entry.file.toLowerCase().includes(lq));
}
// GET /api/prompts/search?q=...&page=1&pageSize=20&registry=claude
exports.promptsRouter.get('/search', async (req, res) => {
    (0, metrics_js_1.incCounter)('summit_ui_prompt_search_total', 'Prompt search requests');
    const q = String(req.query.q ?? '').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const registry = req.query.registry ? String(req.query.registry) : undefined;
    const all = await getAllPrompts(registry);
    const filtered = q ? all.filter((e) => matches(e, q)) : all;
    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    res.json({ items, total, page, pageSize });
});
// GET /api/prompts/stream?q=...&registry=... → Server-Sent Events
exports.promptsRouter.get('/stream', async (req, res) => {
    (0, metrics_js_1.incCounter)('summit_ui_prompt_stream_total', 'Prompt stream requests');
    const q = String(req.query.q ?? '').trim();
    const registry = req.query.registry ? String(req.query.registry) : undefined;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const toSearch = registry && REGISTRIES[registry]
        ? { [registry]: REGISTRIES[registry] }
        : REGISTRIES;
    for (const [name, dir] of Object.entries(toSearch)) {
        let entries;
        try {
            entries = await collectFiles(dir, name);
        }
        catch {
            continue;
        }
        for (const e of entries) {
            if (!q || matches(e, q)) {
                res.write(`event: result\ndata: ${JSON.stringify(e)}\n\n`);
            }
        }
    }
    res.write('event: done\ndata: {}\n\n');
    res.end();
});
// GET /api/prompts/registries – list available registries and their file counts
exports.promptsRouter.get('/registries', async (_req, res) => {
    const counts = {};
    for (const [name, dir] of Object.entries(REGISTRIES)) {
        try {
            const st = await (0, promises_1.stat)(dir);
            if (st.isDirectory()) {
                const files = await collectFiles(dir, name);
                counts[name] = files.length;
            }
            else {
                counts[name] = 0;
            }
        }
        catch {
            counts[name] = 0;
        }
    }
    res.json(counts);
});
