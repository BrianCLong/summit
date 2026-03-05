
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger.js';

export interface OpaDecision {
  risk_level: 'autonomous' | 'hitl' | 'prohibited';
  required_approvals: number;
  approver_roles: string[];
  requires_audit: boolean;
  reason: string;
}

export class OpaClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.OPA_URL || 'http://localhost:8181';
    this.timeout = parseInt(process.env.OPA_TIMEOUT_MS || '5000');
  }

  async evaluate(input: any): Promise<OpaDecision> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/data/chatops/risk/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': uuidv4(),
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`OPA error: ${response.status} ${response.statusText}`);
      }

      const body = await response.json();

      // If OPA policy is missing or returns nothing, fail safe to HITL
      if (!body.result) {
        return {
          risk_level: 'hitl',
          required_approvals: 1,
          approver_roles: ['supervisor'],
          requires_audit: true,
          reason: 'OPA returned no result, falling back to safe default (HITL)',
        };
      }

      return body.result;
    } catch (error: any) {
      logger.error('OPA evaluation failed, falling back to safe defaults', { error: error.message });
      return {
        risk_level: 'hitl',
        required_approvals: 1,
        approver_roles: ['supervisor'],
        requires_audit: true,
        reason: `OPA communication error: ${error.message}, falling back to HITL`,
      };
    }
  }
}
