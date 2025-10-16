import { Flow } from './types';
export function toGitHub(flow: Flow) {
  const jobs: any = {};
  flow.nodes.forEach((n) => {
    const steps =
      n.type === 'build'
        ? [
            { uses: 'actions/checkout@v4' },
            { uses: '.github/actions/setup-turbo' },
            { run: 'pnpm turbo run build --filter=...[HEAD^]' },
          ]
        : n.type === 'test'
          ? [
              { run: 'node tools/ci/tia_select.ts' },
              { run: 'npx jest --ci --runTestsByPath $(cat tia-tests.txt)' },
            ]
          : n.type === 'deploy'
            ? [
                {
                  uses: '.github/actions/docker-build-push',
                  with: {
                    image: 'ghcr.io/${{ github.repository }}/maestro',
                    context: '.',
                    tags: 'ghcr.io/${{ github.repository }}/maestro:${{ github.sha }}',
                  },
                },
                {
                  uses: '.github/actions/helm-deploy',
                  with: { chart: 'charts/maestro', namespace: 'maestro' },
                },
              ]
            : [{ run: 'echo custom' }];
    jobs[n.id] = { 'runs-on': 'ubuntu-latest', steps };
  });
  // add needs from edges
  flow.edges.forEach((e) => {
    jobs[e.to].needs = [...new Set([...(jobs[e.to].needs || []), e.from])];
  });
  return { name: flow.name, on: flow.triggers, jobs };
}
