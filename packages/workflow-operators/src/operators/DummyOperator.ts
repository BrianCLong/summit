/**
 * Dummy operator for testing and placeholder tasks
 */

import { Operator, ExecutionContext } from '../types/dag-types.js';

export class DummyOperator implements Operator {
  async execute(context: ExecutionContext): Promise<any> {
    return {
      success: true,
      message: 'Dummy operator executed',
      timestamp: new Date(),
    };
  }
}
