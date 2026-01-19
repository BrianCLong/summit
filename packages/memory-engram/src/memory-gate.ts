import { Canonicalizer } from './canonicalizer.js';
import { EngramRecord } from './store.js';

export interface MemoryGateOptions {
  canonicalizer?: Canonicalizer;
  threshold?: number;
  policyEvaluator?: MemoryPolicyEvaluator;
}

export interface MemoryGateExplanation {
  score: number;
  reasons: string[];
}

export interface MemoryGateResult {
  gated: Array<EngramRecord & { gate: MemoryGateExplanation }>;
  rejected: Array<EngramRecord & { gate: MemoryGateExplanation }>;
}

export interface MemoryPolicyDecision {
  allowed: boolean;
  reasons: string[];
}

export interface MemoryPolicyEvaluator {
  evaluate(input: MemoryPolicyInput): MemoryPolicyDecision;
}

export interface MemoryPolicyInput {
  tenantId: string;
  policyTags: string[];
  phase: string;
}

class AllowAllPolicy implements MemoryPolicyEvaluator {
  evaluate(): MemoryPolicyDecision {
    return { allowed: true, reasons: [] };
  }
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function jaccardOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class MemoryGate {
  private readonly canonicalizer: Canonicalizer;
  private readonly threshold: number;
  private readonly policyEvaluator: MemoryPolicyEvaluator;

  constructor(options: MemoryGateOptions = {}) {
    this.canonicalizer = options.canonicalizer ?? new Canonicalizer();
    this.threshold = options.threshold ?? 0.55;
    this.policyEvaluator = options.policyEvaluator ?? new AllowAllPolicy();
  }

  score(query: string, phase: string, record: EngramRecord): MemoryGateExplanation {
    const queryTokens = this.canonicalizer.tokenize(query);
    const recordTokens = this.canonicalizer.tokenize(record.canonicalKey);

    const overlap = jaccardOverlap(queryTokens, recordTokens);
    const provenanceScore = record.provenance.confidence ?? 0.5;
    const policyDecision = this.policyEvaluator.evaluate({
      tenantId: record.tenantId,
      policyTags: record.policyTags,
      phase,
    });

    const policyBoost = policyDecision.allowed ? 0.2 : -1.0;
    const score = sigmoid(overlap * 2 + provenanceScore + policyBoost);

    const reasons: string[] = [];
    if (overlap > 0) {
      reasons.push('lexical-overlap');
    }
    if (provenanceScore >= 0.8) {
      reasons.push('high-provenance');
    }
    if (policyDecision.allowed) {
      reasons.push('policy-allowed');
    } else {
      reasons.push('policy-blocked');
    }
    for (const reason of policyDecision.reasons) {
      reasons.push(`policy:${reason}`);
    }

    return { score, reasons };
  }

  evaluate(query: string, phase: string, candidates: EngramRecord[]): MemoryGateResult {
    const gated: Array<EngramRecord & { gate: MemoryGateExplanation }> = [];
    const rejected: Array<EngramRecord & { gate: MemoryGateExplanation }> = [];

    for (const record of candidates) {
      const gate = this.score(query, phase, record);
      const policyDecision = this.policyEvaluator.evaluate({
        tenantId: record.tenantId,
        policyTags: record.policyTags,
        phase,
      });

      if (!policyDecision.allowed || gate.score < this.threshold) {
        rejected.push({ ...record, gate });
      } else {
        gated.push({ ...record, gate });
      }
    }

    return { gated, rejected };
  }
}
