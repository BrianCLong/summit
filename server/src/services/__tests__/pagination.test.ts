import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  decodeCursor,
  encodeCursor,
  wrapCypherWithPagination,
  wrapSqlWithPagination,
} from '../pagination.js';

describe('pagination helpers', () => {
  it('roundtrips cursor encoding', () => {
    expect(decodeCursor(encodeCursor(0))).toBe(0);
    expect(decodeCursor(encodeCursor(42))).toBe(42);
    expect(decodeCursor(null)).toBe(0);
    expect(decodeCursor('invalid')).toBe(0);
  });

  it('wraps cypher with SKIP/LIMIT pagination', () => {
    const wrapped = wrapCypherWithPagination('MATCH (n) RETURN n');
    expect(wrapped).toContain('CALL {');
    expect(wrapped).toContain('MATCH (n) RETURN n');
    expect(wrapped).toContain('SKIP toInteger($skip)');
    expect(wrapped).toContain('LIMIT toInteger($limitPlusOne)');
  });

  it('wraps SQL with OFFSET/LIMIT pagination', () => {
    const wrapped = wrapSqlWithPagination('SELECT * FROM widgets');
    expect(wrapped).toContain('SELECT * FROM (');
    expect(wrapped).toContain('SELECT * FROM widgets');
    expect(wrapped).toContain('OFFSET $1');
    expect(wrapped).toContain('LIMIT $2');
  });
});
