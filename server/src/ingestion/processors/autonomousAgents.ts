import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { execFileSync } from 'node:child_process';
import readline from 'node:readline';
import { getPostgresPool } from '../../config/database.js';

export interface AutonomousAgentPaperRecord {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourcePath: string;
  sourceCommit: string;
  extractedAt: string;
  paperTitle: string;
  paperUrl: string;
  paperHost: string | null;
  publishedOrListedDate: string | null;
  summaryBullets: string[];
  tags: string[];
  externalIds: {
    arxivId?: string;
    doi?: string;
  };
  recordHash: string;
  normalizedTitle: string;
}

interface ParseContext {
  currentDate: string | null;
}

const SOURCE_NAME = 'tmgthb/Autonomous-Agents';
const SOURCE_URL = 'https://github.com/tmgthb/Autonomous-Agents';

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function deriveHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extractArxivId(url: string): string | undefined {
  const arxivMatch = url.match(/arxiv\.org\/(abs|pdf)\/([\w.\-]+)/i);
  return arxivMatch ? arxivMatch[2] : undefined;
}

function extractDoi(url: string): string | undefined {
  const doiMatch = url.match(/doi\.org\/(.+)$/i);
  return doiMatch ? doiMatch[1] : undefined;
}

function toIsoDate(dateText: string): string | null {
  const cleaned = dateText
    .replace(/^#+\s*/, '')
    .replace(/([0-9]{1,2})(st|nd|rd|th)/gi, '$1')
    .trim();

  const parsed = Date.parse(cleaned);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return null;
}

function inferTags(summaryBullets: string[]): string[] {
  const base = new Set<string>(['autonomous-agents']);
  const keywordMap: Record<string, string> = {
    planning: 'planning',
    evaluation: 'evaluation',
    benchmark: 'benchmark',
    safety: 'safety',
    swarm: 'swarm',
    multiagent: 'multi-agent',
    workflow: 'workflow',
    cooperation: 'cooperation',
    collaboration: 'collaboration',
  } as Record<string, string>;

  summaryBullets.forEach((bullet) => {
    const lower = bullet.toLowerCase();
    Object.entries(keywordMap).forEach(([needle, tag]) => {
      if (lower.includes(needle)) {
        base.add(tag);
      }
    });
  });

  return Array.from(base);
}

function computeSourceId(repoPath: string, paperLink: string, title: string): string {
  return crypto
    .createHash('sha256')
    .update(`${SOURCE_URL}|${repoPath}|${paperLink}|${normalizeTitle(title)}`)
    .digest('hex');
}

function computeRecordHash(record: AutonomousAgentPaperRecord): string {
  const { recordHash: _ignored, ...payload } = record;
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function parseAutonomousAgentsMarkdown(
  filePath: string,
  sourceCommit: string,
  repoRoot: string,
): Promise<AutonomousAgentPaperRecord[]> {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const context: ParseContext = { currentDate: null };
  const records: AutonomousAgentPaperRecord[] = [];

  let currentPaper:
    | (Pick<AutonomousAgentPaperRecord, 'paperTitle' | 'paperUrl' | 'paperHost'> & {
        summaryBullets: string[];
        sourcePath: string;
      })
    | null = null;

  function flushCurrent() {
    if (!currentPaper) return;

    const publishedOrListedDate = context.currentDate;
    const tags = inferTags(currentPaper.summaryBullets);
    const externalIds = {
      arxivId: extractArxivId(currentPaper.paperUrl),
      doi: extractDoi(currentPaper.paperUrl),
    };

    const baseRecord: AutonomousAgentPaperRecord = {
      sourceId: computeSourceId(currentPaper.sourcePath, currentPaper.paperUrl, currentPaper.paperTitle),
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      sourcePath: currentPaper.sourcePath,
      sourceCommit,
      extractedAt: new Date().toISOString(),
      paperTitle: currentPaper.paperTitle.trim(),
      paperUrl: currentPaper.paperUrl,
      paperHost: currentPaper.paperHost,
      publishedOrListedDate,
      summaryBullets: currentPaper.summaryBullets.filter(Boolean),
      tags,
      externalIds,
      recordHash: '',
      normalizedTitle: normalizeTitle(currentPaper.paperTitle),
    };

    baseRecord.recordHash = computeRecordHash(baseRecord);
    records.push(baseRecord);
    currentPaper = null;
  }

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith('###') || line.startsWith('####') || line.startsWith('##')) {
      const parsedDate = toIsoDate(line);
      if (parsedDate) {
        flushCurrent();
        context.currentDate = parsedDate;
      }
      continue;
    }

    const linkMatch = line.match(/^(?:[-*]|\d+\.)?\s*\[(.+?)\]\((.+?)\)/);
    if (linkMatch) {
      flushCurrent();
      const [, title, url] = linkMatch;
      currentPaper = {
        paperTitle: title,
        paperUrl: url,
        paperHost: deriveHost(url),
        summaryBullets: [],
        sourcePath: path.relative(repoRoot, filePath),
      };
      continue;
    }

    const summaryMatch = line.match(/^[-*•]\s+(.*)$/);
    if (currentPaper && summaryMatch) {
      currentPaper.summaryBullets.push(summaryMatch[1].trim());
    }
  }

  flushCurrent();
  rl.close();
  return records;
}

function listCandidateFiles(baseDir: string): string[] {
  const results: string[] = [];
  const stack = [baseDir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(resolved);
        continue;
      }

      const relative = path.relative(baseDir, resolved);
      if (
        entry.name.toLowerCase() === 'readme.md' ||
        /resources\/Autonomous_Agents_Research_Papers_.*\.md/i.test(relative) ||
        /resources\/Autonomous_Agents_Resources\.md/i.test(relative)
      ) {
        results.push(resolved);
      }
    }
  }

  return results;
}

export async function parseRepository(
  rootDir: string,
  commitSha: string,
): Promise<AutonomousAgentPaperRecord[]> {
  const files = listCandidateFiles(rootDir);
  const records: AutonomousAgentPaperRecord[] = [];
  for (const file of files) {
    const parsed = await parseAutonomousAgentsMarkdown(file, commitSha, rootDir);
    records.push(...parsed);
  }
  return records;
}

function ensureTables(pool = getPostgresPool()) {
  return pool.query(
    `
    CREATE TABLE IF NOT EXISTS autonomous_agent_papers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id TEXT UNIQUE NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_path TEXT NOT NULL,
      source_commit TEXT NOT NULL,
      extracted_at TIMESTAMPTZ NOT NULL,
      paper_title TEXT NOT NULL,
      paper_url TEXT NOT NULL,
      paper_host TEXT,
      published_or_listed_date DATE,
      summary_bullets JSONB DEFAULT '[]'::jsonb,
      tags TEXT[] DEFAULT '{}',
      external_ids JSONB DEFAULT '{}'::jsonb,
      record_hash TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      arxiv_id TEXT,
      doi TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS autonomous_agent_ingest_state (
      source_name TEXT PRIMARY KEY,
      last_ingested_commit TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
  );
}

async function upsertPaper(record: AutonomousAgentPaperRecord, pool = getPostgresPool()) {
  const arxivId = record.externalIds.arxivId ?? null;
  const doi = record.externalIds.doi ?? null;

  await pool.query(
    `
    INSERT INTO autonomous_agent_papers (
      source_id, source_name, source_url, source_path, source_commit, extracted_at,
      paper_title, paper_url, paper_host, published_or_listed_date, summary_bullets,
      tags, external_ids, record_hash, normalized_title, arxiv_id, doi, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, NOW()
    )
    ON CONFLICT (source_id) DO UPDATE SET
      source_path = EXCLUDED.source_path,
      source_commit = EXCLUDED.source_commit,
      extracted_at = EXCLUDED.extracted_at,
      paper_title = EXCLUDED.paper_title,
      paper_url = EXCLUDED.paper_url,
      paper_host = EXCLUDED.paper_host,
      published_or_listed_date = EXCLUDED.published_or_listed_date,
      summary_bullets = EXCLUDED.summary_bullets,
      tags = EXCLUDED.tags,
      external_ids = EXCLUDED.external_ids,
      record_hash = EXCLUDED.record_hash,
      normalized_title = EXCLUDED.normalized_title,
      arxiv_id = EXCLUDED.arxiv_id,
      doi = EXCLUDED.doi,
      updated_at = NOW()
    ;
    `,
    [
      record.sourceId,
      record.sourceName,
      record.sourceUrl,
      record.sourcePath,
      record.sourceCommit,
      record.extractedAt,
      record.paperTitle,
      record.paperUrl,
      record.paperHost,
      record.publishedOrListedDate,
      JSON.stringify(record.summaryBullets),
      record.tags,
      JSON.stringify(record.externalIds),
      record.recordHash,
      record.normalizedTitle,
      arxivId,
      doi,
    ],
  );
}

async function upsertCheckpoint(commitSha: string, pool = getPostgresPool()) {
  await pool.query(
    `
    INSERT INTO autonomous_agent_ingest_state (source_name, last_ingested_commit, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (source_name)
    DO UPDATE SET last_ingested_commit = EXCLUDED.last_ingested_commit, updated_at = NOW();
    `,
    [SOURCE_NAME, commitSha],
  );
}

async function getLastIngestedCommit(pool = getPostgresPool()): Promise<string | null> {
  const result = await pool.read(
    'SELECT last_ingested_commit FROM autonomous_agent_ingest_state WHERE source_name = $1 LIMIT 1',
    [SOURCE_NAME],
  );
  return result.rows[0]?.last_ingested_commit ?? null;
}

export class AutonomousAgentsIngestionService {
  constructor(private readonly repoUrl = SOURCE_URL) {}

  clone(ref = 'main'): { repoPath: string; commitSha: string } {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autonomous-agents-'));
    execFileSync('git', ['clone', '--depth', '1', '--branch', ref, this.repoUrl, tempDir], {
      stdio: 'ignore',
    });
    const commitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: tempDir,
    })
      .toString()
      .trim();

    return { repoPath: tempDir, commitSha };
  }

  clonePinnedCommit(commitSha: string): { repoPath: string; commitSha: string } {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autonomous-agents-'));
    execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', this.repoUrl, tempDir], {
      stdio: 'ignore',
    });
    execFileSync('git', ['checkout', commitSha], { cwd: tempDir, stdio: 'ignore' });
    return { repoPath: tempDir, commitSha };
  }

  async ingest(
    options: { ref?: string; commitSha?: string; localPath?: string; force?: boolean } = {},
  ) {
    const { ref = 'main', commitSha: pinnedCommit, localPath, force = false } = options;

    let repoPath: string | null = null;
    let commitSha: string;
    let cleanupRepo = false;

    try {
      if (localPath) {
        repoPath = localPath;
        if (pinnedCommit) {
          commitSha = pinnedCommit;
        } else {
          commitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoPath })
            .toString()
            .trim();
        }
      } else if (pinnedCommit) {
        const clone = this.clonePinnedCommit(pinnedCommit);
        repoPath = clone.repoPath;
        commitSha = clone.commitSha;
        cleanupRepo = true;
      } else {
        const clone = this.clone(ref);
        repoPath = clone.repoPath;
        commitSha = clone.commitSha;
        cleanupRepo = true;
      }

      const effectiveCommit = pinnedCommit ?? commitSha;
      await ensureTables();
      const pool = getPostgresPool();
      const lastCommit = await getLastIngestedCommit(pool);

      if (!force && lastCommit === effectiveCommit) {
        return { inserted: 0, commitSha: effectiveCommit };
      }

      const records = await parseRepository(localPath ?? repoPath, effectiveCommit);

      for (const record of records) {
        // Dedupe: prefer arXiv id, then normalized title + host
        if (record.externalIds.arxivId) {
          const existing = await pool.read(
            'SELECT source_id FROM autonomous_agent_papers WHERE arxiv_id = $1 LIMIT 1',
            [record.externalIds.arxivId],
          );
          if (existing.rows.length > 0) {
            record.sourceId = existing.rows[0].source_id;
          }
        } else {
          const existing = await pool.read(
            'SELECT source_id FROM autonomous_agent_papers WHERE normalized_title = $1 AND paper_host = $2 LIMIT 1',
            [record.normalizedTitle, record.paperHost],
          );
          if (existing.rows.length > 0) {
            record.sourceId = existing.rows[0].source_id;
          }
        }

        record.recordHash = computeRecordHash(record);
        await upsertPaper(record, pool);
      }

      await upsertCheckpoint(effectiveCommit, pool);
      return { inserted: records.length, commitSha: effectiveCommit };
    } finally {
      if (cleanupRepo && repoPath) {
        fs.rmSync(repoPath, { recursive: true, force: true });
      }
    }
  }
}

export async function streamRecords(records: AutonomousAgentPaperRecord[]): Promise<Readable> {
  const stream = new Readable({
    objectMode: true,
    read() {},
  });

  records.forEach((record) => stream.push(record));
  stream.push(null);
  return stream;
}
