/**
 * Branch operator for conditional workflow execution
 */

import { Operator, ExecutionContext } from '../types/dag-types.js';

export interface BranchOperatorConfig {
  condition: (context: ExecutionContext) => Promise<string | string[]>;
  branches: Record<string, string>;
}

export class BranchOperator implements Operator {
  private config: BranchOperatorConfig;

  constructor(config: BranchOperatorConfig) {
    this.config = config;
  }

  async execute(context: ExecutionContext): Promise<any> {
    const { condition, branches } = this.config;

    // Evaluate condition to get branch name(s)
    const branchResult = await condition(context);
    const selectedBranches = Array.isArray(branchResult)
      ? branchResult
      : [branchResult];

    // Validate branches exist
    selectedBranches.forEach(branch => {
      if (!branches[branch]) {
        throw new Error(`Branch ${branch} not found in branch configuration`);
      }
    });

    return {
      selectedBranches,
      taskIds: selectedBranches.map(b => branches[b]),
    };
  }
}
