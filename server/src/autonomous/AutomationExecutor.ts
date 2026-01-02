import { Logger } from 'pino';
import { GuardrailService } from './GuardrailService';
import { ApprovalService } from './ApprovalService';
import { Action } from './ApprovalService';

export interface AutomationResult {
  success: boolean;
  actionId?: string;
  approvalId?: string;
  error?: string;
}

export class AutomationExecutor {
  private guardrailService: GuardrailService;
  private approvalService: ApprovalService;
  private logger: Logger;

  constructor(
    guardrailService: GuardrailService,
    approvalService: ApprovalService,
    logger: Logger
  ) {
    this.guardrailService = guardrailService;
    this.approvalService = approvalService;
    this.logger = logger;
  }

  /**
   * Executes an autonomous action safely.
   * Checks guardrails and approval requirements before execution.
   */
  async executeAction(action: Action): Promise<AutomationResult> {
    const { type, tenantId } = action;

    // 1. Guardrail Check
    const guardrailCheck = await this.guardrailService.checkGuardrails({
      actionType: type,
      tenantId: tenantId,
      payload: action.payload,
    });

    if (!guardrailCheck.allowed) {
      this.logger.warn({ action, reason: guardrailCheck.reason }, 'Action blocked by guardrails');
      return { success: false, error: guardrailCheck.reason };
    }

    // 2. Determine if Approval is Required
    // For this sprint, "Scaling" and "Traffic Shaping" beyond standard limits might need approval.
    // We'll assume specific types require approval.
    if (this.requiresApproval(action)) {
       const approvalId = await this.approvalService.requestApproval(action);
       this.logger.info({ action, approvalId }, 'Action requires approval, request created');
       return { success: false, approvalId };
    }

    // 3. Execution (Simulated)
    try {
        await this.performAction(action);
        this.logger.info({ action }, 'Action executed successfully');
        return { success: true };
    } catch (error: any) {
        this.logger.error({ action, error }, 'Action execution failed');
        // 4. Rollback (Simulated)
        await this.rollback(action);
        return { success: false, error: error.message };
    }
  }

  /**
   * Defines which actions require human approval.
   */
  private requiresApproval(action: Action): boolean {
    const approvalRequiredTypes = [
        'suggest_scale_up', // Always suggest first
        'prioritize_traffic', // Traffic shaping might impact others
    ];

    // Also check payload thresholds if needed
    if (action.type === 'throttle_tenant' && action.payload.severity === 'high') {
        return true;
    }

    return approvalRequiredTypes.includes(action.type);
  }

  /**
   * Performs the actual operational action.
   */
  private async performAction(action: Action): Promise<void> {
    // In a real system, this would call various services (AWS SDK, K8s API, etc.)
    // For now, we simulate the logic.
    switch (action.type) {
        case 'throttle_tenant':
            // await rateLimiter.setLimit(action.tenantId, action.payload.limit);
            break;
        case 'circuit_reset':
            // await circuitBreaker.reset(action.payload.serviceId);
            break;
        case 'auto_retry':
            // await retryQueue.add(action.payload.jobId);
            break;
        case 'suggest_scale_up':
            // This is just a suggestion, so "execution" is just logging/notifying
            // But since we flagged it as requiring approval, actual execution happens after approval.
            break;
        default:
            if (action.type.startsWith('test_')) return; // For testing
            throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Rolls back an action in case of failure.
   */
  private async rollback(action: Action): Promise<void> {
      this.logger.info({ action }, 'Rolling back action');
      // specific rollback logic per type
  }
}
