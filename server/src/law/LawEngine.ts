import { Law, Context, ValidationResult, Refusal } from './types.js';
import { RefusalService } from './RefusalService.js';
import { randomUUID } from 'crypto';

export class LawEngine {
  private laws: Law[] = [];
  private static instance: LawEngine;

  private constructor() {}

  public static getInstance(): LawEngine {
    if (!LawEngine.instance) {
      LawEngine.instance = new LawEngine();
    }
    return LawEngine.instance;
  }

  public registerLaw(law: Law) {
    this.laws.push(law);
  }

  public getLaws(): Law[] {
    return this.laws;
  }

  public async evaluate(context: Context): Promise<ValidationResult> {
    const violations: Refusal[] = [];

    for (const law of this.laws) {
      try {
        const result = await law.enforce(context);
        if (!result.allowed) {
            // Flatten violations if the law returns multiple, or create one if it returns single result structure
            // In our simple type, `ValidationResult` contains `violations`.
            violations.push(...result.violations);
        }
      } catch (error: any) {
        // System error during enforcement is a FAIL CLOSED event
        violations.push({
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          lawId: law.id,
          reason: `System Error during enforcement: ${error.message}`,
          context: context
        });
      }
    }

    if (violations.length > 0) {
      // Log all refusals
      for (const v of violations) {
        await RefusalService.getInstance().logRefusal(v);
      }
      return { allowed: false, violations };
    }

    return { allowed: true, violations: [] };
  }
}
