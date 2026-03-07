import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runTask } from '../../evaluation/swe/runTask';

describe('runTask', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'swe-run-'));

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('emits deterministic report/metrics/stamp artifacts', async () => {
    const instance = {
      instance_id: 'repo__issue-1',
      repo: 'org/repo',
      base_commit: 'abc123',
      image_name: 'safe/image:v1',
    };

    const artifacts = await runTask(instance, {
      now: (() => {
        let current = 1000;
        return () => {
          current += 500;
          return current;
        };
      })(),
      outputRoot: tempDir,
      executeBefore: async () => ({
        passed: 10,
        failed: 2,
        failToPassPassed: 0,
        regressions: 0,
      }),
      executeAfter: async () => ({
        passed: 12,
        failed: 0,
        failToPassPassed: 2,
        regressions: 0,
      }),
    });

    expect(artifacts.report.patch_success).toBe(true);
    const reportPath = path.join(tempDir, instance.instance_id, 'report.json');
    const metricsPath = path.join(tempDir, instance.instance_id, 'metrics.json');
    const stampPath = path.join(tempDir, instance.instance_id, 'stamp.json');

    expect(JSON.parse(readFileSync(reportPath, 'utf8')).instance_id).toBe(instance.instance_id);
    expect(JSON.parse(readFileSync(metricsPath, 'utf8')).tests_passed_after).toBe(12);
    expect(JSON.parse(readFileSync(stampPath, 'utf8')).schema_version).toBe('1.0.0');
  });
});
