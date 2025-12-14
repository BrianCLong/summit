import { PolicyService } from './PolicyService.js';
import { AuditService } from './AuditService.js';
import { ClassificationEngine } from '../../pii/classifier.js';

export class LLMSafetyService {
  private static classifier = new ClassificationEngine();

  /**
   * Sanitizes a prompt before sending to an LLM.
   * Returns redacted prompt and list of redactions.
   */
  static async sanitizePrompt(prompt: string, user: any): Promise<{ safePrompt: string; redacted: boolean }> {
    // 1. Check Policy
    const decision = await PolicyService.evaluate({
      action: 'llm.prompt',
      user,
      resource: { type: 'prompt', content: prompt }
    });

    if (!decision.allow) {
      throw new Error(`LLM Prompt blocked: ${decision.reason}`);
    }

    // 2. Scan for PII/Sensitive Data
    const classification = await this.classifier.classify(prompt, { value: prompt });

    // 3. Redact if high sensitivity
    let safePrompt = prompt;
    let redacted = false;

    // Sort entities by start index descending to replace without messing up indices
    const entities = classification.entities.sort((a, b) => b.start - a.start);

    for (const entity of entities) {
        if (entity.severity === 'high' || entity.severity === 'critical') {
            safePrompt = safePrompt.substring(0, entity.start) +
                         `[REDACTED:${entity.type}]` +
                         safePrompt.substring(entity.end);
            redacted = true;
        }
    }

    if (redacted) {
        await AuditService.log({
            userId: user.id,
            action: 'LLM_PROMPT_REDACTION',
            resourceType: 'prompt',
            details: { originalLength: prompt.length, redactedEntities: entities.length }
        });
    }

    return { safePrompt, redacted };
  }
}
