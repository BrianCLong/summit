import { validateArtifact, validateRegistry } from '../../src/platform/infra/validate';
import { InfraArtifact, InfraRegistry } from '../../src/platform/infra/registry';

describe('Infra Registry Validation', () => {
  it('should pass a valid artifact', () => {
    const validArtifact: InfraArtifact = {
      kind: 'module',
      name: 'network-baseline',
      version: '1.0.0',
      owner: { team: 'platform-infra' }
    };
    const errors = validateArtifact(validArtifact);
    expect(errors.length).toBe(0);
  });

  it('should fail an artifact missing an owner team', () => {
    const invalidArtifact: any = {
      kind: 'module',
      name: 'network-baseline',
      version: '1.0.0',
      owner: {}
    };
    const errors = validateArtifact(invalidArtifact);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('Owner team is required');
  });

  it('should pass a valid registry', () => {
    const validRegistry: InfraRegistry = {
      version: 1,
      artifacts: [
        {
          kind: 'module',
          name: 'network-baseline',
          version: '1.0.0',
          owner: { team: 'platform-infra' }
        }
      ]
    };
    const errors = validateRegistry(validRegistry);
    expect(errors.length).toBe(0);
  });
});
