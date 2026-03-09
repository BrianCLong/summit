import { describe, it, expect } from 'vitest';
import { needsMigration, CURRENT_SCHEMA_VERSION } from '../schema/version.js';
import { migrateV1ToV2 } from '../schema/migrations/v1-to-v2.js';
import { Migrator } from '../schema/migrator.js';

describe('IntelGraph Schema Versioning', () => {
  it('should detect migration needs', () => {
    expect(needsMigration('1')).toBe(true);
    expect(needsMigration('2')).toBe(false);
  });

  it('should migrate V1 to V2', () => {
    const v1 = {
      id: '1',
      metadata: { tags: ['t1', 't2'], extra: 'data' }
    };
    const v2 = migrateV1ToV2(v1);
    expect(v2.id).toBe('1');
    expect(v2.tags).toEqual(['t1', 't2']);
    expect(v2.schemaVersion).toBe('2');
    expect(v2.metadata).toBeUndefined();
  });

  it('should handle missing tags in V1', () => {
    const v1 = { id: '2', metadata: {} };
    const v2 = migrateV1ToV2(v1);
    expect(v2.tags).toEqual([]);
  });

  it('should batch migrate using Migrator', () => {
    const entities = [
      { id: '1', metadata: { tags: ['a'] } },
      { id: '2', metadata: { tags: ['b'] } }
    ];
    const migrator = new Migrator();
    const results = migrator.batchMigrate(entities, '1');
    expect(results).toHaveLength(2);
    expect(results[0].tags).toEqual(['a']);
    expect(results[1].tags).toEqual(['b']);
    expect(results[0].schemaVersion).toBe('2');
  });
});
