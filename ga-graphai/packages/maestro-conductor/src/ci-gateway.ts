import type { CiCheck, CiCheckResult, OrchestrationTask } from './types';

export class CiGateway {
  private readonly checks: CiCheck[] = [];

  register(check: CiCheck): void {
    this.checks.push(check);
  }

  list(): CiCheck[] {
    return [...this.checks];
  }

  async evaluate(task: OrchestrationTask): Promise<CiCheckResult[]> {
    const results: CiCheckResult[] = [];
    for (const check of this.checks) {
      try {
        const result = await check.evaluate(task);
        results.push({
          id: check.id,
          description: check.description,
          required: check.required ?? true,
          passed: result.passed,
          detail: result.detail,
          metadata: result.metadata ?? {},
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown ci gate error';
        results.push({
          id: check.id,
          description: check.description,
          required: check.required ?? true,
          passed: false,
          detail: 'ci check execution failed',
          metadata: { error },
          error: message,
        });
      }
    }
    return results;
  }
}
