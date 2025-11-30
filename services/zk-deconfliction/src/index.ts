/**
 * Zero-Knowledge Deconfliction Service
 * Export all core functionality
 */

export { CommitmentGenerator } from './commitment.js';
export { ZKSetProof } from './proof.js';
export { AuditLogger } from './audit.js';
export { app as server } from './server.js';
export type {
  Salt,
  Commitment,
  CommitmentSet,
  DeconflictRequest,
  DeconflictResponse,
  AuditLogEntry,
} from './types.js';
