import { streamProcess } from '../src/conductor/steps/streamProcess';

test('freshness gate blocks stale', async () => {
  const ctx: any = { id: 'r1', setOutputs: jest.fn() };
  await streamProcess(
    ctx,
    { id: 'ingest', freshness: { freshWithin: '10m' } },
    {
      key: 'k',
      value: '{}',
      ts: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    },
  );
  expect(ctx.setOutputs).not.toHaveBeenCalled();
});
