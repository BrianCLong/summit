describe('Infra Registry Validation', () => {
  let validateArtifact: any;

  beforeAll(async () => {
    const mod = await import('../../src/platform/infra/validate');
    validateArtifact = mod.validateArtifact;
  });

  it('should pass a valid artifact', () => {
    const artifact = {
      kind: 'module',
      name: 'network-baseline',
      version: '1.0.0',
      owner: { team: 'platform' },
      policy_profile: 'baseline'
    };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when missing owner team', () => {
    const artifact = {
      kind: 'module',
      name: 'network-baseline',
      version: '1.0.0',
      owner: {}
    };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing owner or team');
  });

  it('should fail when missing name or version', () => {
    const artifact = {
      kind: 'module',
      owner: { team: 'platform' }
    };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing name');
    expect(result.errors).toContain('Missing version');
  });
});
