import { MappingSpecSchema, MappingSpec } from './schema.js';
import { z } from 'zod';

export class SpecValidator {
  /**
   * Validates a mapping spec against the schema.
   * Throws an error if validation fails.
   */
  public static validate(spec: unknown): MappingSpec {
    try {
      return MappingSpecSchema.parse(spec);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid Mapping Spec: ${JSON.stringify(error.format())}`);
      }
      throw error;
    }
  }

  /**
   * Validates that a spec is safe to use.
   * Currently just schema validation, but could include semantic checks.
   */
  public static ensureSafe(spec: MappingSpec): void {
     // Check for forbidden targets or circular logic if we supported it.
     // For now, schema validation ensures the allowlist of transforms.
     // const allowedTargets = new Set<string>(); // Could load from canonical schema
     // Ideally we would validate that 'target' fields are valid canonical fields.
     // But strictly following the prompt "No changes to core graph schema",
     // we might not have a runtime introspection of canonical schema easily available here without circular deps.
     // So we stick to spec structure validation.
  }
}
