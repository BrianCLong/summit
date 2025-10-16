import { toGitHub } from '../src/transpile/github';
test('edges become needs', () => {
  const flow: any = {
    name: 'x',
    triggers: ['pull_request'],
    nodes: [
      { id: 'a', type: 'build' },
      { id: 'b', type: 'test' },
    ],
    edges: [{ from: 'a', to: 'b' }],
  };
  const yml = toGitHub(flow);
  expect(yml.jobs.b.needs).toContain('a');
});
