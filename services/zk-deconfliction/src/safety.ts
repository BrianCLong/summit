import type { DeconflictRequest, DeconflictRevealMode } from './types.js';
import type { DenialReason } from './metrics.js';

export interface SafetyConfig {
  maxSetSize: number;
  maxCommitmentLength: number;
}

export class SafetyError extends Error {
  constructor(
    public readonly reason: DenialReason,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
  }
}

export function guardDeconflictRequest(
  request: DeconflictRequest & { revealMode: DeconflictRevealMode },
  config: SafetyConfig,
): void {
  if (!request.tenantAId || !request.tenantBId) {
    throw new SafetyError('invalid_tenant', 'tenant identifiers are required');
  }

  if (
    request.tenantACommitments.length === 0 ||
    request.tenantBCommitments.length === 0
  ) {
    throw new SafetyError(
      'empty_commitments',
      'commitment sets must not be empty',
    );
  }

  if (
    request.tenantACommitments.length > config.maxSetSize ||
    request.tenantBCommitments.length > config.maxSetSize
  ) {
    throw new SafetyError(
      'max_set_size',
      `commitment sets may not exceed ${config.maxSetSize} entries`,
    );
  }

  const combinedCommitments = [
    ...request.tenantACommitments,
    ...request.tenantBCommitments,
  ];

  const hasInvalidCommitment = combinedCommitments.some(
    (commitment) =>
      !commitment || commitment.length > config.maxCommitmentLength,
  );
  if (hasInvalidCommitment) {
    throw new SafetyError(
      'invalid_commitment',
      `commitments must be non-empty strings <= ${config.maxCommitmentLength} chars`,
    );
  }

  if (request.revealMode !== 'cardinality') {
    throw new SafetyError('unsupported_mode', 'only cardinality mode is allowed');
  }
}
