import { defineTask, createRunContext } from '../src/index.js';

test('task validates and executes', async () => {
  const t = defineTask<{ n: number }, { doubled: number}> ({
    validate: ({ payload }) => { if (payload.n == null) throw new Error('n required'); },
    execute: async (_ctx, { payload }) => ({ payload: { doubled: payload.n * 2 } })
  });
  const ctx = createRunContext({});
  const out = await t.execute(ctx, { payload: { n: 2 } });
  expect(out.payload.doubled).toBe(4);
});
