import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  buildTraceMetrics,
  buildTraceReport,
  writeTraceEvidenceBundle,
} from '../../../src/agents/ops/trace';

describe('trace builder', () => {
  const originalTraceEnv = process.env.AGENT_TRACE_ENABLED;

  beforeEach(() => {
    process.env.AGENT_TRACE_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.AGENT_TRACE_ENABLED = originalTraceEnv;
  });

  it('builds deterministic report and metrics', () => {
    const events = [
      { type: 'AgentStart', sessionId: 's1' },
      { type: 'ToolUse', toolName: 'search', sessionId: 's1' },
    ];

    const report = buildTraceReport('EVD-OMC-TRACE-001', events);
    const metrics = buildTraceMetrics(events);

    expect(report.evidence_id).toBe('EVD-OMC-TRACE-001');
    expect(report.ops).toHaveLength(2);
    expect(report.ops[0].id).toHaveLength(16);
    expect(metrics).toEqual({
      event_count: 2,
      tool_use_count: 1,
      agent_cycles_detected: false,
      policy_violations_count: 0,
    });
  });

  it('writes a trace evidence bundle', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'trace-evidence-'));
    const events = [
      {
        type: 'AgentStart',
        sessionId: 'session-1',
        directory: '/workspace',
      },
    ];

    const result = await writeTraceEvidenceBundle({
      evidenceId: 'EVD-OMC-TRACE-001',
      events,
      outputRoot: tempDir,
      timestamp: '2026-01-01T00:00:00Z',
    });

    const report = JSON.parse(
      await readFile(path.join(result.outputDir, 'report.json'), 'utf8'),
    );
    const metrics = JSON.parse(
      await readFile(path.join(result.outputDir, 'metrics.json'), 'utf8'),
    );

    expect(report.ops[0].directory).toBe('/workspace');
    expect(metrics.event_count).toBe(1);

    await rm(tempDir, { recursive: true, force: true });
  });
});
