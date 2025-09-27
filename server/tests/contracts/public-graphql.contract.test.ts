import { buildASTSchema, parse, validate } from 'graphql';
import { contractsTypeDefs } from '../../src/graphql/contracts/typeDefs';
import {
  publicPersistedOperations,
  getPublicPersistedOperation,
} from '../../src/graphql/contracts/persisted-queries';
import { contractsResolvers, type ContractsContext } from '../../src/graphql/contracts/resolvers';

describe('Public GraphQL contract', () => {
  const schema = buildASTSchema(contractsTypeDefs);

  it('exposes cost and slo directives', () => {
    expect(schema.getDirective('cost')).toBeDefined();
    expect(schema.getDirective('slo')).toBeDefined();
  });

  it('registers 10-15 persisted operations with valid hashes', () => {
    expect(publicPersistedOperations.length).toBeGreaterThanOrEqual(10);
    expect(publicPersistedOperations.length).toBeLessThanOrEqual(15);

    const normalize = (document: string) => document.replace(/\s+/g, ' ').trim();

    for (const operation of publicPersistedOperations) {
      const hashed = require('crypto').createHash('sha256').update(normalize(operation.document)).digest('hex');
      expect(operation.sha256Hash).toBe(hashed);
      expect(operation.cost.estimatedMs).toBeLessThanOrEqual(operation.cost.targetSLOMs);

      const doc = parse(operation.document);
      const errors = validate(schema, doc);
      expect(errors).toHaveLength(0);
    }
  });

  it('allows lookup by hash and by name', () => {
    const first = publicPersistedOperations[0];
    expect(getPublicPersistedOperation(first.sha256Hash)).toBeDefined();
    expect(getPublicPersistedOperation(first.operationName)).toBeDefined();
  });

  it('resolver stubs return structured errors and diagnostics', async () => {
    const context: ContractsContext = {
      user: { id: 'tester', tenantId: 'tenant-a', roles: ['analyst'] },
      req: { headers: {} },
      opa: { evaluate: async () => ({ allow: true }) },
    };
    const info = {
      fieldName: 'publicEntity',
      path: { key: 'publicEntity' },
    } as any;

    const result = await contractsResolvers.Query.publicEntity(
      null,
      { id: 'non-existent' },
      context,
      info,
    );

    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics.sloTargetMs).toBe(350);
    expect(result.errors[0].code).toBe('ENTITY_NOT_FOUND');

    const mutationInfo = {
      fieldName: 'publicUpsertEntity',
      path: { key: 'publicUpsertEntity' },
    } as any;

    const mutation = await contractsResolvers.Mutation.publicUpsertEntity(
      null,
      { input: { tenantId: 'tenant-a', kind: 'Person', labels: [] } },
      context,
      mutationInfo,
    );

    expect(mutation.ok).toBe(false);
    expect(mutation.errors[0].code).toBe('NOT_IMPLEMENTED');
    expect(mutation.diagnostics.sloTargetMs).toBe(700);
  });
});
