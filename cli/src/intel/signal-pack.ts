import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

type EvidenceSnippet = {
  snippet: string;
  url: string;
};

type Claim = {
  id: string;
  signal_type: 'ma_intent' | 'kpi' | 'product_strategy';
  claim_text: string;
  evidence: EvidenceSnippet[];
};

type Source = {
  kind: string;
  url: string;
  claims: Claim[];
};

type SignalItem = {
  item_id: string;
  published_at: string;
  title: string;
  entities: Array<{ name: string; type: string }>;
  sources: Source[];
};

type Signal = {
  signal_id: string;
  type: Claim['signal_type'];
  claim_text: string;
  grounding: Array<{
    source_kind: string;
    url: string;
    snippet: string;
    snippet_sha256: string;
  }>;
  confidence: 'source-asserted' | 'corroborated';
};

type SignalReport = {
  item_id: string;
  source: string;
  published_at: string;
  entities: SignalItem['entities'];
  signals: Signal[];
};

type EvidenceReport = {
  item_id: string;
  title: string;
  sources: Array<{
    kind: string;
    url: string;
    claims: Array<{
      id: string;
      signal_type: Claim['signal_type'];
      claim_text: string;
      evidence: EvidenceSnippet[];
    }>;
  }>;
};

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry)) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortKeys(val)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function stableStringify(payload: unknown): string {
  return JSON.stringify(sortKeys(payload), null, 2);
}

export async function loadSignalItem(itemId: string): Promise<SignalItem> {
  const itemPath = path.join(
    REPO_ROOT,
    'intel',
    'items',
    itemId,
    'item.yaml',
  );
  const raw = await fs.readFile(itemPath, 'utf-8');
  const parsed = parse(raw) as SignalItem;
  return parsed;
}

export function buildSignals(
  item: SignalItem,
  sourceFilter: string,
): Signal[] {
  const sources = sourceFilter === 'all'
    ? item.sources
    : item.sources.filter((source) => source.kind === sourceFilter);

  const signals: Signal[] = [];
  let counter = 1;

  for (const source of sources) {
    for (const claim of source.claims) {
      const signalId = `EVI-${item.item_id}-${String(counter).padStart(3, '0')}`;
      counter += 1;
      const grounding = claim.evidence.map((evidence) => ({
        source_kind: source.kind,
        url: evidence.url,
        snippet: evidence.snippet,
        snippet_sha256: sha256(`${evidence.url}:${evidence.snippet}`),
      }));
      signals.push({
        signal_id: signalId,
        type: claim.signal_type,
        claim_text: claim.claim_text,
        grounding,
        confidence: 'source-asserted',
      });
    }
  }

  return signals.sort((a, b) => a.signal_id.localeCompare(b.signal_id));
}

export function buildReport(
  item: SignalItem,
  sourceFilter: string,
): SignalReport {
  return {
    item_id: item.item_id,
    source: sourceFilter,
    published_at: item.published_at,
    entities: item.entities,
    signals: buildSignals(item, sourceFilter),
  };
}

export function buildEvidence(item: SignalItem): EvidenceReport {
  return {
    item_id: item.item_id,
    title: item.title,
    sources: item.sources.map((source) => ({
      kind: source.kind,
      url: source.url,
      claims: source.claims.map((claim) => ({
        id: claim.id,
        signal_type: claim.signal_type,
        claim_text: claim.claim_text,
        evidence: claim.evidence,
      })),
    })),
  };
}

export async function writeArtifacts(
  itemId: string,
  report: SignalReport,
  evidence: EvidenceReport,
): Promise<{
  reportPath: string;
  evidencePath: string;
  metricsPath: string;
}> {
  const artifactRoot = path.join(REPO_ROOT, 'artifacts', 'intel', itemId);
  await fs.mkdir(artifactRoot, { recursive: true });

  const reportPayload = stableStringify(report);
  const evidencePayload = stableStringify(evidence);

  const reportPath = path.join(artifactRoot, 'report.json');
  const evidencePath = path.join(artifactRoot, 'evidence.json');
  await fs.writeFile(reportPath, `${reportPayload}\n`, 'utf-8');
  await fs.writeFile(evidencePath, `${evidencePayload}\n`, 'utf-8');

  const itemPath = path.join(
    REPO_ROOT,
    'intel',
    'items',
    itemId,
    'item.yaml',
  );
  const itemSize = (await fs.stat(itemPath)).size;

  const metrics = {
    item_id: itemId,
    schema_version: '0.1.0',
    signal_count: report.signals.length,
    claim_count: evidence.sources.reduce(
      (total, source) => total + source.claims.length,
      0,
    ),
    bytes_in: itemSize,
    bytes_out: Buffer.byteLength(reportPayload) + Buffer.byteLength(evidencePayload),
    cpu_ms: 0,
    rss_kb: 0,
    measurement_mode: 'deterministic_baseline',
  };

  const metricsPath = path.join(artifactRoot, 'metrics.json');
  await fs.writeFile(metricsPath, `${stableStringify(metrics)}\n`, 'utf-8');

  return { reportPath, evidencePath, metricsPath };
}

export async function writeBaselineArtifacts(
  itemId: string,
  report: SignalReport,
  evidence: EvidenceReport,
): Promise<{
  reportPath: string;
  evidencePath: string;
  metricsPath: string;
}> {
  const baselineRoot = path.join(
    REPO_ROOT,
    'intel',
    'items',
    itemId,
    'baseline',
  );
  await fs.mkdir(baselineRoot, { recursive: true });

  const reportPayload = stableStringify(report);
  const evidencePayload = stableStringify(evidence);

  const reportPath = path.join(baselineRoot, 'report.json');
  const evidencePath = path.join(baselineRoot, 'evidence.json');
  await fs.writeFile(reportPath, `${reportPayload}\n`, 'utf-8');
  await fs.writeFile(evidencePath, `${evidencePayload}\n`, 'utf-8');

  const itemPath = path.join(
    REPO_ROOT,
    'intel',
    'items',
    itemId,
    'item.yaml',
  );
  const itemSize = (await fs.stat(itemPath)).size;

  const metrics = {
    item_id: itemId,
    schema_version: '0.1.0',
    signal_count: report.signals.length,
    claim_count: evidence.sources.reduce(
      (total, source) => total + source.claims.length,
      0,
    ),
    bytes_in: itemSize,
    bytes_out: Buffer.byteLength(reportPayload) + Buffer.byteLength(evidencePayload),
    cpu_ms: 0,
    rss_kb: 0,
    measurement_mode: 'deterministic_baseline',
  };

  const metricsPath = path.join(baselineRoot, 'metrics.json');
  await fs.writeFile(metricsPath, `${stableStringify(metrics)}\n`, 'utf-8');

  return { reportPath, evidencePath, metricsPath };
}
