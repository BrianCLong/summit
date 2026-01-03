import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

import { AgentActionGateway, KillSwitch } from '../src/agentActionGateway';
import { AuditLogger } from '../src/audit';
import { ContentBoundary } from '../src/contentBoundary';
import { EvidenceStore } from '../src/evidence';
import { PrincipalChain } from '../src/identity';
import { BasicPolicyEngine } from '../src/policy';
import { ToolBus, ToolBusOptions } from '../src/toolBus';
import { ToolDefinition } from '../src/tools';

const principal: PrincipalChain = {
  agent: { id: 'agent-lab', displayName: 'agent' },
  runtime: { id: 'worker-1', sessionId: 'sess-1', hostname: 'localhost' },
  request: { correlationId: 'corr-1', traceId: 'trace-1' },
};

const echoTool: ToolDefinition = {
  name: 'echo_tool',
  version: '0.0.1',
  description: 'echoes input',
  async execute(inputs) {
    return { output: inputs, notes: 'ok' };
  },
};

describe('Agent Action Gateway integration', () => {
  const boundary = new ContentBoundary(500);

  const buildBus = (policyOverrides: Partial<ToolBusOptions['policyConfig']> = {}, opts: Partial<ToolBusOptions> = {}) => {
    const base = fs.mkdtempSync(path.join(tmpdir(), 'agent-gateway-'));
    const policyConfig = {
      allowedTools: ['echo_tool'],
      targetAllowlist: ['example.com'],
      commandAllowlist: [],
      defaultTimeoutMs: 2000,
      rateLimit: { maxCalls: 5, intervalMs: 60000 },
      dataEgress: { maxOutputLength: 2000, redactSecrets: true },
      ...policyOverrides,
    };
    const bus = new ToolBus({
      baseArtifactsDir: base,
      boundary,
      policyConfig,
      dryRun: false,
      labMode: true,
      principal: opts.principal ?? principal,
      correlationId: opts.correlationId ?? 'corr-1',
      environment: 'test',
      attributionMode: opts.attributionMode ?? 'strict',
      requireHuman: opts.requireHuman ?? false,
      killSwitch: opts.killSwitch,
    });
    bus.register(echoTool);
    const evidence = new EvidenceStore(path.join(base, 'runs'), boundary, opts.correlationId ?? 'corr-1');
    evidence.init();
    return { bus, evidence, base };
  };

  it('denies execution when tool is not allowlisted', async () => {
    const { bus, evidence } = buildBus({ allowedTools: ['other_tool'] });
    const result = await bus.execute('echo_tool', { domain: 'example.com' }, evidence, 'step-1');
    expect(result.status).toBe('denied');
    expect(result.message).toMatch(/not allowlisted/);
  });

  it('denies when attribution is missing under strict human requirement', async () => {
    const { bus, evidence } = buildBus({}, { principal: { ...principal, human: undefined }, requireHuman: true });
    const result = await bus.execute('echo_tool', { domain: 'example.com' }, evidence, 'step-attr');
    expect(result.status).toBe('denied');
    expect(result.message).toMatch(/Attribution incomplete/);
  });

  it('denies when rate limit exceeded', async () => {
    const { bus, evidence } = buildBus({ rateLimit: { maxCalls: 1, intervalMs: 60000 } }, { correlationId: 'rate-limited' });
    const first = await bus.execute('echo_tool', { domain: 'example.com' }, evidence, 'step-1');
    expect(first.status).toBe('allowed');
    const second = await bus.execute('echo_tool', { domain: 'example.com' }, evidence, 'step-2');
    expect(second.status).toBe('denied');
    expect(second.message).toContain('Rate limit exceeded');
  });

  it('allows happy path, emits audit, and redacts sensitive outputs', async () => {
    const { bus, evidence, base } = buildBus({}, { principal: { ...principal, human: { id: 'human-1' } }, correlationId: 'happy' });
    const result = await bus.execute('echo_tool', { secret: 'API key 123' }, evidence, 'step-happy');
    expect(result.status).toBe('allowed');
    const ledger = fs.readFileSync(path.join(evidence.runPath, 'evidence', 'evidence.ndjson'), 'utf-8').trim().split('\n');
    const last = JSON.parse(ledger.pop() || '{}');
    expect(last.redaction).toContain('secret-phrase');
    const auditPath = path.join(base, 'runs', 'happy', 'audit', 'events.ndjson');
    expect(fs.existsSync(auditPath)).toBe(true);
    const audit = fs.readFileSync(auditPath, 'utf-8').trim().split('\n').map((line) => JSON.parse(line));
    expect(audit.some((e) => e.result?.status === 'allowed')).toBe(true);
  });
});

describe('Kill switch', () => {
  it('blocks execution when tripped', async () => {
    const base = fs.mkdtempSync(path.join(tmpdir(), 'agent-gateway-ks-'));
    const boundary = new ContentBoundary(200);
    const evidence = new EvidenceStore(path.join(base, 'runs'), boundary, 'ks-run');
    evidence.init();
    const audit = new AuditLogger(evidence.runPath, boundary);
    const killSwitch = new KillSwitch(true, 'maintenance', 'test');
    const gateway = new AgentActionGateway({
      policyEngine: new BasicPolicyEngine({ allowedTools: ['echo_tool'] }),
      boundary,
      auditLogger: audit,
      killSwitch,
      attributionMode: 'strict',
    });
    const decision = await gateway.guardAndExecute(
      {
        tool: 'echo_tool',
        action: 'ks-step',
        inputs: { domain: 'example.com' },
        target: 'example.com',
        principal,
        correlationId: 'ks-corr',
      },
      () => echoTool.execute({ domain: 'example.com' }, { labMode: true, dryRun: false, boundary, evidenceRoot: evidence.runPath, policyDecision: { allowed: true, reason: 'ok', policyVersion: '1.0.0' }, timeoutMs: 1000 }),
      evidence,
    );
    expect(decision.status).toBe('kill-switch');
    const auditLog = fs.readFileSync(path.join(evidence.runPath, 'audit', 'events.ndjson'), 'utf-8');
    expect(auditLog).toMatch(/kill-switch/);
  });
});
