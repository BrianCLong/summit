/**
 * Transfer operator for moving data between tasks
 */

import { Operator, ExecutionContext } from '../types/dag-types.js';

export interface TransferOperatorConfig {
  sourceTask: string;
  transform?: (data: any) => any;
}

export class TransferOperator implements Operator {
  private config: TransferOperatorConfig;

  constructor(config: TransferOperatorConfig) {
    this.config = config;
  }

  async execute(context: ExecutionContext): Promise<any> {
    const { sourceTask, transform } = this.config;

    // Get output from source task
    const sourceOutput = await context.getTaskOutput(sourceTask);

    if (sourceOutput === undefined) {
      throw new Error(`Source task ${sourceTask} has no output`);
    }

    // Apply transform if provided
    if (transform) {
      return transform(sourceOutput);
    }

    return sourceOutput;
  }
}
