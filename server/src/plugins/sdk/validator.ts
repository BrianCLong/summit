import { z } from 'zod';
import { PluginManifestSchema, PluginManifest } from './types.js';

export class ManifestValidator {
  static validate(manifest: unknown): { success: boolean; data?: PluginManifest; errors?: string[] } {
    const result = PluginManifestSchema.safeParse(manifest);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
  }

  static validateOrThrow(manifest: unknown): PluginManifest {
    const result = this.validate(manifest);
    if (!result.success) {
      throw new Error(`Invalid plugin manifest:\n${result.errors?.join('\n')}`);
    }
    return result.data!;
  }
}
