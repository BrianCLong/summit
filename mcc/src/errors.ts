export class ModelCardValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Model card validation failed with ${issues.length} issue(s).`);
    this.name = 'ModelCardValidationError';
    this.issues = issues;
  }
}
