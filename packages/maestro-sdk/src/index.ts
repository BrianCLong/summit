/**
 * Maestro SDK - Task Definition API
 */

export interface TaskContext {
  secrets: (key: string) => Promise<string>;
  log: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
  emit: (event: string, payload: unknown) => void;
}

export interface TaskDefinition<TIn, TOut> {
  execute: (ctx: TaskContext, options: { payload: TIn }) => Promise<{ payload: TOut }>;
}

export function defineTask<TIn, TOut>(
  definition: TaskDefinition<TIn, TOut>
): TaskDefinition<TIn, TOut> {
  return definition;
}

export default { defineTask };
