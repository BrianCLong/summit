export interface AgentFeedback {
  agentId: string;
  action: string;
  result: unknown;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class FeedbackValidator {
  private allowedActions = new Set(['code_review', 'deployment', 'policy_update', 'security_scan']);

  validate(feedback: AgentFeedback): ValidationResult {
    const errors: string[] = [];

    if (!feedback.agentId) {
      errors.push('agentId is required');
    }

    if (feedback.confidence < 0 || feedback.confidence > 1) {
      errors.push('confidence must be between 0 and 1');
    }

    if (!this.allowedActions.has(feedback.action)) {
      errors.push(`action '${feedback.action}' is not in allowed set`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
