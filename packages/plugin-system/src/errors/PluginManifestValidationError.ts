import { ZodError, ZodIssue } from 'zod';

export class PluginManifestValidationError extends Error {
  public readonly code = 'PLUGIN_MANIFEST_INVALID';
  public readonly issues: ZodIssue[];

  constructor(error: ZodError) {
    super('Plugin manifest failed validation');
    this.name = 'PluginManifestValidationError';
    this.issues = error.issues;
  }
}
