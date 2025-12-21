import { inlineValidationSchema, integrationConfigSchema, ValidationResult } from './events.js';

export class GuidedSetupValidator {
  validateWorkspace(payload: unknown): ValidationResult {
    const result = inlineValidationSchema.safeParse(payload);
    if (result.success) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }

  validateIntegration(payload: unknown): ValidationResult {
    const result = integrationConfigSchema.safeParse(payload);
    if (result.success) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }
}
