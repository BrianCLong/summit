import { ContextStore } from './ContextStore';

export type AnswerState = {
  content: string;
  ready: boolean;
  trace: string[];
};

export type PlanStep =
  | {
      action: 'refine';
      rationale: string;
    }
  | {
      action: 'subtask';
      rationale: string;
      chunkIds: string[];
      prompt: string;
    }
  | {
      action: 'finalize';
      rationale: string;
    };

export interface RecursiveLlmClient {
  planNextStep: (
    task: string,
    answer: AnswerState,
    context: ContextStore,
  ) => Promise<PlanStep>;
  runSubtask: (prompt: string, chunks: string[]) => Promise<string>;
  refineAnswer: (task: string, answer: AnswerState) => Promise<string>;
}

export class RecursivePlanner {
  private readonly maxDepth: number;

  constructor(
    private readonly llm: RecursiveLlmClient,
    private readonly context: ContextStore,
    options?: { maxDepth?: number },
  ) {
    this.maxDepth = options?.maxDepth ?? 4;
  }

  async solve(task: string, answer: AnswerState): Promise<AnswerState> {
    let current = answer;

    for (let depth = 0; depth < this.maxDepth; depth += 1) {
      if (current.ready) {
        return current;
      }

      const plan = await this.llm.planNextStep(task, current, this.context);
      current = await this.executePlan(plan, task, current);
    }

    return current;
  }

  private async executePlan(
    plan: PlanStep,
    task: string,
    answer: AnswerState,
  ): Promise<AnswerState> {
    switch (plan.action) {
      case 'refine': {
        const content = await this.llm.refineAnswer(task, answer);
        return {
          ...answer,
          content,
          trace: [...answer.trace, `refine:${plan.rationale}`],
        };
      }
      case 'subtask': {
        const content = await this.llm.runSubtask(plan.prompt, plan.chunkIds);
        return {
          ...answer,
          content: [answer.content, content].filter(Boolean).join('\n\n'),
          trace: [...answer.trace, `subtask:${plan.rationale}`],
        };
      }
      case 'finalize': {
        return {
          ...answer,
          ready: true,
          trace: [...answer.trace, `finalize:${plan.rationale}`],
        };
      }
      default: {
        const exhaustive: never = plan;
        return exhaustive;
      }
    }
  }
}
