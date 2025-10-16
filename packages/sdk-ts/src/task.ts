import type { RunContext, TaskInput, TaskOutput } from './types.js';

export interface Task<TIn = unknown, TOut = unknown> {
  init?: (ctx: RunContext) => Promise<void> | void;
  validate?: (input: TaskInput<TIn>) => Promise<void> | void;
  execute: (
    ctx: RunContext,
    input: TaskInput<TIn>,
  ) => Promise<TaskOutput<TOut>>;
}

export function defineTask<TIn = unknown, TOut = unknown>(
  task: Task<TIn, TOut>,
): Task<TIn, TOut> {
  return task;
}
