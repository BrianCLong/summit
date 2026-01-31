// @ts-nocheck
import { IncubationCapability, IncubationResult, SandboxContext } from './types.js';
import { SimpleBudgetManager } from './budget.js';
import { SafeToolRegistry } from './registry.js';

export class IncubationSandbox {
  private registry: SafeToolRegistry;

  constructor() {
    this.registry = new SafeToolRegistry();
  }

  async run(
    capability: IncubationCapability,
    input: string,
    limits: { tokens: number; steps: number }
  ): Promise<IncubationResult> {
    const budget = new SimpleBudgetManager(limits);
    const violations: string[] = [];
    const logs: string[] = [];

    const context: SandboxContext = {
      tools: this.registry,
      budget: budget,
      logger: (msg) => logs.push(msg),
    };

    const startTime = Date.now();

    try {
      // Wrap execution to catch errors (including budget/security)
      const result = await capability.run(input, context);

      return {
        ...result,
        metrics: {
          ...result.metrics,
          durationMs: Date.now() - startTime
        },
        violations: [...violations, ...result.violations]
      };
    } catch (error: any) {
      if (error.message.includes('Security Violation')) {
        violations.push(error.message);
      }
      if (error.message.includes('Budget exceeded')) {
        violations.push(error.message);
      }

      return {
        success: false,
        output: `Execution failed: ${error.message}`,
        metrics: {
          steps: 0, // Incomplete
          tokens: 0,
          durationMs: Date.now() - startTime
        },
        violations: violations
      };
    }
  }
}
