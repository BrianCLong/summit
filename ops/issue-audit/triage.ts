import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from '@xenova/transformers';
import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { HierarchicalNSW } from '@vladmandic/hnswlib-node';
import pRetry from 'p-retry';

const OctokitWithRetry = Octokit.plugin(retry);

type LabelClass = 'bug' | 'enhancement' | 'question' | 'needs-info';

type Classification = {
  label: LabelClass;
  confidence: number;
  reasons: string[];
  needsHumanReview: boolean;
};

type Issue = {
  number: number;
  title: string;
  body?: string;
  labels: { name: string }[];
  assignees?: { login: string }[];
  state: string;
};

type DuplicateCandidate = {
  source: number;
  target: number;
  similarity: number;
};

type ActionLogEntry = {
  issue: number;
  action: string;
  detail: string;
};

type TriageOptions = {
  dryRun: boolean;
  applyDuplicates: boolean;
  applyLabels: boolean;
  includeClosed: boolean;
  limit?: number;
  exportIssues: boolean;
  slackWebhook?: string;
  teamsWebhook?: string;
};

const ISSUE_DUMP_PATH = path.resolve(__dirname, 'issue_dump.json');
const AUDIT_LOG_PATH = path.resolve(__dirname, 'audit.log');
const REPORT_PATH = path.resolve(__dirname, 'report.md');
const EMBEDDING_INDEX_PATH = path.resolve(__dirname, 'embeddings.db');
const EMBEDDING_META_PATH = path.resolve(__dirname, 'embeddings.meta.json');

const BUG_PATTERNS = [
  /crash/i,
  /exception/i,
  /error/i,
  /stack trace/i,
  /hangs?/i,
  /freeze/i,
  /fail(ed|ure)?/i,
  /regression/i,
  /does not (work|load)/i,
];

const QUESTION_PATTERNS = [
  /how do i/i,
  /can i/i,
  /is it possible/i,
  /\?\s*$/,
  /what is the best/i,
  /usage question/i,
];

const ENHANCEMENT_PATTERNS = [
  /feature request/i,
  /enhancement/i,
  /improvement/i,
  /would like/i,
  /add support/i,
  /roadmap/i,
];

const NEEDS_INFO_PATTERNS = [
  /steps to reproduce/i,
  /environment/i,
  /version/i,
  /logs?/i,
  /reproducible/i,
];

const MIN_CONFIDENCE_FOR_AUTOMATION = 0.72;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.83;
const HNSW_SPACE = 'cosine';
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

const humanTimestamp = () => new Date().toISOString();

async function appendAudit(entries: ActionLogEntry[]): Promise<void> {
  if (!entries.length) return;
  const lines = entries
    .map((entry) => `${humanTimestamp()} | #${entry.issue} | ${entry.action} | ${entry.detail}`)
    .join('\n');
  await fs.appendFile(AUDIT_LOG_PATH, `${lines}\n`);
}

async function loadIssues(issueDumpPath: string, includeClosed: boolean, limit?: number): Promise<Issue[]> {
  const raw = await fs.readFile(issueDumpPath, 'utf8');
  const parsed = JSON.parse(raw) as Issue[];
  const filtered = parsed.filter((issue) => includeClosed || issue.state === 'open');
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

function classifyIssue(issue: Issue): Classification {
  const text = `${issue.title}\n${issue.body ?? ''}`.toLowerCase();
  const scores: Record<LabelClass, number> = {
    bug: 0,
    enhancement: 0,
    question: 0,
    'needs-info': 0,
  };
  const reasons: string[] = [];

  BUG_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      scores.bug += 1;
      reasons.push(`Matched bug pattern: ${pattern}`);
    }
  });

  QUESTION_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      scores.question += 1;
      reasons.push(`Matched question pattern: ${pattern}`);
    }
  });

  ENHANCEMENT_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      scores.enhancement += 1;
      reasons.push(`Matched enhancement pattern: ${pattern}`);
    }
  });

  NEEDS_INFO_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      scores['needs-info'] += 0.3;
    }
  });

  if ((issue.body ?? '').trim().length < 120) {
    scores['needs-info'] += 0.25;
    reasons.push('Body is short; may lack actionable details');
  }

  if ((issue.assignees ?? []).length > 0) {
    scores['needs-info'] -= 0.1;
  }

  const label = (Object.keys(scores) as LabelClass[]).reduce((prev, current) =>
    scores[current] > scores[prev] ? current : prev,
  );

  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const confidence = sortedScores[0] === 0 ? 0 : sortedScores[0] / (sortedScores[0] + (sortedScores[1] ?? 0.01));
  const needsHumanReview = confidence < MIN_CONFIDENCE_FOR_AUTOMATION || sortedScores[0] - (sortedScores[1] ?? 0) < 0.35;

  return { label, confidence, reasons, needsHumanReview };
}

async function ensureIssueDump(issueDumpPath: string): Promise<void> {
  try {
    await fs.access(issueDumpPath);
  } catch {
    await fs.writeFile(issueDumpPath, '[]\n', 'utf8');
  }
}

async function exportIssues(issueDumpPath: string): Promise<void> {
  const ghArgs = [
    'issue',
    'list',
    '--limit',
    '5000',
    '--json',
    'number,title,labels,body,assignees,state',
    '--repo',
    process.env.GH_REPO ?? '',
  ].filter(Boolean);

  const { execFile } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    execFile('gh', ghArgs, { encoding: 'utf8' }, async (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`gh export failed: ${stderr || error.message}`));
        return;
      }
      await fs.writeFile(issueDumpPath, stdout.trim() || '[]', 'utf8');
      resolve();
    });
  });
}

async function buildEmbedder() {
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL);
  return async (text: string): Promise<Float32Array> => {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data as number[]);
    return Float32Array.from(embedding);
  };
}

class EmbeddingIndex {
  private index?: HierarchicalNSW;
  private meta: Record<number, number> = {};
  private readonly dim: number;
  private loaded = false;

  constructor(dim: number) {
    this.dim = dim;
  }

  async load(): Promise<void> {
    const hasIndex = await fs
      .access(EMBEDDING_INDEX_PATH)
      .then(() => true)
      .catch(() => false);
    const hasMeta = await fs
      .access(EMBEDDING_META_PATH)
      .then(() => true)
      .catch(() => false);

    this.index = new HierarchicalNSW(HNSW_SPACE, this.dim);
    if (hasIndex && hasMeta) {
      await this.index.readIndex(EMBEDDING_INDEX_PATH);
      const rawMeta = await fs.readFile(EMBEDDING_META_PATH, 'utf8');
      this.meta = JSON.parse(rawMeta) as Record<number, number>;
    } else {
      this.index.initIndex(1024);
    }
    this.loaded = true;
  }

  async add(issueNumber: number, vector: Float32Array): Promise<void> {
    if (!this.loaded || !this.index) throw new Error('Embedding index not loaded');
    const pointId = Object.keys(this.meta).length;
    this.index.addPoint(vector, pointId);
    this.meta[pointId] = issueNumber;
  }

  async query(vector: Float32Array, k = 5): Promise<DuplicateCandidate[]> {
    if (!this.loaded || !this.index) throw new Error('Embedding index not loaded');
    const results = this.index.searchKnn(vector, k);
    return results.neighbors
      .map((neighbor, idx) => ({
        id: neighbor,
        distance: results.distances[idx],
      }))
      .filter((entry) => this.meta[entry.id] !== undefined)
      .map((entry) => ({
        source: -1,
        target: this.meta[entry.id],
        similarity: 1 - entry.distance,
      }));
  }

  async persist(): Promise<void> {
    if (!this.index) return;
    await this.index.writeIndex(EMBEDDING_INDEX_PATH);
    await fs.writeFile(EMBEDDING_META_PATH, JSON.stringify(this.meta, null, 2));
  }
}

async function detectDuplicates(
  issues: Issue[],
  embedder: (text: string) => Promise<Float32Array>,
  options: { limit?: number },
): Promise<DuplicateCandidate[]> {
  if (!issues.length) return [];
  const sampleEmbedding = await embedder(`${issues[0].title}\n${issues[0].body ?? ''}`);
  const index = new EmbeddingIndex(sampleEmbedding.length);
  await index.load();
  const candidates: DuplicateCandidate[] = [];

  for (const issue of issues.slice(0, options.limit ?? issues.length)) {
    const vector = await embedder(`${issue.title}\n${issue.body ?? ''}`);
    const neighbors = await index.query(vector, 5);
    neighbors.forEach((neighbor) => {
      const similarity = neighbor.similarity;
      if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD && neighbor.target !== issue.number) {
        candidates.push({ source: issue.number, target: neighbor.target, similarity });
      }
    });
    await index.add(issue.number, vector);
  }

  await index.persist();
  const uniquePairs = new Map<string, DuplicateCandidate>();
  candidates.forEach((pair) => {
    const key = [Math.min(pair.source, pair.target), Math.max(pair.source, pair.target)].join('-');
    if (!uniquePairs.has(key) || (uniquePairs.get(key)?.similarity ?? 0) < pair.similarity) {
      uniquePairs.set(key, pair);
    }
  });
  return Array.from(uniquePairs.values());
}

function parseArgs(argv: string[]): TriageOptions {
  const args = new Set(argv);
  return {
    dryRun: !args.has('--apply'),
    applyLabels: args.has('--apply') || args.has('--labels'),
    applyDuplicates: args.has('--apply') || args.has('--duplicates'),
    includeClosed: args.has('--closed'),
    limit: (() => {
      const limitIndex = argv.findIndex((arg) => arg === '--limit');
      if (limitIndex !== -1 && argv[limitIndex + 1]) {
        return Number(argv[limitIndex + 1]);
      }
      return undefined;
    })(),
    exportIssues: args.has('--export'),
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    teamsWebhook: process.env.TEAMS_WEBHOOK_URL,
  };
}

function summarize(classifications: Map<number, Classification>): Record<LabelClass, number> {
  const counts: Record<LabelClass, number> = {
    bug: 0,
    enhancement: 0,
    question: 0,
    'needs-info': 0,
  };
  classifications.forEach((classification) => {
    counts[classification.label] += 1;
  });
  return counts;
}

async function applyLabelActions(
  octokit: Octokit,
  classifications: Map<number, Classification>,
  dryRun: boolean,
): Promise<ActionLogEntry[]> {
  const actions: ActionLogEntry[] = [];
  for (const [issueNumber, classification] of classifications.entries()) {
    if (classification.needsHumanReview || classification.confidence < MIN_CONFIDENCE_FOR_AUTOMATION) {
      continue;
    }

    const labelsToApply = new Set<string>([classification.label]);
    if (classification.label === 'bug' && classification.confidence < 0.85) {
      labelsToApply.add('needs-info');
    }

    if (dryRun) {
      actions.push({ issue: issueNumber, action: 'label (dry-run)', detail: Array.from(labelsToApply).join(', ') });
      continue;
    }

    await pRetry(
      () =>
        octokit.issues.addLabels({
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          issue_number: issueNumber,
          labels: Array.from(labelsToApply),
        }),
      {
        retries: 3,
        onFailedAttempt: (error) => {
          if (error.attemptNumber === error.retriesLeft) return;
        },
      },
    );

    actions.push({ issue: issueNumber, action: 'label', detail: Array.from(labelsToApply).join(', ') });
  }
  return actions;
}

async function closeDuplicates(
  octokit: Octokit,
  duplicates: DuplicateCandidate[],
  dryRun: boolean,
): Promise<ActionLogEntry[]> {
  const actions: ActionLogEntry[] = [];
  const seen = new Set<string>();
  for (const pair of duplicates) {
    const key = [Math.min(pair.source, pair.target), Math.max(pair.source, pair.target)].join('-');
    if (seen.has(key)) continue;
    seen.add(key);

    const canonical = Math.min(pair.source, pair.target);
    const duplicate = Math.max(pair.source, pair.target);
    const detail = `duplicate of #${canonical} (similarity ${pair.similarity.toFixed(2)})`;

    if (dryRun) {
      actions.push({ issue: duplicate, action: 'close-duplicate (dry-run)', detail });
      continue;
    }

    await pRetry(
      () =>
        octokit.issues.update({
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          issue_number: duplicate,
          state: 'closed',
        }),
      { retries: 3 },
    );

    await pRetry(
      () =>
        octokit.issues.createComment({
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          issue_number: duplicate,
          body: `Closing as duplicate of #${canonical}. If this is incorrect, please reopen.`,
        }),
      { retries: 3 },
    );

    await pRetry(
      () =>
        octokit.issues.addLabels({
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          issue_number: duplicate,
          labels: ['duplicate'],
        }),
      { retries: 3 },
    );

    actions.push({ issue: duplicate, action: 'closed-duplicate', detail });
  }
  return actions;
}

function buildReport(
  counts: Record<LabelClass, number>,
  duplicates: DuplicateCandidate[],
  manualReview: number[],
  dryRun: boolean,
): string {
  return `# Issue Audit Report\n\n` +
    `- Generated: ${humanTimestamp()}\n` +
    `- Mode: ${dryRun ? 'dry-run (no mutations performed)' : 'apply'}\n\n` +
    `## Classification Counts\n` +
    Object.entries(counts)
      .map(([label, count]) => `- ${label}: ${count}`)
      .join('\n') +
    `\n\n## Duplicate Candidates (similarity ≥ ${DUPLICATE_SIMILARITY_THRESHOLD})\n` +
    (duplicates.length
      ? duplicates
          .map((dup) => `- #${dup.source} → #${dup.target} (similarity ${dup.similarity.toFixed(2)})`)
          .join('\n')
      : '- none') +
    `\n\n## Manual Review Queue\n` +
    (manualReview.length ? manualReview.map((id) => `- #${id}`).join('\n') : '- none') +
    '\n';
}

async function postWebhook(url: string, text: string): Promise<void> {
  const payload = { text };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await ensureIssueDump(ISSUE_DUMP_PATH);

  if (options.exportIssues) {
    await exportIssues(ISSUE_DUMP_PATH);
  }

  const issues = await loadIssues(ISSUE_DUMP_PATH, options.includeClosed, options.limit);
  const classifications = new Map<number, Classification>();
  const manualReview: number[] = [];

  issues.forEach((issue) => {
    const classification = classifyIssue(issue);
    classifications.set(issue.number, classification);
    if (classification.needsHumanReview) {
      manualReview.push(issue.number);
    }
  });

  const embedder = await buildEmbedder();
  const duplicates = await detectDuplicates(issues, embedder, { limit: options.limit });

  const octokit = new OctokitWithRetry({ auth: process.env.GITHUB_TOKEN || process.env.GH_TOKEN });
  const actions: ActionLogEntry[] = [];

  if (options.applyLabels) {
    const labelActions = await applyLabelActions(octokit, classifications, options.dryRun);
    actions.push(...labelActions);
  }

  if (options.applyDuplicates && duplicates.length) {
    const duplicateActions = await closeDuplicates(octokit, duplicates, options.dryRun);
    actions.push(...duplicateActions);
  }

  await appendAudit(actions);

  const report = buildReport(summarize(classifications), duplicates, manualReview, options.dryRun);
  await fs.writeFile(REPORT_PATH, report, 'utf8');

  const notificationText = `${report}\n\nAudit log entries: ${actions.length}`;
  if (options.slackWebhook) {
    await postWebhook(options.slackWebhook, notificationText);
  }
  if (options.teamsWebhook) {
    await postWebhook(options.teamsWebhook, notificationText);
  }
}

main().catch((error) => {
  console.error('Triage failed', error);
  process.exitCode = 1;
});
