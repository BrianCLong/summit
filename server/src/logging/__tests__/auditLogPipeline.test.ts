import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuditLogPipeline } from '../auditLogPipeline.js';
import { LogAlertEngine } from '../logAlertEngine.js';
import { LogEventBus } from '../logEventBus.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AuditLogPipeline', () => {
  it('captures structured JSON logs with compliance context', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-pipeline-'));
    const bus = new LogEventBus(50);
    const alerts = new LogAlertEngine([
      {
        id: 'burst-errors',
        name: 'Burst errors',
        level: 'error',
        windowSeconds: 10,
        threshold: 1,
      },
    ]);

    const pipeline = new AuditLogPipeline({
      logDir: tmpDir,
      streamName: 'test-audit',
      bus,
      alertEngine: alerts,
      maxRecent: 10,
    });

    bus.publish({
      level: 'info',
      message: 'user viewed record',
      tenantId: 'tenant-1',
      userId: 'user-123',
      context: {
        audit: { action: 'view', resource: 'case:42', compliance: ['SOC2'] },
        correlationId: 'corr-1',
      },
    });

    bus.publish({
      level: 'error',
      message: 'failed to update record',
      tenantId: 'tenant-1',
      userId: 'user-123',
      context: {
        audit: {
          action: 'update',
          outcome: 'failure',
          resource: 'case:42',
          compliance: ['HIPAA'],
          ip: '10.0.0.5',
          userAgent: 'jest',
        },
      },
    });

    await sleep(50);

    const fileContent = fs.readFileSync(path.join(tmpDir, 'test-audit.jsonl'), 'utf8');
    const lines = fileContent
      .split('\n')
      .filter(Boolean)
      .map((line: string) => JSON.parse(line));

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      stream: 'test-audit',
      tenantId: 'tenant-1',
      audit: { action: 'view', resource: 'case:42' },
    });
    expect(lines[1]).toMatchObject({
      level: 'error',
      audit: { outcome: 'failure', ip: '10.0.0.5' },
    });

    const snapshot = pipeline.getDashboardSnapshot();
    expect(snapshot.metrics.totalEvents).toBe(2);
    expect(snapshot.metrics.perLevel.error).toBe(1);
    expect(snapshot.metrics.perTenant['tenant-1']).toBe(2);
    expect(snapshot.metrics.compliance).toEqual({});
    expect(snapshot.recentEvents[0].audit?.resource).toBe('case:42');

    pipeline.stop();
  });
});
