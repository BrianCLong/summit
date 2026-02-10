import { GymEnvironment, Observation, Action, StepResult } from './types';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseEnvironment implements GymEnvironment {
  public abstract name: string;
  protected _seed: number = Date.now();
  protected _episodeId: string = '';

  constructor(seed?: number) {
    if (seed !== undefined) {
      this._seed = seed;
    }
  }

  public seed(seed: number): void {
    this._seed = seed;
  }

  public async reset(options?: Record<string, any>): Promise<Observation> {
    this._episodeId = uuidv4();
    return this._reset(options);
  }

  protected abstract _reset(options?: Record<string, any>): Promise<Observation>;

  public async step(action: Action): Promise<StepResult> {
    return this._step(action);
  }

  protected abstract _step(action: Action): Promise<StepResult>;

  public async close(): Promise<void> {
    // No-op by default
  }
}
