import type { Controller, ControllerDecision, ExecutionHistory } from '../controller.js';

export class SingleSkillThenStopController implements Controller {
  constructor(private readonly skillId: string) {}

  async decide(
    state: Record<string, unknown>,
    history: ExecutionHistory[],
  ): Promise<ControllerDecision> {
    if (history.length === 0) {
      return {
        nextSkillId: this.skillId,
        skillInput: {
          message: typeof state.goal === 'string' ? state.goal : 'demo goal',
        },
        rationale: 'initial_skill',
      };
    }

    return {
      stop: true,
      rationale: 'goal_satisfied',
    };
  }
}
