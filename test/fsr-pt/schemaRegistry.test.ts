import { SchemaRegistry, diffPolicyTags } from '../../src/fsr-pt/index.js';
import type { JsonSchema, PolicyTags } from '../../src/fsr-pt/types.js';

describe('Federated Schema Registry with Policy Tags', () => {
  const baseSchema: JsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: { type: 'string' },
    },
    required: ['id'],
  };

  const baseTags: PolicyTags = {
    sensitivity: 'internal',
    residency: 'us-central',
    retentionClass: 'standard',
  };

  it('registers schemas and computes compatibility with deterministic flags', () => {
    const registry = new SchemaRegistry();

    const first = registry.registerSchema('alpha', 'orders', '1.0.0', baseSchema, baseTags);
    expect(first.compatibility.compatible).toBe(true);
    expect(first.diff.tagDiff.summary).toContain('Initial policy tags established');

    const relaxedSchema: JsonSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['id'],
    };

    const relaxedTags: PolicyTags = {
      ...baseTags,
      retentionClass: 'extended',
    };

    const second = registry.registerSchema('alpha', 'orders', '1.1.0', relaxedSchema, relaxedTags);
    expect(second.compatibility.compatible).toBe(true);
    expect(second.compatibility.nonBreakingChanges).toEqual(['Property "note" was added.']);
    expect(second.diff.tagDiff.summary).toContain('Policy tag updates detected');
    expect(second.diff.impactSummary).toEqual([
      'INFO: Property "note" was added.',
      'TAG: Policy tag updates detected:',
      'TAG: - retentionClass: standard -> extended (Impact: Retention window extended; confirm archival and deletion workflows.)',
    ]);

    const breakingSchema: JsonSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    };

    const hardenedTags: PolicyTags = {
      sensitivity: 'confidential',
      residency: 'us-central',
      retentionClass: 'extended',
    };

    const third = registry.registerSchema('alpha', 'orders', '2.0.0', breakingSchema, hardenedTags);
    expect(third.isBreakingChange).toBe(true);
    expect(third.compatibility.breakingChanges).toEqual(['Property "note" was removed.', 'Property "status" was removed.']);
    expect(third.diff.tagDiff.summary).toContain('Policy tag updates detected');
    expect(third.diff.impactSummary[0]).toBe('BREAKING: Property "note" was removed.');
    expect(third.diff.impactSummary[1]).toBe('BREAKING: Property "status" was removed.');
  });

  it('produces clear tag diff impact summaries', () => {
    const previous: PolicyTags = {
      sensitivity: 'internal',
      residency: 'eu-west',
      retentionClass: 'standard',
    };

    const current: PolicyTags = {
      sensitivity: 'restricted',
      residency: 'eu-west',
      retentionClass: 'indefinite',
    };

    const diff = diffPolicyTags(previous, current);
    expect(diff.hasChanges).toBe(true);
    expect(diff.summary).toContain('Policy tag updates detected');
    expect(diff.changes).toEqual([
      {
        tag: 'sensitivity',
        previous: 'internal',
        current: 'restricted',
        impact: 'Escalate data handling and access controls.',
      },
      {
        tag: 'retentionClass',
        previous: 'standard',
        current: 'indefinite',
        impact: 'Retention window extended; confirm archival and deletion workflows.',
      },
    ]);
  });

  it('generates client bindings with embedded policy metadata', () => {
    const registry = new SchemaRegistry();
    registry.registerSchema('silo-x', 'profile', '1.0.0', baseSchema, baseTags);
    const bindings = registry.generateClientBindings('silo-x', 'profile', '1.0.0');

    expect(bindings.typescript).toContain('Policy tags: sensitivity=');
    expect(bindings.typescript).toContain('getProfileV1_0_0PolicyTags');
    expect(bindings.python).toContain('POLICY_TAGS');
    expect(bindings.python).toContain('policyTags');
  });
});
