import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TelemetryEmitter } from '../src/lib/telemetry.js';

describe('TelemetryEmitter', () => {
  let tempDir: string;
  let emitter: TelemetryEmitter;
  const runId = 'test-run-123';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
    emitter = new TelemetryEmitter(tempDir, runId);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create the events directory and file', () => {
    const eventsDir = path.join(tempDir, '.switchboard', 'events');
    expect(fs.existsSync(eventsDir)).toBe(true);
  });

  it('should emit a preflight_decision event', () => {
    emitter.emitPreflightDecision({
      rule: 'exec',
      allow: true,
      reason: 'Allowed by policy'
    }, { job_id: 'step-1', action_id: 'act-1' });

    const eventFile = path.join(tempDir, '.switchboard', 'events', 'events.jsonl');
    const content = fs.readFileSync(eventFile, 'utf8');
    const event = JSON.parse(content.trim());

    expect(event.v).toBe('1');
    expect(event.type).toBe('preflight_decision');
    expect(event.run_id).toBe(runId);
    expect(event.job_id).toBe('step-1');
    expect(event.action_id).toBe('act-1');
    expect(event.data.rule).toBe('exec');
    expect(event.data.allow).toBe(true);
    expect(event.ts).toBeDefined();
  });

  it('should emit tool_execution events', () => {
    emitter.emitToolExecutionStart({
      tool: 'ls',
      args: ['-la']
    }, { job_id: 'step-1' });

    emitter.emitToolExecutionEnd({
      tool: 'ls',
      exit_code: 0,
      duration_ms: 100
    }, { job_id: 'step-1' });

    const eventFile = path.join(tempDir, '.switchboard', 'events', 'events.jsonl');
    const lines = fs.readFileSync(eventFile, 'utf8').trim().split('\n');

    const startEvent = JSON.parse(lines[0]);
    expect(startEvent.type).toBe('tool_execution_start');
    expect(startEvent.data.tool).toBe('ls');

    const endEvent = JSON.parse(lines[1]);
    expect(endEvent.type).toBe('tool_execution_end');
    expect(endEvent.data.exit_code).toBe(0);
    expect(endEvent.data.duration_ms).toBe(100);
  });

  it('should emit mcp_server_health event', () => {
    emitter.emitMcpServerHealth({
      server_name: 'test-server',
      status: 'healthy'
    });

    const eventFile = path.join(tempDir, '.switchboard', 'events', 'events.jsonl');
    const content = fs.readFileSync(eventFile, 'utf8');
    const event = JSON.parse(content.trim());

    expect(event.type).toBe('mcp_server_health');
    expect(event.data.server_name).toBe('test-server');
    expect(event.data.status).toBe('healthy');
  });
});
