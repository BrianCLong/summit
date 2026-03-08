import * as fs from 'fs';
import * as path from 'path';

describe('Scaffolder Conformance', () => {
  let generateScaffold: any;
  const testDir = path.resolve(process.cwd(), 'tests', 'infra', 'fixtures', 'scaffold-test');

  beforeAll(async () => {
    const mod = await import('../../src/platform/infra/scaffolder');
    generateScaffold = mod.generateScaffold;

    // Clean up if exists
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should fail scaffolding if required metadata is missing', () => {
    const componentConfig = {
      name: 'new-service',
      // missing owner and tags
    };

    expect(() => {
      generateScaffold(testDir, componentConfig);
    }).toThrow('Missing required metadata: owner');
  });

  it('should emit required files in successful scaffold', () => {
    const componentConfig = {
      name: 'valid-service',
      owner: 'billing-team',
      tags: ['java', 'spring']
    };

    generateScaffold(testDir, componentConfig);

    const serviceYamlPath = path.join(testDir, 'service.yaml');
    const workflowPath = path.join(testDir, '.github', 'workflows', 'ci-core.yml');

    expect(fs.existsSync(serviceYamlPath)).toBe(true);
    expect(fs.existsSync(workflowPath)).toBe(true);

    const serviceYaml = fs.readFileSync(serviceYamlPath, 'utf8');
    expect(serviceYaml).toContain('name: valid-service');
    expect(serviceYaml).toContain('owner: billing-team');
  });
});
