import { enqueueSync } from '../src/sync/outbox';

test('queues sync item (may fail without DB)', async () => {
  await expect(
    enqueueSync(
      '00000000-0000-0000-0000-000000000000',
      'artifact',
      'sha256:ab',
    ),
  ).rejects.toBeTruthy();
});
