import { PolicyAction } from './types.js';

export interface GovernanceErrorOptions {
  code: string;
  message: string;
  action?: PolicyAction;
  policyId?: string;
  status?: number;
  details?: Record<string, any>;
}

export class GovernanceError extends Error {
  public readonly code: string;
  public readonly action: PolicyAction;
  public readonly policyId?: string;
  public readonly status: number;
  public readonly details?: Record<string, any>;

  constructor(options: GovernanceErrorOptions) {
    super(options.message);
    this.name = 'GovernanceError';
    this.code = options.code;
    this.action = options.action || 'DENY';
    this.policyId = options.policyId;
    this.status = options.status || 403;
    this.details = options.details;
  }
}
