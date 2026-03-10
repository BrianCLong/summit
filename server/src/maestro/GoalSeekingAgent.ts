import { Maestro } from './core.js';
import { narrativeSimulationManager } from '../narrative/manager.js';
import { SimulationAnalyticsService } from '../simulation/SimulationAnalyticsService.js';
import logger from '../utils/logger.js';

/**
 * Goal-Seeking Agent - Iteratively interacts with simulations to reach a target state.
 */
export class GoalSeekingAgent {
  private analytics = new SimulationAnalyticsService();

  constructor(private maestro: Maestro) {}

  async seekGoal(
    simulationId: string,
    targetTheme: string,
    targetMomentum: number,
    maxIterations: number = 5
  ): Promise<GoalSeekingResult> {
    logger.info({ simulationId, targetTheme, targetMomentum }, 'Goal-seeking agent started');

    let currentIteration = 0;
    const history: IterationResult[] = [];

    while (currentIteration < maxIterations) {
      currentIteration++;

      const state = await narrativeSimulationManager.getState(simulationId);
      if (!state) throw new Error(`Simulation ${simulationId} not found`);

      const arc = state.arcs.find(a => a.theme === targetTheme);

      if (arc && arc.momentum >= targetMomentum) {
        logger.info({ iteration: currentIteration, momentum: arc.momentum }, 'Target momentum reached');
        return { success: true, iterations: currentIteration, history };
      }

      // 23rd Order: Compressed intention - generate intervention
      const intervention = await this.generateIntervention(targetTheme, state);

      logger.info({ iteration: currentIteration, intervention }, 'Injecting intervention');
      narrativeSimulationManager.injectActorAction(simulationId, 'GoalSeekingAgent', intervention);

      const newState = await narrativeSimulationManager.tick(simulationId, 1);
      const impact = await this.analytics.getEventImpact(simulationId, 'latest');

      history.push({
        iteration: currentIteration,
        intervention,
        momentum: newState.arcs.find(a => a.theme === targetTheme)?.momentum || 0,
        impact
      });
    }

    return { success: false, iterations: maxIterations, history };
  }

  private async generateIntervention(targetTheme: string, state: any): Promise<string> {
    // 40th Order: LLM-based intervention generation
    const response = await (this.maestro as any).llm.callCompletion('system-run', 'goal-seek', {
      model: 'openai:gpt-4',
      messages: [
        { role: 'system', content: `You are a strategic intervention engine. Generate an action to increase the momentum of the '${targetTheme}' narrative.` },
        { role: 'user', content: `Current simulation state: ${JSON.stringify(state)}` }
      ]
    });

    return response.content || `Promote ${targetTheme} narrative.`;
  }
}

export interface GoalSeekingResult {
  success: boolean;
  iterations: number;
  history: IterationResult[];
}

export interface IterationResult {
  iteration: number;
  intervention: string;
  momentum: number;
  impact: any;
}
