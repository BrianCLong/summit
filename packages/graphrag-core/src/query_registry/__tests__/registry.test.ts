import { RegistryLoader } from '../index.js';
import { Phase } from '../../phases.js';

describe('RegistryLoader', () => {
  test('should validate valid registry', () => {
    const validData = {
      queries: [
        {
          id: 'q1',
          phase: 'DISCOVERY',
          cypher: 'MATCH (n) RETURN n',
          tenant_scope: true
        },
        {
          id: 'q2',
          phase: 'JUSTIFICATION',
          cypher: 'MATCH (n) RETURN n.id',
          max_rows: 10,
          projection_allowlist: ['n.id'],
          tenant_scope: true
        },
      ],
    };

    const registry = RegistryLoader.validate(validData);
    expect(registry.queries.length).toBe(2);
    expect(registry.queries[0].phase).toBe(Phase.DISCOVERY);
  });

  test('should throw on invalid phase', () => {
    const invalidData = {
      queries: [
        {
          id: 'q1',
          phase: 'INVALID_PHASE',
          cypher: 'MATCH (n) RETURN n',
        },
      ],
    };

    expect(() => RegistryLoader.validate(invalidData)).toThrow();
  });

  test('should throw on missing required fields', () => {
    const invalidData = {
      queries: [
        {
          id: 'q1',
        },
      ],
    };

    expect(() => RegistryLoader.validate(invalidData)).toThrow();
  });
});
