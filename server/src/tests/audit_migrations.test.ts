import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditMigrations, calculateHash } from '../../scripts/audit_migrations.js';

const createTempDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'audit-migrations-'));

describe('audit_migrations', () => {
  it('detects new migrations that are not in the manifest', async () => {
    const baseDir = createTempDir();
    const migrationsDir = path.join(baseDir, 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });

    const initialMigration = '001_init.sql';
    const initialContent = '-- initial migration';
    fs.writeFileSync(path.join(migrationsDir, initialMigration), initialContent);
    const manifestPath = path.join(migrationsDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ [initialMigration]: calculateHash(initialContent) }));

    const newMigration = '002_new.sql';
    fs.writeFileSync(path.join(migrationsDir, newMigration), 'CREATE TABLE test(id int);');

    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const result = await auditMigrations({ migrationsDir, manifestPath, mode: 'check', logger });

    expect(result.hasError).toBe(true);
    expect(result.errors.join(' ')).toContain('MANIFEST ERROR');
  });

  it('rolls back manifest updates when persistence fails', async () => {
    const baseDir = createTempDir();
    const migrationsDir = path.join(baseDir, 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });

    const migration = '001_init.sql';
    const content = 'CREATE TABLE test(id int);';
    fs.writeFileSync(path.join(migrationsDir, migration), content);
    const manifestPath = path.join(migrationsDir, 'manifest.json');
    const originalManifest = JSON.stringify({});
    fs.writeFileSync(manifestPath, originalManifest);

    const originalWrite = fs.writeFileSync;
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation((file, data, ...rest) => {
      if (typeof file === 'string' && file.endsWith('.tmp')) {
        throw new Error('disk full');
      }
      return originalWrite.apply(fs, [file as any, data as any, ...rest] as any);
    });

    await expect(
      auditMigrations({ migrationsDir, manifestPath, mode: 'update', logger: console }),
    ).rejects.toThrow('disk full');

    expect(fs.readFileSync(manifestPath, 'utf-8')).toBe(originalManifest);
    writeSpy.mockRestore();
  });

  it('flags destructive SQL statements', async () => {
    const baseDir = createTempDir();
    const migrationsDir = path.join(baseDir, 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });

    const migration = '001_drop_table.sql';
    const content = 'DROP TABLE users;';
    fs.writeFileSync(path.join(migrationsDir, migration), content);
    const manifestPath = path.join(migrationsDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ [migration]: calculateHash(content) }));

    const result = await auditMigrations({ migrationsDir, manifestPath, mode: 'check', logger: console });

    expect(result.hasError).toBe(true);
    expect(result.errors.join(' ')).toContain('RULE VIOLATION');
  });
});
