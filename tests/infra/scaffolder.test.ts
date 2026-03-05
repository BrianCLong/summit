import * as fs from 'fs';
import * as path from 'path';

// Minimal Scaffolder stub implementation
export function scaffoldComponent(componentName: string, outputDir: string, metadata: any) {
  if (!metadata.owner || !metadata.owner.team) {
    throw new Error('Metadata missing owner.team');
  }

  const componentDir = path.join(outputDir, componentName);
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
  }

  const serviceYaml = `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${componentName}
  owner: ${metadata.owner.team}
  tags:
${(metadata.tags || []).map((t: string) => `    - ${t}`).join('\n')}
spec:
  type: service
  lifecycle: experimental
`;
  fs.writeFileSync(path.join(componentDir, 'service.yaml'), serviceYaml.trim());

  const workflowsDir = path.join(componentDir, '.github', 'workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });

  const ciWorkflow = `
name: CI Core
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "CI stub"
`;
  fs.writeFileSync(path.join(workflowsDir, 'ci-core.yml'), ciWorkflow.trim());
}

describe('Generic Scaffolder', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'infra', 'fixtures');

  afterAll(() => {
    // Clean up fixtures safely
    if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should generate valid component structure', () => {
    const componentName = 'test-component';
    scaffoldComponent(componentName, testOutputDir, {
      owner: { team: 'test-team' },
      tags: ['test']
    });

    const componentDir = path.join(testOutputDir, componentName);
    expect(fs.existsSync(path.join(componentDir, 'service.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(componentDir, '.github', 'workflows', 'ci-core.yml'))).toBe(true);
  });

  it('should fail if metadata is missing owner', () => {
    expect(() => {
      scaffoldComponent('fail-component', testOutputDir, {});
    }).toThrow('Metadata missing owner.team');
  });
});
