import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import type { Pool } from 'pg';
import { MigrationManager } from '../../src/db/migrations/versioning.js';

describe('MigrationManager', () => {
  let tempDir: string;
  let migrationsDir: string;
  let seedsDir: string;
  const originalPostgresUrl = process.env.POSTGRES_URL;

  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://example';
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    migrationsDir = path.join(tempDir, 'migrations');
    seedsDir = path.join(tempDir, 'seeds');
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
    process.env.POSTGRES_URL = originalPostgresUrl;
  });

  function createMockPool(
    appliedMigrations: { name: string; checksum: string }[] = [],
    appliedSeeds: { name: string }[] = [],
  ) {
    const queries: string[] = [];

    const client = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('FROM migration_history')) {
          return { rows: appliedMigrations };
        }
        if (sql.includes('FROM seed_history')) {
          return { rows: appliedSeeds };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const pool = {
      connect: jest.fn(async () => client),
    } as unknown as Pool;

    return { pool, client, queries };
  }

  function writeMigration(name: string, upSql: string, downSql: string) {
    fs.writeFileSync(path.join(migrationsDir, `${name}.up.sql`), upSql);
    fs.writeFileSync(path.join(migrationsDir, `${name}.down.sql`), downSql);
  }

  it('applies pending migrations and seeds with tracking', async () => {
    writeMigration('202412010001_example', 'CREATE TABLE demo(id INT);', 'DROP TABLE IF EXISTS demo;');
    fs.writeFileSync(
      path.join(seedsDir, '202412010001_seed.sql'),
      'INSERT INTO demo(id) VALUES (1);',
    );

    const { pool, client, queries } = createMockPool();
    const manager = new MigrationManager({
      migrationsDir,
      seedsDir,
      pool,
      allowBreakingChanges: true,
    });

    await manager.migrate();
    await manager.seed();

    expect(client.query).toHaveBeenCalled();
    expect(queries).toEqual(expect.arrayContaining(['BEGIN']));
    expect(queries.join('\n')).toContain('INSERT INTO migration_history');
    expect(queries.join('\n')).toContain('INSERT INTO seed_history');
  });

  it('rolls back the latest migration when requested', async () => {
    const upSql = 'CREATE TABLE demo(id INT);';
    const downSql = 'DROP TABLE IF EXISTS demo;';
    writeMigration('202412010001_example', upSql, downSql);
    const checksum = crypto.createHash('sha256').update(upSql).update(downSql).digest('hex');

    const { pool, queries } = createMockPool([{ name: '202412010001_example', checksum }]);
    const manager = new MigrationManager({
      migrationsDir,
      seedsDir,
      pool,
      allowBreakingChanges: true,
    });

    await manager.rollback({ steps: 1 });

    expect(queries).toEqual(expect.arrayContaining(['BEGIN']));
    expect(queries.join('\n')).toContain('rolled_back_at');
  });

  it('guards against destructive migrations by default', () => {
    expect(() => MigrationManager.validateOnlineSafety('DROP TABLE users;')).toThrow(
      /breaking change/i,
    );
  });

  it('runs pg_dump when backing up', async () => {
    process.env.POSTGRES_URL = 'postgres://example';
    const emitter = new EventEmitter();
    const spawn = jest.fn(() => {
      setImmediate(() => emitter.emit('exit', 0));
      return emitter as any;
    });

    const { pool } = createMockPool();
    const manager = new MigrationManager({
      migrationsDir,
      seedsDir,
      pool,
      spawn: spawn as any,
    });

    await manager.backup(path.join(tempDir, 'backup.sql'));
    expect(spawn).toHaveBeenCalledWith(
      'pg_dump',
      expect.arrayContaining(['--file', expect.stringContaining('backup.sql')]),
      expect.anything(),
    );
  });
});
