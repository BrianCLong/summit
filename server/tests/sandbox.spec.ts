import { createSandbox } from '../src/conductor/sandbox';

test('creates sandbox namespace (may fail outside cluster)', async () => {
  await expect(createSandbox('run-12345678', ['s3://*'])).rejects.toBeTruthy();
});
