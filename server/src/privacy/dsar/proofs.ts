import * as crypto from 'crypto';
import type { ConnectorSnapshot } from './types';

/**
 * Sorts object keys recursively to ensure deterministic JSON stringification.
 *
 * @param value - The value to sort.
 * @returns The sorted value.
 */
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

/**
 * Computes a deterministic SHA-256 hash of a value by sorting its keys first.
 *
 * @param value - The value to hash.
 * @returns The hex string representation of the hash.
 */
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

/**
 * Builds a cryptographic proof of data rectification (update).
 *
 * @param requestId - The DSAR request ID.
 * @param connector - The name of the connector where data resides.
 * @param before - Snapshot of data before the change.
 * @param after - Snapshot of data after the change.
 * @param changes - The changes applied.
 * @returns A RectificationProof object.
 */
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

/**
 * Validates a rectification proof by recomputing hashes.
 *
 * @param proof - The proof to validate.
 * @returns True if the proof is valid.
 */
export const validateRectificationProof = (
  proof: RectificationProof,
): boolean => {
  if (!proof.afterSnapshot) {
    return false;
  }
  const recomputedAfter = hashDeterministic(proof.afterSnapshot);
  return (
    recomputedAfter === proof.afterHash && proof.afterHash !== proof.beforeHash
  );
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

/**
 * Builds a cryptographic proof of data deletion.
 *
 * @param requestId - The DSAR request ID.
 * @param connector - The name of the connector.
 * @param subjectId - The ID of the subject whose data was deleted.
 * @param snapshot - Snapshot of the data after deletion.
 * @returns A DeletionProof object.
 */
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

/**
 * Validates a deletion proof by checking internal consistency.
 * Verifies that the subject ID is not in the remaining list and hashes match.
 *
 * @param proof - The proof to validate.
 * @returns True if the proof is consistent.
 */
export const validateDeletionProof = (proof: DeletionProof): boolean => {
  const subjectMissing = !proof.remainingSubjectIds.includes(proof.subjectId);
  const listHashMatches =
    hashDeterministic(proof.remainingSubjectIds) === proof.subjectListHash;
  return (
    subjectMissing &&
    listHashMatches &&
    typeof proof.dataHash === 'string' &&
    proof.dataHash.length === 64
  );
};

/**
 * Validates a deletion proof against an actual data snapshot.
 *
 * @param proof - The proof to validate.
 * @param snapshot - The actual snapshot of data state.
 * @returns True if the proof matches the snapshot.
 */
export const validateDeletionProofAgainstSnapshot = (
  proof: DeletionProof,
  snapshot: ConnectorSnapshot,
): boolean => {
  const subjectMissing = !snapshot.subjectIds.includes(proof.subjectId);
  const subjectListHashMatches =
    hashDeterministic(snapshot.subjectIds) === proof.subjectListHash;
  const dataHashMatches = hashDeterministic(snapshot.data) === proof.dataHash;
  return subjectMissing && subjectListHashMatches && dataHashMatches;
};

/**
 * Validates a collection of deletion proofs for a specific subject.
 *
 * @param proofs - The array of proofs to validate.
 * @param subjectId - The expected subject ID.
 * @returns True if all proofs are valid and correspond to the subject.
 */
export const validateDeletionProofs = (
  proofs: DeletionProof[],
  subjectId: string,
): boolean =>
  proofs.every(
    (proof) => validateDeletionProof(proof) && proof.subjectId === subjectId,
  );
