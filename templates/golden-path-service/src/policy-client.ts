import axios from 'axios';
import { logger } from './middleware/logging.js';
import { config } from './config.js';

export type PolicyDecision = {
  allow: boolean;
  stepUpRequired?: boolean;
  reason?: string;
};

export type PolicyEvaluator = (
  user: Record<string, unknown>,
  resource: Record<string, unknown>,
  action: Record<string, unknown>,
  context: Record<string, unknown>
) => Promise<PolicyDecision>;

export const checkAccess: PolicyEvaluator = async (user, resource, action, context) => {
  try {
    const response = await axios.post(config.policyEndpoint, { input: { user, resource, action, context } });
    return {
      allow: Boolean(response.data?.result?.allow),
      stepUpRequired: Boolean(response.data?.result?.step_up_required),
      reason: response.data?.result?.reason
    };
  } catch (error) {
    logger.error({ err: error }, 'policy check failed');
    return { allow: false, reason: 'policy_evaluation_error' };
  }
};
