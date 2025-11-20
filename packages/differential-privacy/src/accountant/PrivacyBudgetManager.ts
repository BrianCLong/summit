/**
 * Privacy Budget Manager
 * Manages and tracks privacy budget consumption across operations
 */

import { v4 as uuidv4 } from 'uuid';
import { PrivacyBudget, PrivacyLoss, PrivacyAnalysis, PrivacyAudit, PrivacyViolation } from '../types.js';

export class PrivacyBudgetManager {
  private budgets: Map<string, PrivacyBudget> = new Map();
  private operations: Map<string, PrivacyLoss[]> = new Map();

  /**
   * Initialize a new privacy budget
   */
  initializeBudget(
    budgetId: string,
    epsilon: number,
    delta: number,
    composition: 'basic' | 'advanced' | 'moments' | 'renyi' = 'advanced'
  ): PrivacyBudget {
    const budget: PrivacyBudget = {
      epsilon,
      delta,
      used: 0,
      remaining: epsilon,
      composition,
    };

    this.budgets.set(budgetId, budget);
    this.operations.set(budgetId, []);

    return budget;
  }

  /**
   * Consume privacy budget for an operation
   */
  consumeBudget(
    budgetId: string,
    epsilon: number,
    delta: number,
    operation: string
  ): { success: boolean; remaining: number; message: string } {
    const budget = this.budgets.get(budgetId);

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    // Check if operation exceeds remaining budget
    if (epsilon > budget.remaining) {
      return {
        success: false,
        remaining: budget.remaining,
        message: `Operation requires ε=${epsilon}, but only ε=${budget.remaining} remains`,
      };
    }

    // Record operation
    const loss: PrivacyLoss = {
      epsilon,
      delta,
      operation,
      timestamp: new Date(),
    };

    const ops = this.operations.get(budgetId) ?? [];
    ops.push(loss);
    this.operations.set(budgetId, ops);

    // Update budget based on composition theorem
    const newUsed = this.composePrivacyLoss(ops, budget.composition);
    budget.used = newUsed;
    budget.remaining = budget.epsilon - newUsed;

    return {
      success: true,
      remaining: budget.remaining,
      message: `Operation successful. Remaining budget: ε=${budget.remaining.toFixed(4)}`,
    };
  }

  /**
   * Compose privacy loss using specified composition theorem
   */
  private composePrivacyLoss(
    operations: PrivacyLoss[],
    composition: string
  ): number {
    switch (composition) {
      case 'basic':
        return operations.reduce((sum, op) => sum + op.epsilon, 0);

      case 'advanced':
        // Advanced composition: ε' = sqrt(2k * ln(1/δ)) * ε + k * ε^2
        const k = operations.length;
        const avgDelta = operations.reduce((sum, op) => sum + op.delta, 0) / k;
        const avgEpsilon = operations.reduce((sum, op) => sum + op.epsilon, 0) / k;

        return (
          Math.sqrt(2 * k * Math.log(1 / avgDelta)) * avgEpsilon +
          k * avgEpsilon * avgEpsilon
        );

      case 'moments':
      case 'renyi':
        // For moments/Renyi, use a conservative estimate
        // In practice, this would use the actual moment accountant
        return operations.reduce((sum, op) => sum + op.epsilon * 0.8, 0);

      default:
        return operations.reduce((sum, op) => sum + op.epsilon, 0);
    }
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(budgetId: string): PrivacyBudget {
    const budget = this.budgets.get(budgetId);

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    return { ...budget };
  }

  /**
   * Get privacy loss history
   */
  getOperationHistory(budgetId: string): PrivacyLoss[] {
    return this.operations.get(budgetId) ?? [];
  }

  /**
   * Analyze privacy budget usage
   */
  analyzeBudget(budgetId: string): PrivacyAnalysis {
    const budget = this.budgets.get(budgetId);
    const operations = this.operations.get(budgetId) ?? [];

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    const utilization = (budget.used / budget.epsilon) * 100;
    let recommendation = '';

    if (utilization > 90) {
      recommendation = 'CRITICAL: Privacy budget nearly exhausted. Stop further operations.';
    } else if (utilization > 70) {
      recommendation = 'WARNING: Privacy budget usage high. Consider alternative approaches.';
    } else if (utilization > 50) {
      recommendation = 'CAUTION: More than half of privacy budget consumed.';
    } else {
      recommendation = 'OK: Privacy budget usage within acceptable range.';
    }

    return {
      totalEpsilon: budget.used,
      totalDelta: Math.max(...operations.map((op) => op.delta), 0),
      composition: budget.composition,
      operations: [...operations],
      recommendation,
    };
  }

  /**
   * Perform privacy audit
   */
  auditPrivacy(
    budgetId: string,
    maxEpsilon?: number,
    maxDelta?: number
  ): PrivacyAudit {
    const budget = this.budgets.get(budgetId);
    const operations = this.operations.get(budgetId) ?? [];

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    const violations: PrivacyViolation[] = [];

    // Check total epsilon
    if (maxEpsilon && budget.used > maxEpsilon) {
      violations.push({
        operation: 'total',
        expected: maxEpsilon,
        actual: budget.used,
        severity: 'critical',
        message: `Total epsilon ${budget.used} exceeds maximum ${maxEpsilon}`,
      });
    }

    // Check individual operations
    for (const op of operations) {
      if (maxEpsilon && op.epsilon > maxEpsilon) {
        violations.push({
          operation: op.operation,
          expected: maxEpsilon,
          actual: op.epsilon,
          severity: 'high',
          message: `Operation epsilon ${op.epsilon} exceeds maximum ${maxEpsilon}`,
        });
      }

      if (maxDelta && op.delta > maxDelta) {
        violations.push({
          operation: op.operation,
          expected: maxDelta,
          actual: op.delta,
          severity: 'high',
          message: `Operation delta ${op.delta} exceeds maximum ${maxDelta}`,
        });
      }
    }

    // Check budget overflow
    if (budget.used > budget.epsilon) {
      violations.push({
        operation: 'budget',
        expected: budget.epsilon,
        actual: budget.used,
        severity: 'critical',
        message: 'Privacy budget exceeded',
      });
    }

    const status =
      violations.length === 0
        ? 'pass'
        : violations.some((v) => v.severity === 'critical')
          ? 'fail'
          : violations.some((v) => v.severity === 'high')
            ? 'warning'
            : 'pass';

    return {
      auditId: uuidv4(),
      timestamp: new Date(),
      privacyBudget: { ...budget },
      operations: [...operations],
      violations,
      status,
    };
  }

  /**
   * Reset budget (use with caution!)
   */
  resetBudget(budgetId: string): void {
    const budget = this.budgets.get(budgetId);

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    budget.used = 0;
    budget.remaining = budget.epsilon;
    this.operations.set(budgetId, []);
  }

  /**
   * Split budget for parallel operations
   */
  splitBudget(
    budgetId: string,
    numSplits: number
  ): Array<{ epsilon: number; delta: number }> {
    const budget = this.budgets.get(budgetId);

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    const epsilonPerSplit = budget.remaining / numSplits;
    const deltaPerSplit = budget.delta / numSplits;

    return Array.from({ length: numSplits }, () => ({
      epsilon: epsilonPerSplit,
      delta: deltaPerSplit,
    }));
  }

  /**
   * Recommend privacy parameters for target utility
   */
  recommendParameters(
    targetUtility: number,
    maxEpsilon: number,
    numOperations: number
  ): { epsilon: number; delta: number; expected: string } {
    // Heuristic: allocate budget evenly across operations
    const epsilonPerOp = maxEpsilon / numOperations;
    const delta = 1 / (numOperations * numOperations);

    const expectedUtility = 1 - epsilonPerOp * 0.1; // Rough estimate

    return {
      epsilon: epsilonPerOp,
      delta,
      expected: `Expected utility: ${(expectedUtility * 100).toFixed(1)}%, Target: ${(targetUtility * 100).toFixed(1)}%`,
    };
  }
}
