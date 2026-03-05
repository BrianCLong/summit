describe('Policy Deny-by-default behavior', () => {
  let validateArtifact: any;
  let FLAGS: any;

  beforeAll(async () => {
    const mod = await import('../../src/platform/infra/validate');
    const flagsMod = await import('../../src/platform/infra/flags');
    validateArtifact = mod.validateArtifact;
    FLAGS = flagsMod.FLAGS;
  });

  it('should require a known policy profile for deployment', () => {
    const artifact = {
      kind: 'stack',
      name: 'app-prod',
      version: '1.0.0',
      owner: { team: 'product-auth' }
    };

    if (FLAGS.INFRA_POLICY_ENFORCE) {
      const result = validateArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown or missing policy profile');
    }
  });

  it('should pass if policy profile is present', () => {
    const artifact = {
      kind: 'stack',
      name: 'app-prod',
      version: '1.0.0',
      owner: { team: 'product-auth' },
      policy_profile: 'baseline'
    };

    if (FLAGS.INFRA_POLICY_ENFORCE) {
      const result = validateArtifact(artifact);
      expect(result.valid).toBe(true);
      expect(result.errors).not.toContain('Unknown or missing policy profile');
    }
  });
});
