
import { z } from 'zod';
import { logger } from '../utils/logger.js';

export enum CopilotActionType {
  RECOMMEND = 'recommend',
  EXECUTE = 'execute',
  QUERY = 'query',
}

export interface CopilotContext {
  userId: string;
  tenantId: string;
  roles: string[];
}

export interface CopilotAction {
  type: CopilotActionType;
  resource: string;
  payload: any;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  modifications?: any;
}

export class CopilotPolicyService {
  private static instance: CopilotPolicyService;

  private constructor() {}

  static getInstance(): CopilotPolicyService {
    if (!CopilotPolicyService.instance) {
      CopilotPolicyService.instance = new CopilotPolicyService();
    }
    return CopilotPolicyService.instance;
  }

  async checkPolicy(action: CopilotAction, context: CopilotContext): Promise<PolicyResult> {
    logger.info(`Checking policy for action: ${action.type} on ${action.resource} by ${context.userId}`);

    // 1. Tenant Isolation
    if (!context.tenantId) {
      return { allowed: false, reason: 'Missing tenant context' };
    }

    // 2. "Recommend vs Execute" Boundary
    if (action.type === CopilotActionType.EXECUTE) {
      if (!this.canExecute(context, action)) {
        return { allowed: false, reason: 'User not authorized for automated execution on this resource' };
      }

      // Force dry-run if not explicitly confirmed (mock logic)
      if (!action.payload.confirmed) {
         return { allowed: false, reason: 'Execution requires explicit confirmation' };
      }
    }

    // 3. Sensitive Resource Protection
    if (this.isSensitiveResource(action.resource)) {
      if (action.type !== CopilotActionType.QUERY && !context.roles.includes('admin')) {
         return { allowed: false, reason: 'Modification of sensitive resource requires admin role' };
      }
    }

    return { allowed: true };
  }

  private canExecute(context: CopilotContext, action: CopilotAction): boolean {
    // Only allow specific roles to execute actions directly
    const allowedRoles = ['admin', 'operator', 'on-call'];
    const hasRole = context.roles.some(role => allowedRoles.includes(role));

    // Low risk actions might be allowed for everyone (mock)
    const isLowRisk = action.resource.startsWith('report:') || action.resource.startsWith('draft:');

    return hasRole || isLowRisk;
  }

  private isSensitiveResource(resource: string): boolean {
    const sensitivePrefixes = ['config:', 'iam:', 'secrets:', 'db:schema'];
    return sensitivePrefixes.some(prefix => resource.startsWith(prefix));
  }
}

export const copilotPolicy = CopilotPolicyService.getInstance();
