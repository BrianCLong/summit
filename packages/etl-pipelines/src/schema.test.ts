import { describe, it, expect } from 'vitest';
import { PipelineContractSchema } from './schema';

describe('PipelineContractSchema', () => {
  const validContract = {
    apiVersion: 'summit.io/v1',
    kind: 'Pipeline',
    metadata: {
      name: 'test-pipeline',
      owners: ['test@summit.io'],
    },
    spec: {
      source: {
        connector: 's3',
        config: { bucket: 'test-bucket' },
      },
      transformations: [
        { step: 'redact-pii' },
      ],
      destination: {
        connector: 'neo4j',
        config: { uri: 'bolt://localhost:7687' },
      },
      slo_targets: {
        latency_p95_ms: 600000,
        success_rate_percent: 99.5,
      },
      governance_tags: ['public'],
    },
  };

  it('should validate a valid contract', () => {
    const result = PipelineContractSchema.safeParse(validContract);
    expect(result.success).toBe(true);
  });

  it('should fail if required fields are missing', () => {
    const invalid = { ...validContract, spec: { ...validContract.spec } };
    delete (invalid as any).spec.source;
    const result = PipelineContractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Due to legacy support, missing 'source' might be caught by the refinement or missing both source/inputs
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('should fail if SLO values are invalid', () => {
    const invalid = JSON.parse(JSON.stringify(validContract));
    invalid.spec.slo_targets.success_rate_percent = 101;
    const result = PipelineContractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('success_rate_percent'));
      expect(issue?.message).toContain('Number must be less than or equal to 100');
    }
  });

  it('should fail if owners list is empty', () => {
    const invalid = JSON.parse(JSON.stringify(validContract));
    invalid.metadata.owners = [];
    const result = PipelineContractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('owners'));
      expect(issue?.message).toContain('Array must contain at least 1 element(s)');
    }
  });

  it('should fail if owner email is invalid', () => {
    const invalid = JSON.parse(JSON.stringify(validContract));
    invalid.metadata.owners = ['not-an-email'];
    const result = PipelineContractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('owners') || i.path.includes(0));
      expect(issue?.message).toContain('Invalid email');
    }
  });

  it('should fail if retry_policy delay format is invalid', () => {
    const invalid = JSON.parse(JSON.stringify(validContract));
    invalid.spec.retry_policy = {
      attempts: 3,
      delay: 'invalid',
      backoff: 'fixed',
    };
    const result = PipelineContractSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('delay'));
      expect(issue?.message).toContain('Invalid');
    }
  });
});
