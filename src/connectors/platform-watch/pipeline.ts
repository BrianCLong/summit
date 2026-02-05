import { evidenceId } from './evidenceId';
import { detectDrift } from './drift';
import { fetchSource } from './fetch';
import { hashObject } from './hash';
import { normalizeDocument, toEvidenceItem } from './normalize';
import { PLATFORM_SOURCES } from './sources';
import {
  ClaimItem,
  EvidenceItem,
  PlatformSummary,
  PlatformWatchKg,
  PlatformWatchMetrics,
  PlatformWatchReport,
  PlatformWatchStamp,
  SourceDocument,
  SourceSpec,
} from './types';
import { buildKg } from '../../graphrag/ingest/platform-watch/buildKg';

export interface RunOptions {
  date: string;
  sources?: SourceSpec[];
  claims?: ClaimItem[];
  fetcher?: (source: SourceSpec) => Promise<SourceDocument>;
}

export interface RunResult {
  report: PlatformWatchReport;
  metrics: PlatformWatchMetrics;
  stamp: PlatformWatchStamp;
  kg: PlatformWatchKg;
}

const PLATFORM_LABELS: Record<string, string> = {
  maltego: 'Maltego',
  shadowdragon: 'ShadowDragon',
  i2: "IBM i2 Analyst's Notebook",
  '1trace': '1TRACE',
  unknown: 'Unknown',
};

export async function runPlatformWatch(options: RunOptions): Promise<RunResult> {
  const sources = options.sources ?? PLATFORM_SOURCES;
  const fetcher = options.fetcher ?? fetchSource;
  const yyyymmdd = options.date.replace(/-/g, '');

  const documents = await Promise.all(sources.map((source) => fetcher(source)));
  const evidence = buildEvidence(documents, yyyymmdd);
  const claims = attachEvidenceToClaims(options.claims ?? [], evidence);
  const platforms = summarizePlatforms(evidence, claims);
  const drift = detectDrift(claims, evidence);
  const inputsHash = hashObject({ date: options.date, sources, evidence, claims });

  const report: PlatformWatchReport = {
    schema_version: 'platform-watch.report.v1',
    evidence_id: evidenceId('platform-watch', yyyymmdd, inputsHash.slice(0, 8)),
    date: options.date,
    summary: `Platform watch report for ${options.date}.`,
    evidence: evidence.sort((a, b) => a.id.localeCompare(b.id)),
    platforms: platforms.sort((a, b) => a.id.localeCompare(b.id)),
    claims: claims.sort((a, b) => a.id.localeCompare(b.id)),
    drift,
  };

  const metrics: PlatformWatchMetrics = {
    schema_version: 'platform-watch.metrics.v1',
    date: options.date,
    counts: {
      sources: sources.length,
      evidence: report.evidence.length,
      platforms: report.platforms.length,
      claims: report.claims.length,
      drift: report.drift.detected ? report.drift.reasons.length : 0,
    },
  };

  const stamp: PlatformWatchStamp = {
    schema_version: 'platform-watch.stamp.v1',
    date: options.date,
    inputs_hash: inputsHash,
  };

  const kg = buildKg(report);

  return { report, metrics, stamp, kg };
}

function buildEvidence(documents: SourceDocument[], yyyymmdd: string): EvidenceItem[] {
  return documents.map((doc) => {
    const normalized = normalizeDocument(doc);
    const item = toEvidenceItem(doc, normalized);
    const hash8 = normalized.contentHash.slice(0, 8);
    item.id = evidenceId(doc.source.platform, yyyymmdd, hash8);
    return item;
  });
}

function attachEvidenceToClaims(claims: ClaimItem[], evidence: EvidenceItem[]): ClaimItem[] {
  const evidenceByPlatform = new Map<string, string[]>();
  for (const item of evidence) {
    const list = evidenceByPlatform.get(item.platform) ?? [];
    list.push(item.id);
    evidenceByPlatform.set(item.platform, list);
  }

  return claims.map((claim) => {
    if (claim.evidence_refs && claim.evidence_refs.length > 0) return claim;
    return {
      ...claim,
      evidence_refs: (evidenceByPlatform.get(claim.platform) ?? []).slice().sort(),
    };
  });
}

function summarizePlatforms(evidence: EvidenceItem[], claims: ClaimItem[]): PlatformSummary[] {
  const platforms = new Map<string, PlatformSummary>();
  for (const item of evidence) {
    const current = platforms.get(item.platform) ?? {
      id: item.platform,
      name: PLATFORM_LABELS[item.platform] ?? item.platform,
      status: 'active',
      evidence_refs: [],
    };
    current.evidence_refs.push(item.id);
    platforms.set(item.platform, current);
  }
  for (const claim of claims) {
    if (platforms.has(claim.platform)) continue;
    platforms.set(claim.platform, {
      id: claim.platform,
      name: PLATFORM_LABELS[claim.platform] ?? claim.platform,
      status: 'active',
      evidence_refs: claim.evidence_refs ?? [],
    });
  }
  return Array.from(platforms.values()).map((entry) => ({
    ...entry,
    evidence_refs: entry.evidence_refs.slice().sort(),
  }));
}
