import fs from 'fs';
import os from 'os';
import path from 'path';

import { MigrationSafetySimulator } from '../MigrationSafetySimulator.js';

const connectMock = jest.fn();
const queryMock = jest.fn();
const endMock = jest.fn();

jest.mock('pg', () => ({
  Client: jest.fn(() => ({
    connect: connectMock,
    query: queryMock,
    end: endMock,
  })),
}));

describe('MigrationSafetySimulator.detectUnsafePatterns', () => {
  it('flags destructive operations and missing predicates', () => {
    const sql = `
      CREATE TABLE widgets (id uuid primary key);
      DROP TABLE old_table;
      ALTER TABLE widgets ADD COLUMN legacy text;
      UPDATE widgets SET name = 'x';
      DELETE FROM widgets;
      ALTER TABLE widgets ALTER COLUMN legacy SET NOT NULL;
    `;

    const patterns = MigrationSafetySimulator.detectUnsafePatterns(sql, 'up');

    const patternTypes = patterns.map((pattern) => pattern.pattern);

    expect(patternTypes).toContain('drop_table');
    expect(patternTypes).toContain('update_without_where');
    expect(patternTypes).toContain('delete_without_where');
    expect(patternTypes).toContain('set_not_null');
  });
});

describe('MigrationSafetySimulator.run', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    connectMock.mockReset();
    queryMock.mockReset();
    endMock.mockReset();

    tempRoots.forEach((dir) => {
      fs.rmSync(dir, { recursive: true, force: true });
    });
    tempRoots.length = 0;
  });

  it('runs migrations in sorted order with savepoint isolation and keeps going on error', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-safety-'));
    tempRoots.push(root);

    const migrationsDir = path.join(root, 'migrations');
    const reportDir = path.join(root, 'report');
    const patchDir = path.join(root, 'patches');
    fs.mkdirSync(migrationsDir, { recursive: true });

    fs.writeFileSync(path.join(migrationsDir, '002_second.sql'), 'CREATE TABLE second(id int);');
    fs.writeFileSync(path.join(migrationsDir, '001_first.sql'), 'CREATE TABLE first(id int);');
    fs.writeFileSync(path.join(migrationsDir, '001_first.down.sql'), 'DROP TABLE first;');

    queryMock.mockImplementation((sql: string) => {
      if (sql.includes('DROP TABLE first')) {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ rowCount: 0 });
    });

    const simulator = new MigrationSafetySimulator({
      migrationsDir,
      connectionString: 'postgres://example',
      reportDir,
      patchDir,
      continueOnError: true,
    });

    const report = await simulator.run();

    expect(report.migrations.map((m) => m.file)).toEqual([
      '001_first.sql',
      '002_second.sql',
    ]);
    expect(report.migrations[0].status).toBe('failed');
    expect(report.migrations[1].status).toBe('passed');
    expect(report.summary.failed).toBe(1);
    expect(report.summary.patchesGenerated).toBe(1);
    expect(fs.existsSync(path.join(patchDir, '002_second.down.sql'))).toBe(true);

    const queries = queryMock.mock.calls.map((call) => call[0]);
    expect(queries.some((sql) => (sql as string).startsWith('SAVEPOINT migration_001_first'))).toBe(
      true,
    );
    expect(
      queries.some((sql) => (sql as string).startsWith('ROLLBACK TO SAVEPOINT migration_001_first')),
    ).toBe(true);
  });
});

describe('MigrationSafetySimulator.generateRollbackPatchContent', () => {
  it('generates rollback stubs with drops for created objects', () => {
    const upSql = `
      CREATE TABLE IF NOT EXISTS demo (id serial primary key);
      ALTER TABLE demo ADD COLUMN extra text;
      CREATE INDEX demo_extra_idx ON demo(extra);
    `;

    const patch = MigrationSafetySimulator.generateRollbackPatchContent(
      '2025-08-13_initial.sql',
      upSql,
    );

    expect(patch).toContain('DROP TABLE IF EXISTS demo CASCADE;');
    expect(patch).toContain('DROP COLUMN IF EXISTS extra');
    expect(patch).toContain('DROP INDEX IF EXISTS demo_extra_idx;');
    expect(patch.startsWith('-- Auto-generated rollback for 2025-08-13_initial.sql')).toBe(
      true,
    );
  });
});
