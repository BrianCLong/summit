import { defineTask, type TaskInput } from '@summit/maestro-sdk';

export default defineTask<{ ms: number }, { slept: number}> ({
  validate: ({ payload }: TaskInput<{ ms: number }>) => {
    if (!payload || typeof payload.ms !== 'number' || payload.ms < 0) throw new Error('ms must be >= 0');
  },
  execute: async (_ctx, { payload }) => {
    await new Promise(r => setTimeout(r, payload.ms));
    return { payload: { slept: payload.ms } };
  }
});
