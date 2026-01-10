import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { randomUUID } from 'crypto';
import {
  AgentRegistryEntry,
  LogHooks,
  RedteamHarnessOptions,
  RedteamRunRecord,
  RedteamScenario,
  RedteamEvent,
  RedteamDecision,
  ProvenanceEntry,
} from './types.js';
import { AgentTaskRegistry } from './AgentTaskRegistry.js';
import { PromptRegistry } from './PromptRegistry.js';
import { ConfigLoader } from '../utils/ConfigLoader.js';
import { Logger } from '../utils/Logger.js';

export class RedteamHarness {
  private scenarioDir: string;
  private artifactRoot: string;
  private repoRoot: string;
  private logger: Logger;
  private agentRegistry: AgentTaskRegistry;
  private promptRegistry: PromptRegistry;
  private hooks?: LogHooks;
  private config = ConfigLoader.getDefaults();

  constructor(options?: RedteamHarnessOptions) {
    this.repoRoot = path.resolve(__dirname, '..', '..', '..');
    this.scenarioDir =
      options?.scenarioDir || path.resolve(__dirname, '..', '..', 'agent-redteam', 'scenarios');
    this.artifactRoot =
      options?.artifactRoot || path.resolve(this.repoRoot, 'artifacts', 'agent-runs');
    this.logger = new Logger('RedteamHarness');
    this.promptRegistry = new PromptRegistry(options?.promptRegistryPath);
    this.agentRegistry = new AgentTaskRegistry(options?.registryPath, this.promptRegistry);
    this.hooks = options?.hooks;
    if (options?.config) {
      this.config = options.config;
    }
  }

  private loadScenario(scenarioId: string): RedteamScenario {
    const filename = `${scenarioId}.yaml`;
    const filepath = path.join(this.scenarioDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Redteam scenario not found: ${filepath}`);
    }

    const raw = fs.readFileSync(filepath, 'utf8');
    const scenario = yaml.load(raw) as RedteamScenario;

    if (!scenario || scenario.id !== scenarioId) {
      throw new Error(`Scenario file ${filename} is malformed or mismatched`);
    }

    return scenario;
  }

  private ensureArtifactDir(): void {
    if (!fs.existsSync(this.artifactRoot)) {
      fs.mkdirSync(this.artifactRoot, { recursive: true });
    }
  }

  private buildArtifactPath(taskId: string, runId: string): string {
    return path.join(this.artifactRoot, `${taskId}-${runId}.json`);
  }

  private validateRegistryArtifactPath(registryEntry: AgentRegistryEntry): void {
    const registryArtifactPath = path.resolve(this.repoRoot, registryEntry.artifact_path);
    const expectedRoot = path.resolve(this.repoRoot, 'artifacts', 'agent-runs');

    if (!registryArtifactPath.startsWith(expectedRoot)) {
      throw new Error(
        `Registry artifact path must live under ${expectedRoot}: ${registryEntry.artifact_path}`
      );
    }
  }

  private assertScenarioMatchesRegistry(
    scenario: RedteamScenario,
    registryEntry: AgentRegistryEntry
  ): void {
    if (registryEntry.task_id !== scenario.task_id) {
      throw new Error(
        `Task ID mismatch between registry (${registryEntry.task_id}) and scenario (${scenario.task_id})`
      );
    }

    if (registryEntry.agent_id !== scenario.agent_id) {
      throw new Error(
        `Agent ID mismatch between registry (${registryEntry.agent_id}) and scenario (${scenario.agent_id})`
      );
    }

    const promptKeys: Array<keyof RedteamScenario['prompt_ref']> = [
      'id',
      'version',
      'sha256',
      'path',
    ];

    for (const key of promptKeys) {
      if (registryEntry.prompt_ref[key] !== scenario.prompt_ref[key]) {
        throw new Error(`Prompt ref mismatch for ${key}`);
      }
    }
  }

  private emitEvent(event: RedteamEvent): void {
    this.hooks?.onEvent?.(event);
  }

  private emitDecision(decision: RedteamDecision): void {
    this.hooks?.onDecision?.(decision);
  }

  private emitProvenance(provenance: ProvenanceEntry): void {
    this.hooks?.onProvenance?.(provenance);
  }

  private enrichAttackVectors(
    scenario: RedteamScenario,
    registryEntry: AgentRegistryEntry
  ): {
    transcript: RedteamEvent[];
    decisions: RedteamDecision[];
  } {
    const transcript: RedteamEvent[] = [];
    const decisions: RedteamDecision[] = [];

    for (const vector of scenario.attack_vectors) {
      const timestamp = new Date().toISOString();
      if (vector.kind === 'impersonation') {
        const event: RedteamEvent = {
          type: 'impersonation',
          actor: scenario.agent_id,
          channel: 'identity',
          message: `Impersonate ${vector.target}: ${vector.payload}`,
          severity: 'critical',
          timestamp,
        };
        transcript.push(event);
        this.emitEvent(event);

        const decision: RedteamDecision = {
          step: `impersonation:${vector.target}`,
          rationale: 'Attempting privileged identity takeover to reach guarded channels.',
          outcome: 'blocked',
          risk_score: 9,
          evidence: vector.success_signals,
          timestamp,
        };
        decisions.push(decision);
        this.emitDecision(decision);
      }

      if (vector.kind === 'prompt-injection') {
        const event: RedteamEvent = {
          type: 'prompt-injection',
          actor: scenario.agent_id,
          channel: vector.channel,
          message: `Injected prompt: ${vector.payload}`,
          severity: 'critical',
          timestamp,
        };
        transcript.push(event);
        this.emitEvent(event);

        const decision: RedteamDecision = {
          step: `prompt-injection:${vector.channel}`,
          rationale:
            vector.detection_expectation ||
            'Expect governance engine to flag injection and quarantine session.',
          outcome: 'allowed',
          risk_score: 8,
          evidence: ['prompt-injection-default'],
          timestamp,
        };
        decisions.push(decision);
        this.emitDecision(decision);
      }

      if (vector.kind === 'mitm') {
        const event: RedteamEvent = {
          type: 'mitm',
          actor: scenario.agent_id,
          channel: vector.channel,
          message: `MITM mutation: ${vector.mutation}`,
          severity: 'critical',
          timestamp,
        };
        transcript.push(event);
        this.emitEvent(event);

        const decision: RedteamDecision = {
          step: `mitm:${vector.channel}`,
          rationale:
            vector.detection_expectation || 'Expect channel integrity checks to fail fast.',
          outcome: 'blocked',
          risk_score: 9,
          evidence: ['channel-integrity'],
          timestamp,
        };
        decisions.push(decision);
        this.emitDecision(decision);
      }
    }

    if (scenario.controls?.detection) {
      for (const expectation of scenario.controls.detection) {
        const event: RedteamEvent = {
          type: 'control',
          message: `Detection expectation: ${expectation}`,
          severity: 'warn',
          timestamp: new Date().toISOString(),
        };
        transcript.push(event);
        this.emitEvent(event);
      }
    }

    if (scenario.controls?.mitigations) {
      for (const mitigation of scenario.controls.mitigations) {
        const decision: RedteamDecision = {
          step: 'mitigation',
          rationale: mitigation,
          outcome: 'deferred',
          risk_score: 5,
          timestamp: new Date().toISOString(),
        };
        decisions.push(decision);
        this.emitDecision(decision);
      }
    }

    return { transcript, decisions };
  }

  private buildProvenance(
    scenario: RedteamScenario,
    registryEntry: AgentRegistryEntry,
    artifactPath: string
  ): ProvenanceEntry[] {
    const entries: ProvenanceEntry[] = [
      {
        type: 'prompt',
        description: `Prompt hash for ${scenario.prompt_ref.id}@${scenario.prompt_ref.version}`,
        reference: registryEntry.prompt_ref.path,
        sha256: registryEntry.prompt_ref.sha256,
        timestamp: new Date().toISOString(),
      },
      {
        type: 'policy',
        description: 'Task spec linked for governance checks',
        reference: registryEntry.task_spec,
        timestamp: new Date().toISOString(),
      },
      {
        type: 'artifact',
        description: 'Run artifact emitted for audit',
        reference: artifactPath,
        timestamp: new Date().toISOString(),
      },
    ];

    for (const entry of entries) {
      this.emitProvenance(entry);
    }

    return entries;
  }

  listRegisteredScenarios(): AgentRegistryEntry[] {
    return this.agentRegistry.getAll();
  }

  runScenario(
    scenarioId: string,
    options?: { runId?: string; emitArtifact?: boolean }
  ): RedteamRunRecord {
    const scenario = this.loadScenario(scenarioId);
    const registryEntry = this.agentRegistry.getScenario(scenarioId);

    this.assertScenarioMatchesRegistry(scenario, registryEntry);
    this.validateRegistryArtifactPath(registryEntry);

    this.promptRegistry.validatePromptRef(scenario.prompt_ref);

    const runId = options?.runId || randomUUID();
    this.ensureArtifactDir();
    const artifactPath = this.buildArtifactPath(registryEntry.task_id, runId);

    const { transcript, decisions } = this.enrichAttackVectors(scenario, registryEntry);
    const includeTranscript = scenario.artifacts?.transcript !== false;
    const includeDecisions = scenario.artifacts?.decisions !== false;
    const includeProvenance = scenario.artifacts?.provenance !== false;
    const provenance = includeProvenance
      ? this.buildProvenance(scenario, registryEntry, artifactPath)
      : [];

    const record: RedteamRunRecord = {
      run_id: runId,
      scenario,
      registry: registryEntry,
      transcript: includeTranscript ? transcript : [],
      decisions: includeDecisions ? decisions : [],
      provenance,
      config: this.config,
      artifact_path: artifactPath,
    };

    if (options?.emitArtifact !== false) {
      fs.writeFileSync(artifactPath, JSON.stringify(record, null, 2));
      this.logger.info(`Redteam artifact emitted: ${artifactPath}`);
    }

    return record;
  }
}
