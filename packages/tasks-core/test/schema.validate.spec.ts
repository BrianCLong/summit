import task from '../src/tasks/schema.validate.js';

test('valid schema passes', async () => {
  const schema = {
    type: 'object',
    properties: { a: { type: 'number' } },
    required: ['a'],
  };
  const out = await task.execute({} as any, {
    payload: { schema, data: { a: 1 } },
  });
  expect(out.payload.valid).toBe(true);
});
