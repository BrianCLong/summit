import { remoteExecStep } from '../src/steps/remoteExec';

test('requires site', async () => {
  await expect(
    remoteExecStep({ id: 'r1', meta: {} }, { id: 's1', inputs: {} } as any),
  ).rejects.toBeTruthy();
});
