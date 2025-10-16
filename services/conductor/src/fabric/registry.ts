import { BuildTaskSpec } from '../build/schema';
import { recordProvenance, hashObject } from '../provenance/ledger';

export type SafetyTier = 'baseline' | 'enhanced' | 'restricted';

export interface CapabilityRecord {
  id: string;
  modelId: string;
  provider: string;
  skills: string[];
  costUsdPer1KTokens: number;
  latencyMsP95: number;
  latencyMsP50?: number;
  contextWindow: number;
  safety: SafetyTier;
  dataResidency: string;
  maxParallel?: number;
  tags?: string[];
  evalScore?: number;
}

export interface CapabilityQuery {
  skills?: string[];
  maxLatencyMs?: number;
  budgetUsd?: number;
  residency?: string;
  safety?: SafetyTier;
}

export interface AoEBid {
  modelId: string;
  est: { quality: number; latencyMs: number; costUSD: number };
  confidence: number;
  fitTags: string[];
  rationale: string;
  sample?: string;
}

export class CapabilityRegistry {
  private readonly records = new Map<string, CapabilityRecord>();

  register(record: CapabilityRecord): void {
    this.records.set(record.id, record);
  }

  upsert(record: CapabilityRecord): void {
    this.records.set(record.id, record);
  }

  remove(id: string): void {
    this.records.delete(id);
  }

  list(query: CapabilityQuery = {}): CapabilityRecord[] {
    return [...this.records.values()].filter((record) => {
      if (
        query.skills &&
        !query.skills.every((skill) => record.skills.includes(skill))
      )
        return false;
      if (query.maxLatencyMs && record.latencyMsP95 > query.maxLatencyMs)
        return false;
      if (query.budgetUsd && record.costUsdPer1KTokens * 2 > query.budgetUsd)
        return false;
      if (query.residency && record.dataResidency !== query.residency)
        return false;
      if (query.safety && record.safety !== query.safety) return false;
      return true;
    });
  }

  topN(query: CapabilityQuery, n: number): CapabilityRecord[] {
    return this.list(query)
      .sort((a, b) => scoreRecord(b) - scoreRecord(a))
      .slice(0, n);
  }

  createAoEBids(spec: BuildTaskSpec, maxBids = 8): AoEBid[] {
    const relevantSkills = deriveSkills(spec);
    const candidates = this.topN(
      { skills: relevantSkills, maxLatencyMs: spec.constraints.latencyP95Ms },
      maxBids,
    );
    const bids = candidates.map((record) => {
      const coverage = coverageScore(record.skills, relevantSkills);
      const quality = (record.evalScore ?? 0.7) * coverage;
      const fitTags = [...new Set([...record.skills, ...(record.tags || [])])];
      const rationale = `Matches ${coverage.toFixed(2)} of required skills with eval ${record.evalScore ?? 0.7}`;
      const bid: AoEBid = {
        modelId: record.modelId,
        est: {
          quality,
          latencyMs: record.latencyMsP95,
          costUSD:
            ((spec.constraints.contextTokensMax || 2000) / 1000) *
            record.costUsdPer1KTokens,
        },
        confidence: Math.min(1, (record.evalScore ?? 0.6) * coverage + 0.1),
        fitTags,
        rationale,
      };
      return bid;
    });

    recordProvenance({
      reqId: spec.taskId,
      step: 'router',
      inputHash: hashObject(relevantSkills),
      outputHash: hashObject(bids),
      policy: {
        retention: spec.policy.retention,
        purpose: spec.policy.purpose,
        licenseClass: spec.policy.licenseClass,
      },
      time: { start: new Date().toISOString(), end: new Date().toISOString() },
      tags: ['aoe', 'bid'],
    });

    return bids;
  }
}

export function coverageScore(skills: string[], required: string[]): number {
  if (!required.length) return 1;
  const hits = required.filter((skill) => skills.includes(skill)).length;
  return hits / required.length;
}

export function deriveSkills(spec: BuildTaskSpec): string[] {
  const skills = new Set<string>();
  for (const target of spec.targets) {
    if (target.job) skills.add(target.job);
    if (target.module) skills.add(target.module);
  }
  for (const ac of spec.acceptanceCriteria) {
    if (ac.metric) skills.add(ac.metric);
    if (/cve/i.test(ac.statement)) skills.add('security');
    if (/coverage/i.test(ac.statement)) skills.add('coverage');
  }
  if (/helm/i.test(spec.goal)) skills.add('helm');
  if (/jest/i.test(spec.goal)) skills.add('jest');
  return [...skills];
}

function scoreRecord(record: CapabilityRecord): number {
  const quality = record.evalScore ?? 0.7;
  const latency = record.latencyMsP95 || 800;
  const cost = record.costUsdPer1KTokens || 0.02;
  return quality / Math.max(0.1, cost * latency);
}
