import { ArtifactConfig, ValidationResult } from '../types.js';

export function validateDpBudget(artifact: ArtifactConfig, rawContent: string): ValidationResult {
  try {
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const epsilon = parsed.totalEpsilon;
    const delta = parsed.totalDelta;
    const allocations = parsed.allocations;

    const details: string[] = [];

    if (typeof epsilon !== 'number' || epsilon <= 0) {
      details.push('totalEpsilon must be a positive number');
    }

    if (typeof delta !== 'number' || delta <= 0 || delta >= 1) {
      details.push('totalDelta must be a number between 0 and 1');
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      details.push('allocations must contain at least one entry');
    }

    if (details.length > 0) {
      return {
        status: 'failed',
        validator: 'DpBudgetValidator',
        details
      };
    }

    const allocationArray = allocations as unknown[];
    const allocationCount = allocationArray.length;

    return {
      status: 'passed',
      validator: 'DpBudgetValidator',
      details: [
        `ε=${epsilon as number}`,
        `δ=${delta as number}`,
        `allocations=${allocationCount}`
      ],
      metadata: {
        epsilon,
        delta,
        allocations: allocationArray,
        allocationCount
      }
    };
  } catch (error) {
    return {
      status: 'failed',
      validator: 'DpBudgetValidator',
      details: [(error as Error).message]
    };
  }
}
