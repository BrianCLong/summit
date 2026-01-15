import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';
import { SessionPaths } from './types.js';

export interface SessionOptions {
  sessionId?: string;
  rootDir?: string;
}

export const SESSION_ROOT = '.summit-agent/sessions';

export function ensureSession(options: SessionOptions = {}): SessionPaths {
  const rootDir = options.rootDir ?? process.cwd();
  const sessionId = options.sessionId ?? defaultSessionId();
  const baseDir = resolve(rootDir, SESSION_ROOT, sessionId);

  mkdirSync(baseDir, { recursive: true });

  return {
    id: sessionId,
    baseDir,
    receiptsPath: resolve(baseDir, 'receipts.jsonl'),
    summaryPath: resolve(baseDir, 'summary.md'),
    checklistPath: resolve(baseDir, 'checklist.yml'),
    planPath: resolve(baseDir, 'plan.json'),
    checklistReportJsonPath: resolve(baseDir, 'checklist_report.json'),
    checklistReportMdPath: resolve(baseDir, 'checklist_report.md'),
  };
}

export function findLatestSession(rootDir: string = process.cwd()): string | null {
  const sessionsDir = resolve(rootDir, SESSION_ROOT);
  if (!existsSync(sessionsDir)) {
    return null;
  }

  const entries = readdirSync(sessionsDir);
  const candidates = entries
    .map((entry) => {
      const fullPath = resolve(sessionsDir, entry);
      const stats = statSync(fullPath);
      return { entry, mtimeMs: stats.mtimeMs };
    })
    .filter((entry) => entry.entry && Number.isFinite(entry.mtimeMs))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.entry ?? null;
}

function defaultSessionId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
