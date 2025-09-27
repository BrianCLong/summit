import { describe, expect, it } from 'vitest';
import {
  entityById,
  entitiesByForeignKey,
  searchByPrefix,
  listActive,
  macroRegistry,
  POLICY_MAPPING,
} from '../src/index.js';

describe('SRPL macros', () => {
  it('emits deterministic single-record queries', () => {
    const resultA = entityById({ table: 'users', id: 42 });
    const resultB = entityById({ table: 'users', id: 42 });
    expect(resultA).toEqual({
      text: 'SELECT * FROM "users" WHERE "id" = $1',
      values: [42],
    });
    expect(resultA).toEqual(resultB);
  });

  it('honors explicit projections and column names', () => {
    const query = entityById({
      table: 'accounts',
      id: 'acct_1',
      idColumn: 'account_id',
      columns: ['account_id', 'owner'],
    });
    expect(query).toEqual({
      text: 'SELECT "account_id", "owner" FROM "accounts" WHERE "account_id" = $1',
      values: ['acct_1'],
    });
  });

  it('builds relationship traversals with ordering and limits', () => {
    const query = entitiesByForeignKey({
      table: 'events',
      foreignKeyColumn: 'account_id',
      foreignKeyValue: 'acct_1',
      sortColumn: 'created_at',
      sortDirection: 'DESC',
      limit: 10,
    });
    expect(query).toEqual({
      text: 'SELECT * FROM "events" WHERE "account_id" = $1 ORDER BY "created_at" DESC LIMIT 10',
      values: ['acct_1'],
    });
  });

  it('supports prefix search with case-insensitive comparison by default', () => {
    const query = searchByPrefix({ table: 'people', column: 'family_name', prefix: 'Sm', limit: 5 });
    expect(query).toEqual({
      text: 'SELECT * FROM "people" WHERE "family_name" ILIKE $1 LIMIT 5',
      values: ['Sm%'],
    });
  });

  it('lists active records with defaults', () => {
    const query = listActive({ table: 'teams' });
    expect(query).toEqual({
      text: 'SELECT * FROM "teams" WHERE "is_active" = $1',
      values: [true],
    });
  });

  it('validates identifiers to protect against injection', () => {
    expect(() => entityById({ table: 'users; DROP TABLE', id: 1 })).toThrowError(/Invalid identifier/);
  });

  it('keeps macro registry aligned with policy mapping', () => {
    const macroNames = Object.keys(macroRegistry);
    expect(new Set(macroNames)).toEqual(new Set(POLICY_MAPPING.map((entry) => entry.macro)));
  });
});
