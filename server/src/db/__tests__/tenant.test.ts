import { withTenant } from '../tenant.js';

describe('withTenant', () => {
  it('should append WHERE clause if none exists', () => {
    const query = 'SELECT * FROM users';
    const result = withTenant(query, [], 'tenant1');
    expect(result.text).toBe('SELECT * FROM users WHERE tenant_id = $1');
    expect(result.values).toEqual(['tenant1']);
  });

  it('should append AND clause if WHERE exists', () => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = withTenant(query, ['123'], 'tenant1');
    expect(result.text).toBe('SELECT * FROM users WHERE id = $1 AND tenant_id = $2');
    expect(result.values).toEqual(['123', 'tenant1']);
  });

  it('should insert WHERE clause before ORDER BY', () => {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = withTenant(query, [], 'tenant1');
    expect(result.text).toBe('SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at DESC');
  });

  it('should insert AND clause before LIMIT', () => {
    const query = 'SELECT * FROM users WHERE active = true LIMIT 10';
    const result = withTenant(query, [], 'tenant1');
    expect(result.text).toBe('SELECT * FROM users WHERE active = true AND tenant_id = $1 LIMIT 10');
  });

  it('should handle multiple clauses', () => {
    const query = 'SELECT * FROM users WHERE active = true GROUP BY role ORDER BY created_at DESC LIMIT 5';
    const result = withTenant(query, [], 'tenant1');
    // It should insert before the first clause found (GROUP BY)
    expect(result.text).toBe('SELECT * FROM users WHERE active = true AND tenant_id = $1 GROUP BY role ORDER BY created_at DESC LIMIT 5');
  });

  it('should handle trailing semicolon', () => {
    const query = 'SELECT * FROM users;';
    const result = withTenant(query, [], 'tenant1');
    expect(result.text).toBe('SELECT * FROM users WHERE tenant_id = $1;');
  });

  it('should handle trailing semicolon with WHERE', () => {
    const query = 'SELECT * FROM users WHERE id = 1;';
    const result = withTenant(query, [], 'tenant1');
    expect(result.text).toBe('SELECT * FROM users WHERE id = 1 AND tenant_id = $1;');
  });
});
