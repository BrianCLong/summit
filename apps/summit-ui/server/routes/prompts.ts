/**
 * /api/prompts
 *
 * Searches across .agentic-prompts/, .claude/, and .jules/ for prompt/doc files.
 * Supports both paginated JSON and SSE streaming responses.
 */
import { Router, Request, Response, type IRouter } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, relative, basename } from 'path';
import { PATHS, REPO_ROOT } from '../config.js';
import { incCounter } from '../utils/metrics.js';

export const promptsRouter: IRouter = Router();

interface PromptEntry {
  registry: string;
  file: string;
  title: string;
  excerpt: string;
  path: string;
}

const REGISTRIES: Record<string, string> = {
  'agentic-prompts': PATHS.agenticPrompts,
  claude:            PATHS.claude,
  jules:             PATHS.jules,
};

const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.rego']);

async function collectFiles(dir: string, registry: string): Promise<PromptEntry[]> {
  const results: PromptEntry[] = [];
  async function walk(current: string): Promise<void> {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(current, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (TEXT_EXTS.has(extname(e.name).toLowerCase())) {
        let content = '';
        try { content = await readFile(full, 'utf-8'); } catch { continue; }
        const lines = content.split('\n');
        const heading = lines.find((l) => l.startsWith('#'));
        const title = heading ? heading.replace(/^#+\s*/, '').trim() : basename(e.name, extname(e.name));
        const textLines = lines.filter((l) => !l.startsWith('#') && l.trim().length > 0);
        const excerpt = textLines.slice(0, 3).join(' ').slice(0, 200);
        results.push({
          registry,
          file:    e.name,
          title,
          excerpt,
          path:    relative(REPO_ROOT, full),
        });
      }
    }
  }
  await walk(dir);
  return results;
}

async function getAllPrompts(registryFilter?: string): Promise<PromptEntry[]> {
  const toSearch = registryFilter && REGISTRIES[registryFilter]
    ? { [registryFilter]: REGISTRIES[registryFilter] }
    : REGISTRIES;

  const lists = await Promise.all(
    Object.entries(toSearch).map(([name, dir]) => collectFiles(dir, name)),
  );
  return lists.flat();
}

function matches(entry: PromptEntry, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    entry.title.toLowerCase().includes(lq) ||
    entry.excerpt.toLowerCase().includes(lq) ||
    entry.file.toLowerCase().includes(lq)
  );
}

// GET /api/prompts/search?q=...&page=1&pageSize=20&registry=claude
promptsRouter.get('/search', async (req: Request, res: Response) => {
  incCounter('summit_ui_prompt_search_total', 'Prompt search requests');
  const q        = String(req.query.q ?? '').trim();
  const page     = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const registry = req.query.registry ? String(req.query.registry) : undefined;

  const all = await getAllPrompts(registry);
  const filtered = q ? all.filter((e) => matches(e, q)) : all;
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  res.json({ items, total, page, pageSize });
});

// GET /api/prompts/stream?q=...&registry=... → Server-Sent Events
promptsRouter.get('/stream', async (req: Request, res: Response) => {
  incCounter('summit_ui_prompt_stream_total', 'Prompt stream requests');
  const q        = String(req.query.q ?? '').trim();
  const registry = req.query.registry ? String(req.query.registry) : undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const toSearch = registry && REGISTRIES[registry]
    ? { [registry]: REGISTRIES[registry] }
    : REGISTRIES;

  for (const [name, dir] of Object.entries(toSearch)) {
    let entries: PromptEntry[];
    try { entries = await collectFiles(dir, name); } catch { continue; }
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
promptsRouter.get('/registries', async (_req: Request, res: Response) => {
  const counts: Record<string, number> = {};
  for (const [name, dir] of Object.entries(REGISTRIES)) {
    try {
      const st = await stat(dir);
      if (st.isDirectory()) {
        const files = await collectFiles(dir, name);
        counts[name] = files.length;
      } else {
        counts[name] = 0;
      }
    } catch {
      counts[name] = 0;
    }
  }
  res.json(counts);
});
