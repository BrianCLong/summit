import { EvaluationConfig } from './evaluation-runner';

export class TopologyGenerator {
  generate(type: EvaluationConfig['topology']): any {
    if (type === 'single') {
      return { nodes: ['planner-executor'] };
    } else if (type === 'multi') {
      return { nodes: ['planner', 'critic', 'executor'] };
    } else if (type === 'parallel') {
      return { nodes: ['planner', 'search1', 'search2'] };
    }
    throw new Error(`Unknown topology: ${type}`);
  }
}
