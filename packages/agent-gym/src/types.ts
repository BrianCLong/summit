import { z } from 'zod';

export type Action = {
  type: string;
  params: Record<string, any>;
};

export type Observation = {
  type: 'text' | 'image' | 'json' | 'mixed';
  content: any;
  timestamp: number;
  screenshot?: string; // base64 or url
};

export type Feedback = {
  success: boolean;
  message?: string;
  reward?: number;
  error?: string;
};

export type Info = Record<string, any>;

export type StepResult = {
  observation: Observation;
  feedback: Feedback;
  done: boolean;
  info: Info;
};

export interface GymEnvironment {
  name: string;
  reset(options?: Record<string, any>): Promise<Observation>;
  step(action: Action): Promise<StepResult>;
  render?(): any;
  close?(): Promise<void>;
  seed?(seed: number): void;
}

export interface Agent {
  act(observation: Observation, feedback?: Feedback): Promise<Action>;
  reset?(): Promise<void>;
}

export const ActionSchema = z.object({
  type: z.string(),
  params: z.record(z.any()),
});

export type Turn = {
  step: number;
  observation: Observation;
  action: Action;
  feedback: Feedback;
  info: Info;
  durationMs: number;
};

export type EpisodeResult = {
  episodeId: string;
  environment: string;
  success: boolean;
  score: number;
  turns: Turn[];
  metadata: Record<string, any>;
  error?: string;
};
