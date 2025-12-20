import { PromptRegistry } from '../../src/registry/index.js';
import { PromptTemplate } from '../../src/types/index.js';

const buildTemplate = (
  version: string,
  lifecycle: 'draft' | 'approved' | 'deprecated' = 'draft'
): PromptTemplate => ({
  id: `unit-template-${version}`,
  name: 'unit-template',
  version,
  content: 'Hello {{name}}',
  variables: [
    {
      name: 'name',
      type: 'string',
      required: true,
    },
  ],
  metadata: {
    author: 'tester',
    owner: 'qa',
    purpose: 'unit coverage',
    modelFamily: 'gpt-4o',
    safetyConstraints: ['no pii'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lifecycle,
    model: 'gpt-4o-mini',
    temperature: 0.2,
  },
  tags: ['unit'],
});

describe('PromptRegistry versioning semantics', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    process.env.PROMPT_REGISTRY = '1';
    registry = new PromptRegistry();
  });

  test('supports draft → approved → deprecated transitions with audit trail', async () => {
    await registry.register(buildTemplate('1.0.0'));

    const approved = await registry.updateStatus(
      'unit-template',
      '1.0.0',
      'approved',
      'approver@example.com',
      'ready for rollout'
    );

    expect(approved.status).toBe('approved');

    const deprecated = await registry.updateStatus(
      'unit-template',
      '1.0.0',
      'deprecated',
      'approver@example.com'
    );

    expect(deprecated.status).toBe('deprecated');

    const audit = registry.getAuditTrail('unit-template', '1.0.0');
    expect(audit.some((entry) => entry.toStatus === 'approved')).toBe(true);
    expect(audit[audit.length - 1]?.toStatus).toBe('deprecated');
  });

  test('blocks invalid lifecycle transitions', async () => {
    await registry.register(buildTemplate('2.0.0', 'deprecated'));

    await expect(
      registry.updateStatus('unit-template', '2.0.0', 'approved', 'approver@example.com')
    ).rejects.toThrow('Invalid status transition');
  });
});
