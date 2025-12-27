/**
 * Zero-Knowledge Deconfliction Service
 * Export all core functionality
 */

export { CommitmentGenerator } from './commitment.js';
export { ZKSetProof } from './proof.js';
export { AuditLogger } from './audit.js';
export { ZkdMetrics } from './metrics.js';
export { guardDeconflictRequest, SafetyError } from './safety.js';
export { app as server } from './server.js';
export type {
  Salt,
  Commitment,
  CommitmentSet,
  DeconflictRequest,
  DeconflictResponse,
  AuditLogEntry,
  DeconflictRevealMode,
} from './types.js';
