import { evalRule } from '../src/engine';
test('skips when when:false', async () => {
  const ok = await evalRule(
    { kind: 'pull_request', payload: {} },
    { id: 'x', when: { '==': [1, 2] }, then: [] },
  );
  expect(ok).toBe(false);
});
