import { graphValidationResolvers } from '../graphValidation';

const baseInput = {
  tenantId: 'tenant-1',
  nodes: [
    {
      id: 'node-1',
      labels: ['Entity'],
      properties: { tenantId: 'tenant-1', kind: 'PERSON', name: 'Alice' },
    },
  ],
  relationships: [],
};

describe('graphValidationResolvers', () => {
  it('delegates validation to the service and returns the result', async () => {
    const validate = jest.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      appliedRules: ['json-schema'],
    });

    const context = {
      user: { id: 'user-1', tenantId: 'tenant-1', roles: ['ADMIN'] },
      graphValidationService: { validate },
    } as any;

    const result = await graphValidationResolvers.Mutation.validateGraphData(
      {},
      { input: baseInput },
      context,
    );

    expect(validate).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      nodes: baseInput.nodes,
      relationships: baseInput.relationships,
    });
    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: [],
      appliedRules: ['json-schema'],
    });
  });

  it('throws when tenant isolation is violated', async () => {
    const context = {
      user: { id: 'user-1', tenantId: 'tenant-1', roles: ['ANALYST'] },
      graphValidationService: { validate: jest.fn() },
    } as any;

    await expect(
      graphValidationResolvers.Mutation.validateGraphData(
        {},
        { input: { ...baseInput, tenantId: 'tenant-2' } },
        context,
      ),
    ).rejects.toThrow('Cross-tenant access denied');
  });
});
