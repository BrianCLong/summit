import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const scriptPath = path.resolve(repoRoot, 'scripts', 'backup-restore-validation.sh');

describe('backup restore validation dry run', () => {
  it('emits a deterministic safety plan without touching infrastructure', () => {
    const result = spawnSync('bash', [scriptPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DRY_RUN: 'true',
        TIMESTAMP: '20250101-000000',
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('DRY RUN');
    expect(result.stdout).toContain('intelgraph-restore-20250101-000000');
    expect(result.stdout).toMatch(/postgres-backup-20250101-000000\.sql/);
    expect(result.stdout).not.toMatch(/prod/);
  });
});
