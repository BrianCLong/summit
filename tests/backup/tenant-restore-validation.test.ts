import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const restoreScript = path.resolve(__dirname, '../../scripts/db/restore.sh');

describe('tenant-scoped backup validation', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-backup-'));
  const backupRoot = path.join(tmpRoot, 'backup');
  const tenant = 'tenant-a';
  const tenantPath = path.join(backupRoot, 'tenants', tenant);

  beforeAll(() => {
    fs.mkdirSync(tenantPath, { recursive: true });
    fs.writeFileSync(
      path.join(backupRoot, 'backup-metadata.json'),
      JSON.stringify({ environment: 'dev', tenant }),
      'utf-8'
    );
    fs.writeFileSync(path.join(tenantPath, 'postgres.dump'), '', 'utf-8');
    fs.writeFileSync(path.join(tenantPath, 'neo4j.dump'), '', 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('runs a dry-run restore when tenant matches metadata and folder', () => {
    const output = execFileSync(
      'bash',
      [
        restoreScript,
        '--env=dev',
        `--backup-path=${backupRoot}`,
        '--datastores=postgres,neo4j',
        `--tenant=${tenant}`,
        '--dry-run',
        '--skip-verification',
        '--force',
      ],
      {
        env: {
          ...process.env,
          SKIP_VERIFICATION: 'true',
          DRY_RUN: 'true',
          FORCE: 'true',
          POSTGRES_CONTAINER: 'mock-postgres',
          NEO4J_CONTAINER: 'mock-neo4j',
        },
      }
    ).toString();

    expect(output).toContain('Using tenant-scoped backup path');
    expect(output).toContain('DRY RUN');
  });

  it('fails fast when tenant metadata mismatches', () => {
    expect(() =>
      execFileSync(
        'bash',
        [
          restoreScript,
          '--env=dev',
          `--backup-path=${backupRoot}`,
          '--datastores=postgres',
          '--tenant=wrong-tenant',
          '--dry-run',
          '--skip-verification',
          '--force',
        ],
        {
          env: {
            ...process.env,
            SKIP_VERIFICATION: 'true',
            DRY_RUN: 'true',
            FORCE: 'true',
          },
        }
      )
    ).toThrow();
  });
});
