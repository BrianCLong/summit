import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildMigrationRiskReport,
  scanSqlForRisks,
} from '../../src/db/migrations/migration-checker.js';

const writeMigration = (dir: string, name: string, sql: string) => {
  const upPath = path.join(dir, `${name}.up.sql`);
  fs.writeFileSync(upPath, sql, 'utf8');
};

describe('migration safety gate', () => {
  it('allows safe migrations', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    writeMigration(
      dir,
      '20250101000000_safe',
      'CREATE TABLE safe_table (id uuid primary key);',
    );

    const report = buildMigrationRiskReport({
      migrationsDir: dir,
      overridden: false,
    });

    expect(report.summary.findings).toBe(0);
    expect(report.summary.riskyMigrations).toBe(0);
  });

  it('flags destructive migrations', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
    writeMigration(dir, '20250101000001_drop', 'DROP TABLE users;');

    const report = buildMigrationRiskReport({
      migrationsDir: dir,
      overridden: false,
    });

    expect(report.summary.findings).toBeGreaterThan(0);
    expect(report.summary.riskyMigrations).toBe(1);
    expect(report.migrations[0].findings[0].rule).toBe('drop_table');
  });

  it('marks overridden reports when destructive checks are bypassed', () => {
    const findings = scanSqlForRisks(
      'ALTER TABLE users ADD COLUMN role text NOT NULL;',
    );

    expect(findings.some((finding) => finding.rule === 'add_not_null_without_default'))
      .toBe(true);

    const report = buildMigrationRiskReport({
      migrationsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-')),
      overridden: true,
    });

    expect(report.overridden).toBe(true);
  });
});
