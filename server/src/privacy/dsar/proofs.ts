import * as crypto from 'crypto';
import type { ConnectorSnapshot } from './types';

const sortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
};

export const hashDeterministic = (value: unknown): string => {
  const normalized = JSON.stringify(sortObject(value));
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

export interface RectificationProof {
  requestId: string;
  connector: string;
  beforeHash: string;
  afterHash: string;
  afterSnapshot: ConnectorSnapshot;
  changes: Record<string, unknown>;
}

export const buildRectificationProof = (
  requestId: string,
  connector: string,
  before: ConnectorSnapshot,
  after: ConnectorSnapshot,
  changes: Record<string, unknown>,
): RectificationProof => ({
  requestId,
  connector,
  beforeHash: hashDeterministic(before),
  afterHash: hashDeterministic(after),
  afterSnapshot: after,
  changes,
});

export const validateRectificationProof = (proof: RectificationProof): boolean => {
  if (!proof.afterSnapshot) {
    return false;
  }
  const recomputedAfter = hashDeterministic(proof.afterSnapshot);
  return recomputedAfter === proof.afterHash && proof.afterHash !== proof.beforeHash;
};

export interface DeletionProof {
  requestId: string;
  connector: string;
  subjectId: string;
  subjectHash: string;
  remainingSubjectIds: string[];
  subjectListHash: string;
  dataHash: string;
}

export const buildDeletionProof = (
  requestId: string,
  connector: string,
  subjectId: string,
  snapshot: ConnectorSnapshot,
): DeletionProof => ({
  requestId,
  connector,
  subjectId,
  subjectHash: hashDeterministic(subjectId),
  remainingSubjectIds: [...snapshot.subjectIds],
  subjectListHash: hashDeterministic(snapshot.subjectIds),
  dataHash: hashDeterministic(snapshot.data),
});

export const validateDeletionProof = (proof: DeletionProof): boolean => {
  const subjectMissing = !proof.remainingSubjectIds.includes(proof.subjectId);
  const listHashMatches = hashDeterministic(proof.remainingSubjectIds) === proof.subjectListHash;
  return subjectMissing && listHashMatches && typeof proof.dataHash === 'string' && proof.dataHash.length === 64;
};

export const validateDeletionProofAgainstSnapshot = (
  proof: DeletionProof,
  snapshot: ConnectorSnapshot,
): boolean => {
  const subjectMissing = !snapshot.subjectIds.includes(proof.subjectId);
  const subjectListHashMatches = hashDeterministic(snapshot.subjectIds) === proof.subjectListHash;
  const dataHashMatches = hashDeterministic(snapshot.data) === proof.dataHash;
  return subjectMissing && subjectListHashMatches && dataHashMatches;
};

export const validateDeletionProofs = (proofs: DeletionProof[], subjectId: string): boolean =>
  proofs.every((proof) => validateDeletionProof(proof) && proof.subjectId === subjectId);
