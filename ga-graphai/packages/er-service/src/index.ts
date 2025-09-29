import { randomUUID } from 'node:crypto';
import type {
  AuditEntry,
  CandidateRequest,
  CandidateResponse,
  CandidateScore,
  EntityRecord,
  ExplainResponse,
  MergeRecord,
  MergeRequest
} from './types.js';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(token => setB.has(token));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function phoneticSignature(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) {
    return '';
  }
  const first = cleaned[0];
  const consonants = cleaned.replace(/[aeiou]/g, '');
  return `${first}${consonants.slice(0, 3)}`;
}

function semanticSimilarity(a: EntityRecord, b: EntityRecord): number {
  const keys = new Set([...Object.keys(a.attributes), ...Object.keys(b.attributes)]);
  let matches = 0;
  for (const key of keys) {
    if (a.attributes[key] && a.attributes[key] === b.attributes[key]) {
      matches += 1;
    }
  }
  return keys.size === 0 ? 0 : matches / keys.size;
}

function propertyOverlap(a: EntityRecord, b: EntityRecord): number {
  const keysA = Object.keys(a.attributes);
  const keysB = Object.keys(b.attributes);
  const overlap = keysA.filter(key => keysB.includes(key));
  return Math.max(overlap.length / Math.max(keysA.length, keysB.length, 1), 0);
}

function buildCandidateScore(entity: EntityRecord, candidate: EntityRecord): CandidateScore {
  const nameTokensA = tokenize(entity.name);
  const nameTokensB = tokenize(candidate.name);
  const jaccard = jaccardSimilarity(nameTokensA, nameTokensB);
  const editDistance = normalizedLevenshtein(entity.name.toLowerCase(), candidate.name.toLowerCase());
  const nameSimilarity = Math.max(jaccard, editDistance);
  const features = {
    nameSimilarity,
    typeMatch: entity.type === candidate.type,
    propertyOverlap: propertyOverlap(entity, candidate),
    semanticSimilarity: semanticSimilarity(entity, candidate),
    phoneticSimilarity:
      phoneticSignature(entity.name) === phoneticSignature(candidate.name) ? 1 : 0,
    editDistance
  };
  const score =
    features.nameSimilarity * 0.35 +
    (features.typeMatch ? 0.2 : 0) +
    features.propertyOverlap * 0.15 +
    features.semanticSimilarity * 0.2 +
    features.phoneticSimilarity * 0.05 +
    features.editDistance * 0.05;
  const rationale = [
    `Name similarity ${(features.nameSimilarity * 100).toFixed(1)}%`,
    `Type ${features.typeMatch ? 'matches' : 'differs'}`,
    `Property overlap ${(features.propertyOverlap * 100).toFixed(1)}%`
  ];
  if (features.semanticSimilarity > 0) {
    rationale.push(`Semantic match ${(features.semanticSimilarity * 100).toFixed(1)}%`);
  }
  if (features.phoneticSimilarity === 1) {
    rationale.push('Phonetic signature aligned');
  }
  return {
    entityId: candidate.id,
    score: Number(score.toFixed(3)),
    features,
    rationale
  };
}

export class EntityResolutionService {
  private readonly merges = new Map<string, MergeRecord>();
  private readonly explanations = new Map<string, ExplainResponse>();
  private readonly auditLog: AuditEntry[] = [];

  constructor(private readonly clock: () => Date = () => new Date()) {}

  getAuditLog(): readonly AuditEntry[] {
    return this.auditLog;
  }

  getMerge(mergeId: string): MergeRecord | undefined {
    return this.merges.get(mergeId);
  }

  candidates(request: CandidateRequest): CandidateResponse {
    const topK = request.topK ?? 5;
    const population = request.population.filter(candidate => candidate.tenantId === request.tenantId);
    const scored = population
      .filter(candidate => candidate.id !== request.entity.id)
      .map(candidate => buildCandidateScore(request.entity, candidate))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return {
      requestId: randomUUID(),
      candidates: scored
    };
  }

  merge(request: MergeRequest, featureSource: CandidateScore): MergeRecord {
    const mergeId = randomUUID();
    const record: MergeRecord = {
      mergeId,
      tenantId: request.tenantId,
      primaryId: request.primaryId,
      duplicateId: request.duplicateId,
      actor: request.actor,
      reason: request.reason,
      policyTags: request.policyTags,
      mergedAt: this.clock().toISOString(),
      reversible: true
    };
    this.merges.set(mergeId, record);
    this.auditLog.push({
      id: randomUUID(),
      tenantId: request.tenantId,
      actor: request.actor,
      event: 'merge',
      target: mergeId,
      reason: request.reason,
      createdAt: record.mergedAt
    });
    this.explanations.set(mergeId, {
      mergeId,
      features: featureSource.features,
      rationale: [...featureSource.rationale, `Final score ${featureSource.score}`],
      policyTags: request.policyTags,
      createdAt: record.mergedAt
    });
    return record;
  }

  revertMerge(mergeId: string, actor: string, reason: string): void {
    const record = this.merges.get(mergeId);
    if (!record) {
      throw new Error(`Merge ${mergeId} not found`);
    }
    if (!record.reversible) {
      throw new Error(`Merge ${mergeId} is locked`);
    }
    this.merges.delete(mergeId);
    this.auditLog.push({
      id: randomUUID(),
      tenantId: record.tenantId,
      actor,
      event: 'revert',
      target: mergeId,
      reason,
      createdAt: this.clock().toISOString()
    });
  }

  explain(mergeId: string): ExplainResponse {
    const explanation = this.explanations.get(mergeId);
    if (!explanation) {
      throw new Error(`Explanation for merge ${mergeId} not found`);
    }
    return explanation;
  }
}

export type {
  AuditEntry,
  CandidateRequest,
  CandidateResponse,
  CandidateScore,
  EntityRecord,
  ExplainResponse,
  MergeRecord,
  MergeRequest
} from './types.js';
