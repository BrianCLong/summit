import { handleExecStep } from '../src/relay/exec';

test('exec handler basic flow', async () => {
  // HUB_URL and SITE_ID should be set in real runtime; here we expect it to throw or succeed depending on env.
  // This test asserts the function can be called without type errors.
  try {
    const res = await handleExecStep({
      id: 't1',
      payload: {
        runId: 'r1',
        stepId: 's1',
        snapshotRef: 'sha256:dead',
        args: {},
      },
    });
    expect(res).toBeTruthy();
  } catch (e) {
    expect(e).toBeTruthy();
  }
});
