import { cleanroomJoin } from '../src/conductor/steps/cleanroomJoin';

test('applies DP noise to aggregates (placeholder)', async () => {
  const ctx: any = {
    enclave: { join: async () => ({ total: 100 }) },
    emitArtifact: jest.fn(),
  };
  await cleanroomJoin(ctx, {
    inputs: {
      joinKeys: ['k'],
      select: ['x'],
      dp: {
        epsilon: 1,
        mechanism: 'laplace',
        sensitivity: 1,
        columns: ['total'],
      },
    },
  });
  expect(ctx.emitArtifact).toHaveBeenCalled();
});
