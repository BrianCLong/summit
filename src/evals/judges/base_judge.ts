import { Judge, JudgeResult } from '../types';

export abstract class BaseJudge implements Judge {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract evaluate(input: string, context?: any): Promise<JudgeResult>;
}

export class MockJudge extends BaseJudge {
  async evaluate(input: string, context?: any): Promise<JudgeResult> {
    // Simple mock logic
    return {
      score: 0.5,
      reason: 'Mock decision',
      metadata: { input_length: input.length }
    };
  }
}
