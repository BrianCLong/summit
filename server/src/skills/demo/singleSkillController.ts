import type { Controller, ControllerDecision } from '../controller.js';

export class SingleSkillThenStopController implements Controller {
  constructor(private readonly skillId: string) {}

  async decide(
    state: Record<string, unknown>,
    history: any[],
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
      nextSkillId: this.skillId,
      skillInput: {},
      stop: true,
      rationale: 'goal_satisfied',
    };
  }
}
