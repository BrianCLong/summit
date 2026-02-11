import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { adapterById, defaultAdapters } from '../adapters';
import { EventLogger } from '../logging/EventLogger';
import { TranscriptWriter } from '../logging/TranscriptWriter';
import { PolicyGate } from '../policy/PolicyGate';
import { checkCompanyOSPolicy } from '../policy/companyosMiddleware';
import { emitEvidenceToIntelGraph } from '../policy/intelgraphEvidence';
import { SkillsetStore } from '../skillsets/SkillsetStore';
import {
  EventRecord,
  ProviderAdapter,
  ProviderId,
  ProviderSession,
  Skillset,
  ToolAction,
} from '../types';
import { EvidenceBundler } from './EvidenceBundler';

const execAsync = promisify(exec);

const nowIso = (): string => new Date().toISOString();

const createSessionId = (): string =>
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;

export class ConsoleSession {
  private readonly sessionId: string;
  private readonly sessionDir: string;
  private readonly eventLogger: EventLogger;
  private readonly transcript: TranscriptWriter;
  private readonly policyGate: PolicyGate;
  private readonly skillsetStore: SkillsetStore;
  private readonly adapters: ProviderAdapter[];
  private provider: ProviderAdapter | null = null;
  private providerSession: ProviderSession | null = null;
  private skillset: Skillset | null = null;

  constructor(options: {
    sessionRoot: string;
    skillsetDir: string;
    adapters?: ProviderAdapter[];
    sessionId?: string;
  }) {
    this.sessionId = options.sessionId ?? createSessionId();
    this.sessionDir = path.join(options.sessionRoot, this.sessionId);
    this.eventLogger = new EventLogger(this.sessionDir);
    this.transcript = new TranscriptWriter(this.sessionDir);
    this.policyGate = new PolicyGate();
    this.skillsetStore = new SkillsetStore(options.skillsetDir);
    this.adapters = options.adapters ?? defaultAdapters();
  }

  async init(resume = false): Promise<void> {
    await mkdir(this.sessionDir, { recursive: true });
    await this.eventLogger.init();
    await this.transcript.init();
    await this.logEvent('session_start', { resume });
  }

  get id(): string {
    return this.sessionId;
  }

  get dir(): string {
    return this.sessionDir;
  }

  async handleInput(line: string): Promise<string | null> {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('/agent')) {
      const [, agent] = trimmed.split(' ');
      if (!agent) {
        return 'Usage: /agent <claude|codex|gemini>';
      }
      await this.switchAgent(agent as ProviderId);
      return `Agent set to ${agent}`;
    }

    if (trimmed.startsWith('/skillset')) {
      const [, skillsetName] = trimmed.split(' ');
      if (!skillsetName) {
        return 'Usage: /skillset <name>';
      }
      await this.switchSkillset(skillsetName);
      return `Skillset set to ${skillsetName}`;
    }

    if (trimmed.startsWith('/run')) {
      const command = trimmed.replace('/run', '').trim();
      if (!command) {
        return 'Usage: /run <command>';
      }
      return this.runCommand(command);
    }

    if (trimmed.startsWith('/evidence')) {
      const evidencePath = await this.emitEvidence();
      return `Evidence bundle created at ${evidencePath}`;
    }

    if (trimmed.startsWith('/resume')) {
      return 'Use switchboard-console --resume <session-id> to resume sessions.';
    }

    if (trimmed === '/exit') {
      await this.end();
      return 'Session ended.';
    }

    return this.sendMessage(trimmed);
  }

  async end(): Promise<void> {
    await this.logEvent('session_end', {});
    if (this.providerSession) {
      await this.providerSession.stop();
    }
  }

  private async switchAgent(agent: ProviderId): Promise<void> {
    const next = adapterById(this.adapters, agent);
    if (!next) {
      throw new Error(`Unknown agent: ${agent}`);
    }
    const available = await next.isAvailable();
    if (!available) {
      throw new Error(`${next.displayName} is not available in this session.`);
    }
    this.provider = next;
    this.providerSession = null;
    await this.logEvent('step_start', { action: 'agent_switch', agent });
  }

  private async switchSkillset(skillsetName: string): Promise<void> {
    const skillsetFile = await this.skillsetStore.getWithPath(skillsetName);
    this.skillset = skillsetFile.skillset;
    await this.logEvent('file_read', {
      target: skillsetFile.path,
      reason: 'skillset_load',
    });
    this.providerSession = null;
    await this.logEvent('step_start', {
      action: 'skillset_switch',
      skillset: this.skillset.name,
    });
  }

  private async sendMessage(message: string): Promise<string> {
    const companyOSRes = await checkCompanyOSPolicy(
      'default-tenant',
      'default-actor',
      'FlowStart',
      'chat-message',
    );

    if (!companyOSRes.allowed) {
      return `Denied by companyOS policy: ${companyOSRes.reason} (Audit: ${companyOSRes.auditEventId})`;
    }

    // Emit evidence
    await emitEvidenceToIntelGraph({
      evidenceId: `EVID:default-tenant:FlowStart:${companyOSRes.auditEventId}`,
      timestamp: new Date().toISOString(),
      tenantId: 'default-tenant',
      actorId: 'default-actor',
      kind: 'FlowStart',
      resource: 'chat-message',
      decision: 'allow',
      reasons: [],
      policyVersion: 'v1.0.0',
      auditEventId: companyOSRes.auditEventId!,
    });

    if (!this.provider) {
      await this.switchAgent('codex');
    }
    if (!this.skillset) {
      await this.switchSkillset('senior-swe');
    }

    if (!this.providerSession) {
      this.providerSession = await this.provider.startSession({
        sessionId: this.sessionId,
        systemPrompt: this.skillset.systemPrompt,
      });
    }

    await this.logEvent('step_start', {
      action: 'message',
      provider: this.provider.id,
    });

    await this.transcript.write(`> ${message}`);
    await this.logFileWrite(this.transcript.path, 'transcript_append');

    let response = '';
    await this.providerSession.sendMessage(message, {
      onToken: (token) => {
        response += token;
      },
      onToolAction: (action) => this.logToolAction(action),
    });

    await this.transcript.write(response);
    await this.logFileWrite(this.transcript.path, 'transcript_append');
    return response;
  }

  private async runCommand(command: string): Promise<string> {
    const decision = this.policyGate.evaluate(command);
    const companyOSRes = await checkCompanyOSPolicy(
      'default-tenant',
      'default-actor',
      'ToolInvoke',
      command,
    );

    await this.logEvent('tool_exec', {
      command,
      allowed: decision.allowed && companyOSRes.allowed,
      reason: decision.reason,
      companyOSReason: companyOSRes.reason,
      mode: decision.mode,
      auditEventId: companyOSRes.auditEventId,
    });

    if (!decision.allowed) {
      return `Denied by local policy: ${decision.reason}`;
    }

    if (!companyOSRes.allowed) {
      return `Denied by companyOS policy: ${companyOSRes.reason} (Audit: ${companyOSRes.auditEventId})`;
    }

    // Emit evidence
    await emitEvidenceToIntelGraph({
      evidenceId: `EVID:default-tenant:ToolInvoke:${companyOSRes.auditEventId}`,
      timestamp: new Date().toISOString(),
      tenantId: 'default-tenant',
      actorId: 'default-actor',
      kind: 'ToolInvoke',
      resource: command,
      decision: 'allow',
      reasons: [],
      policyVersion: 'v1.0.0',
      auditEventId: companyOSRes.auditEventId!,
    });

    const output = await execAsync(command, { cwd: process.cwd() });
    const commandDir = path.join(this.sessionDir, 'commands');
    await mkdir(commandDir, { recursive: true });
    const outputPath = path.join(
      commandDir,
      `${Date.now()}-${command.split(' ')[0]}.log`,
    );
    await writeFile(outputPath, `${output.stdout}\n${output.stderr}`);
    await this.logFileWrite(outputPath, 'command_output');

    if (command.includes('test') || command.includes('smoke')) {
      await this.logEvent('tests_run', { command });
    }

    return output.stdout || output.stderr || 'Command completed.';
  }

  private async emitEvidence(): Promise<string> {
    const diffPath = await this.captureGitDiff();
    if (diffPath) {
      await this.logFileWrite(diffPath, 'git_diff');
    }
    const bundler = new EvidenceBundler(this.sessionDir);
    const evidencePath = await bundler.createBundle();
    await this.logFileWrite(evidencePath, 'evidence_bundle');
    return evidencePath;
  }

  private async logToolAction(action: ToolAction): Promise<void> {
    if (action.type === 'tool_exec') {
      await this.logEvent('tool_exec', { action });
      return;
    }
    if (action.type === 'file_read') {
      await this.logEvent('file_read', { action });
      return;
    }
    if (action.type === 'file_write') {
      await this.logEvent('file_write', { action });
    }
  }

  private async logFileWrite(target: string, reason: string): Promise<void> {
    await this.logEvent('file_write', { target, reason });
  }

  private async logEvent(type: EventRecord['type'], data: EventRecord['data']) {
    const event: EventRecord = {
      id: randomUUID(),
      type,
      timestamp: nowIso(),
      sessionId: this.sessionId,
      data,
    };
    await this.eventLogger.log(event);
  }

  private async captureGitDiff(): Promise<string | null> {
    try {
      const output = await execAsync('git diff --patch', {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      });
      const diffPath = path.join(this.sessionDir, 'git-diff.patch');
      await writeFile(diffPath, output.stdout);
      await this.logEvent('tool_exec', {
        command: 'git diff --patch',
        allowed: true,
        reason: 'evidence_bundle',
        mode: 'allow-all',
      });
      return diffPath;
    } catch (error) {
      await this.logEvent('tool_exec', {
        command: 'git diff --patch',
        allowed: false,
        reason: error instanceof Error ? error.message : String(error),
        mode: 'deny-by-default',
      });
      return null;
    }
  }
}
