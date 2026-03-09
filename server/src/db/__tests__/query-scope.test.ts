import { validateAndScopeQuery } from '../query-scope.js';

describe('validateAndScopeQuery', () => {
  const tenantId = 'tenant-123';

  it('scopes a simple SELECT query', () => {
    const result = validateAndScopeQuery('SELECT * FROM audit_logs', [], tenantId);
    expect(result.wasScoped).toBe(true);
    expect(result.query).toBe('SELECT * FROM audit_logs WHERE tenant_id = $1');
    expect(result.params).toEqual([tenantId]);
  });

  it('scopes a SELECT query with WHERE clause', () => {
    const result = validateAndScopeQuery('SELECT * FROM audit_logs WHERE id = $1', ['log-1'], tenantId);
    expect(result.wasScoped).toBe(true);
    expect(result.query).toBe('SELECT * FROM audit_logs WHERE id = $1 AND tenant_id = $2');
    expect(result.params).toEqual(['log-1', tenantId]);
  });

  it('strips trailing semicolons before scoping', () => {
    const result = validateAndScopeQuery('SELECT * FROM audit_logs;', [], tenantId);
    expect(result.wasScoped).toBe(true);
    expect(result.query).toBe('SELECT * FROM audit_logs WHERE tenant_id = $1');
    expect(result.params).toEqual([tenantId]);
  });

  it('strips trailing semicolons with whitespace', () => {
    const result = validateAndScopeQuery('SELECT * FROM audit_logs;  ', [], tenantId);
    expect(result.wasScoped).toBe(true);
    expect(result.query).toBe('SELECT * FROM audit_logs WHERE tenant_id = $1');
    expect(result.params).toEqual([tenantId]);
  });

  it('throws error for queries with comments (--) that need scoping', () => {
    expect(() => {
      validateAndScopeQuery('SELECT * FROM audit_logs -- comment', [], tenantId);
    }).toThrow(/Unsafe query for auto-scoping/);
  });

  it('throws error for queries with comments (/* */) that need scoping', () => {
    expect(() => {
      validateAndScopeQuery('SELECT * FROM audit_logs /* comment */', [], tenantId);
    }).toThrow(/Unsafe query for auto-scoping/);
  });

  it('does NOT throw error for already scoped queries with comments', () => {
    const query = 'SELECT * FROM audit_logs WHERE tenant_id = $1 -- comment';
    const result = validateAndScopeQuery(query, [tenantId], tenantId);
    expect(result.wasScoped).toBe(true); // Technically already scoped returns wasScoped: true in this implementation
    expect(result.query).toBe(query);
  });

  it('ignores queries that do not touch tenant-scoped tables', () => {
    const result = validateAndScopeQuery('SELECT * FROM public_data', [], tenantId);
    expect(result.wasScoped).toBe(false);
    expect(result.query).toBe('SELECT * FROM public_data');
  });
});
