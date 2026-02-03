import { GymEnvironment, Agent, EpisodeResult, Turn, Observation } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class GymRunner {
  constructor(
    private env: GymEnvironment,
    private agent: Agent,
    private options: { maxSteps?: number } = {}
  ) {}

  public async runEpisode(options?: Record<string, any>): Promise<EpisodeResult> {
    const episodeId = uuidv4();
    const maxSteps = this.options.maxSteps || 50;
    const turns: Turn[] = [];
    let score = 0;
    let success = false;
    let error: string | undefined;

    try {
      let observation = await this.env.reset(options);

      for (let step = 0; step < maxSteps; step++) {
        const startTime = Date.now();

        // Agent acts
        const action = await this.agent.act(observation);

        // Environment responds
        const result = await this.env.step(action);

        const durationMs = Date.now() - startTime;

        turns.push({
          step,
          observation, // The observation BEFORE the action
          action,
          feedback: result.feedback,
          info: result.info,
          durationMs
        });

        score += result.feedback.reward || 0;
        observation = result.observation;

        if (result.done) {
          success = result.feedback.success;
          break;
        }
      }
    } catch (e: any) {
      error = e.message;
    }

    return {
      episodeId,
      environment: this.env.name,
      success,
      score,
      turns,
      metadata: {},
      error
    };
  }
}
