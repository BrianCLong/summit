
import { SafetyGuardrail, LLMRequest, LLMResult } from '../interfaces.js';

export class PIIGuardrail implements SafetyGuardrail {
  name = 'pii-guardrail';

  async preProcess(request: LLMRequest): Promise<LLMRequest> {
    // Basic redaction (stub)
    // In a real scenario, this would use a regex or a dedicated PII service
    if (request.prompt && request.prompt.includes('SECRET_KEY')) {
         return {
             ...request,
             prompt: request.prompt.replace(/SECRET_KEY/g, '[REDACTED]'),
             metadata: { ...request.metadata, redacted: true }
         };
    }
    return request;
  }

  async postProcess(request: LLMRequest, result: LLMResult): Promise<LLMResult> {
    // Post-call check
    if (result.text && result.text.includes('SECRET_KEY')) {
        return {
            ...result,
            text: result.text.replace(/SECRET_KEY/g, '[REDACTED]'),
            metadata: { ...result.metadata, redacted: true }
        };
    }
    return result;
  }
}
