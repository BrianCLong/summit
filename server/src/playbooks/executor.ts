// @ts-nocheck
import logger from '../utils/logger.js';
import { DelayStep, LogStep, Playbook, PlaybookStep } from './schema.js';

export type PlaybookStepHandler = (step: PlaybookStep) => Promise<unknown>;

export interface PlaybookStepHandlers {
  log: (step: LogStep) => Promise<unknown>;
  delay: (step: DelayStep) => Promise<unknown>;
}

export interface PlaybookStepResult {
  stepId: string;
  type: PlaybookStep['type'];
  status: 'success' | 'failed';
  startedAt: string;
  finishedAt: string;
  output?: unknown;
  error?: string;
}

const defaultHandlers: PlaybookStepHandlers = {
  log: async (step) => {
    logger.info('Playbook log step', { stepId: step.id, message: step.message });
    return { message: step.message };
  },
  delay: async (step) => {
    await new Promise((resolve) => setTimeout(resolve, step.durationMs));
    return { durationMs: step.durationMs };
  },
};

export class PlaybookExecutor {
  private handlers: PlaybookStepHandlers;

  constructor(handlers: PlaybookStepHandlers = defaultHandlers) {
    this.handlers = handlers;
  }

  async execute(playbook: Playbook): Promise<PlaybookStepResult[]> {
    const results: PlaybookStepResult[] = [];

    for (const step of playbook.steps) {
      const startedAt = new Date().toISOString();
      try {
        const handler = this.getHandler(step.type);
        const output = await handler(step);
        const finishedAt = new Date().toISOString();
        results.push({
          stepId: step.id,
          type: step.type,
          status: 'success',
          startedAt,
          finishedAt,
          output,
        });
      } catch (error: any) {
        const finishedAt = new Date().toISOString();
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          stepId: step.id,
          type: step.type,
          status: 'failed',
          startedAt,
          finishedAt,
          error: message,
        });
        throw error;
      }
    }

    return results;
  }

  private getHandler(type: PlaybookStep['type']): PlaybookStepHandler {
    const handler = this.handlers[type];
    if (!handler) {
      throw new Error(`No handler registered for step type: ${type}`);
    }
    return handler;
  }
}
