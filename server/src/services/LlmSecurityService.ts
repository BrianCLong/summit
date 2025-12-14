import { Principal, policyService, PolicyContext } from './PolicyService.js';
import { dlpService, DLPContext } from './DLPService.js';
import logger from '../utils/logger.js';

export interface LlmSecurityContext {
  tenantId: string;
  principal: Principal;
  purpose: "rag" | "analysis" | "enrichment" | "automation" | "other";
  dataSensitivity: "public" | "internal" | "confidential" | "restricted";
}

export class LlmSecurityService {
  private static instance: LlmSecurityService;

  private constructor() {}

  public static getInstance(): LlmSecurityService {
    if (!LlmSecurityService.instance) {
      LlmSecurityService.instance = new LlmSecurityService();
    }
    return LlmSecurityService.instance;
  }

  /**
   * Pre-flight check before sending data to LLM.
   * Checks policy, cost limits (placeholder), and detects PII/Secrets.
   */
  async validatePrompt(
    prompt: string,
    context: LlmSecurityContext,
    model: string
  ): Promise<{ allowed: boolean; redactedPrompt: string; reason?: string }> {

    // 1. Policy Check (e.g. is model allowed for this purpose/tenant?)
    const policyCtx: PolicyContext = {
      principal: context.principal,
      resource: {
        type: 'llm_model',
        id: model,
        tenantId: context.tenantId,
        purpose: context.purpose,
        sensitivity: context.dataSensitivity
      },
      action: 'invoke_llm',
      environment: {
        time: new Date().toISOString()
      }
    };

    const decision = await policyService.evaluate(policyCtx);
    if (!decision.allow) {
      return { allowed: false, redactedPrompt: '', reason: decision.reason || 'Policy denied LLM access' };
    }

    // 2. DLP Scan on Prompt (prevent leaking PII/Secrets to LLM)
    const dlpCtx: DLPContext = {
      userId: context.principal.id,
      tenantId: context.tenantId,
      userRole: context.principal.role,
      operationType: 'export', // Sending to external LLM is effectively an export
      contentType: 'llm_prompt',
      metadata: {
        model,
        purpose: context.purpose
      }
    };

    try {
      const scanResults = await dlpService.scanContent(prompt, dlpCtx);

      // If any blocking action is recommended
      const hasBlocking = scanResults.some(r =>
        r.matched && r.recommendedActions.some(a => a.type === 'block')
      );

      if (hasBlocking) {
         // Emit security event
         logger.warn('LLM prompt blocked by DLP', { context, model });
         return { allowed: false, redactedPrompt: '', reason: 'DLP violation: prompt contains sensitive data' };
      }

      // Apply redactions if recommended
      const { processedContent } = await dlpService.applyActions(prompt, scanResults, dlpCtx);
      let finalPrompt = typeof processedContent === 'string' ? processedContent : JSON.stringify(processedContent);

      return { allowed: true, redactedPrompt: finalPrompt };

    } catch (e) {
      logger.error('DLP scan error during LLM pre-flight', e);
      // Fail closed
      return { allowed: false, redactedPrompt: '', reason: 'Security check failed' };
    }
  }

  /**
   * Post-processing on LLM response (optional, e.g. checking for hallucinations of PII)
   */
  async validateResponse(response: string, context: LlmSecurityContext): Promise<string> {
      // similar DLP check
      return response;
  }
}

export const llmSecurityService = LlmSecurityService.getInstance();
