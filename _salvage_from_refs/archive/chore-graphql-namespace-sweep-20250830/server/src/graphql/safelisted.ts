import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';

const GENERATED_PATH = path.resolve(process.cwd(), 'server/src/graphql/safelist.generated.json');

function loadSafelist(): Set<string> {
  try {
    if (fs.existsSync(GENERATED_PATH)) {
      const arr: string[] = JSON.parse(fs.readFileSync(GENERATED_PATH, 'utf8'));
      return new Set(arr);
    }
  } catch {}
  return new Set<string>();
}

const SAFE = loadSafelist();

export function opHash(body: string): string {
  return crypto.createHash('sha256').update(body || '').digest('hex');
}

export function enforceSafelist(req: { body?: { query?: string } }, enabled = process.env.SAFELIST === '1'): void {
  if (!enabled) return;
  const q = req.body?.query || '';
  const hash = opHash(q);
  if (!SAFE.has(hash)) {
    const err: any = new Error('Operation not safelisted');
    err.statusCode = 403;
    throw err;
  }
}

export function safelistMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    enforceSafelist(req);
    next();
  } catch (e: any) {
    res.status(e?.statusCode || 403).json({ error: e?.message || 'Forbidden' });
  }
}

