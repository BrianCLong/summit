import GraphValidationService from '../graph/validation/GraphValidationService.js';
import { GraphCypherRule, CypherExecutor } from '../graph/validation/types.js';

describe('GraphValidationService', () => {
  const basePayload = {
    tenantId: 'tenant-1',
    nodes: [
      {
        id: 'node-1',
        labels: ['Entity'],
        properties: {
          tenantId: 'tenant-1',
          kind: 'PERSON',
          name: 'Alice',
        },
      },
    ],
    relationships: [],
  };

  it('returns a valid result when payload meets all constraints', async () => {
    const service = new GraphValidationService();
    const result = await service.validate(basePayload);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.appliedRules).toContain('json-schema');
  });

  it('detects missing node properties through JSON schema validation', async () => {
    const service = new GraphValidationService();
    const invalid = {
      ...basePayload,
      nodes: [
        {
          id: 'node-2',
          labels: ['Entity'],
          properties: {
            tenantId: 'tenant-1',
            // Missing required fields kind and name
          },
        },
      ],
    };

    const result = await service.validate(invalid as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'NODE_PROPERTY_REQUIRED')).toBe(true);
    expect(result.errors.some((error) => error.path.includes('properties.kind'))).toBe(true);
  });

  it('incorporates Cypher rule violations in the response', async () => {
    const rule: GraphCypherRule = {
      name: 'tenant-consistency-cypher',
      description: 'Ensures tenants are consistent across nodes',
      statement: 'UNWIND $nodes AS node RETURN collect(node) AS violations',
      errorCode: 'TENANT_MISMATCH',
      severity: 'ERROR',
      buildError: (violation) => ({
        code: 'TENANT_MISMATCH',
        message: `Node ${violation.id} failed tenant rule`,
        path: `nodes[id=${violation.id}]`,
        severity: 'ERROR',
        rule: 'tenant-consistency-cypher',
        details: violation,
      }),
    };

    const executor: CypherExecutor = {
      run: jest.fn(async () => ({
        records: [
          {
            violations: [
              {
                id: 'node-1',
                tenantId: 'tenant-2',
              },
            ],
          },
        ],
      })),
    };

    const service = new GraphValidationService({
      cypherRules: [rule],
      cypherExecutor: executor,
    });

    const result = await service.validate(basePayload);

    expect(executor.run).toHaveBeenCalled();
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TENANT_MISMATCH', rule: 'tenant-consistency-cypher' }),
      ]),
    );
    expect(result.appliedRules).toContain('tenant-consistency-cypher');
  });
});
