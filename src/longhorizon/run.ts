import path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { z } from 'zod';
import {
  CandidateRecord,
  EvaluationProfile,
  RunConfig,
  RunRecord,
} from './types';
import { MemoryStore } from './memory';
import { MapElitesArchive } from './map-elites';
import { IslandModel } from './islands';
import { evaluateCandidate, EvaluatorOptions } from './evaluator';
import { writeEvidenceBundle } from './evidence';
import { SwitchboardRouter } from './switchboard';
import { IntelGraphStore } from './intelgraph';
import { ensureDir, estimateTokens, redactValue, sha256, stableStringify } from './utils';

export interface LongHorizonRunnerOptions {
  baseArtifactsDir?: string;
  evaluationProfile: EvaluationProfile;
  checkpointDir?: string;
}

export interface CheckpointState {
  run: RunRecord;
  candidates: CandidateRecord[];
  archive: Array<[string, CandidateRecord]>;
  islandState: ReturnType<IslandModel['listIslands']>;
  memory: ReturnType<MemoryStore['list']>;
}

export class LongHorizonRunner {
  private readonly config: RunConfig;
  private readonly memory: MemoryStore;
  private readonly archive: MapElitesArchive;
  private readonly islands: IslandModel;
  private readonly router: SwitchboardRouter;
  private readonly intelGraph: IntelGraphStore;
  private readonly baseArtifactsDir: string;
  private readonly checkpointDir: string;
  private runRecord: RunRecord;
  private readonly seenPatchHashes = new Set<string>();
  private readonly candidateMap = new Map<string, CandidateRecord>();
  private tokenBudgetUsed = 0;
  private toolCalls = 0;
  private startTime = Date.now();

  constructor(config: RunConfig, options: LongHorizonRunnerOptions) {
    this.config = config;
    this.memory = new MemoryStore({
      tenantId: config.tenantId,
      runId: config.runId,
    });
    this.archive = new MapElitesArchive({
      riskBins: [3, 7, 12],
      diffSizeBins: [20, 80, 200],
      testImpactBins: [1, 3, 6],
    });
    this.islands = new IslandModel(config.islands, config.migrationInterval);
    this.router = new SwitchboardRouter(config.runId);
    this.intelGraph = new IntelGraphStore();
    this.baseArtifactsDir = options.baseArtifactsDir ?? 'artifacts/longhorizon';
    this.checkpointDir = options.checkpointDir ?? 'artifacts/longhorizon-checkpoints';
    this.runRecord = {
      id: config.runId,
      tenantId: config.tenantId,
      startedAt: new Date().toISOString(),
      steps: config.steps.map((step) => step.id),
      memoryNodes: [],
      candidates: [],
      evaluations: [],
      patches: [],
    };
    this.seedCandidates();
    this.registerTools();
  }

  static async resume(
    checkpointPath: string,
    config: RunConfig,
    options: LongHorizonRunnerOptions,
  ): Promise<LongHorizonRunner> {
    const data = JSON.parse(await fs.readFile(checkpointPath, 'utf-8')) as CheckpointState;
    const runner = new LongHorizonRunner(config, options);
    runner.runRecord = data.run;
    data.candidates.forEach((candidate) => runner.trackCandidate(candidate));
    data.archive.forEach(([key, candidate]) => {
      runner.archive.insert(candidate);
      runner.archive.getCell(key);
    });
    data.memory.forEach((node) => runner.memory.addNode(node.scope, node.payload));
    data.islandState.forEach((island) => {
      runner.islands.seed(island.id, island.queue);
    });
    return runner;
  }

  async run(): Promise<string> {
    this.startTime = Date.now();
    const workingNode = this.memory.addNode('working', {
      taskPrompt: this.config.taskPrompt,
      steps: this.config.steps.map((step) => step.title),
    });
    const semanticNode = this.memory.addNode('semantic', {
      invariants: ['policy-gated', 'evidence-first', 'tenant-scoped'],
      components: ['maestro', 'switchboard', 'intelgraph'],
    });
    this.runRecord.memoryNodes.push(workingNode.id, semanticNode.id);
    this.intelGraph.addMemoryNode(workingNode);
    this.intelGraph.addMemoryNode(semanticNode);
    for (;;) {
      this.enforceBudgets();
      const next = this.islands.nextCandidate();
      if (!next) {
        break;
      }
      const evaluated = await this.evaluateCandidate(next.candidate, next.islandId);
      this.islands.recordResult(next.islandId, evaluated);
      this.islands.tickGeneration(this.archive.list().slice(0, 2));
      if (!evaluated.evaluation?.passed) {
        this.spawnDebuggerCandidate(evaluated);
      }
    }

    const evidenceDir = await this.flushEvidence();
    return evidenceDir;
  }

  async checkpoint(): Promise<string> {
    await ensureDir(this.checkpointDir);
    const checkpointPath = path.join(this.checkpointDir, `${this.config.runId}.json`);
    const state: CheckpointState = {
      run: this.runRecord,
      candidates: Array.from(this.candidateMap.values()),
      archive: this.archive.list().map((candidate) => [this.archive.cellKey(candidate), candidate]),
      islandState: this.islands.listIslands(),
      memory: this.memory.list(),
    };
    await fs.writeFile(checkpointPath, stableStringify(state));
    return checkpointPath;
  }

  private seedCandidates(): void {
    const seeds = this.config.candidateSeeds.map((seed) => this.buildCandidate(seed));
    seeds.forEach((candidate, index) => {
      const islandId = `island-${(index % this.config.islands) + 1}`;
      this.islands.seed(islandId, [candidate]);
    });
  }

  private buildCandidate(seed: RunConfig['candidateSeeds'][number]): CandidateRecord {
    const patchId = sha256(seed.patch);
    const filesTouched = extractFiles(seed.patch);
    const candidate: CandidateRecord = {
      id: sha256(`${seed.id}:${patchId}`),
      title: seed.title,
      patch: {
        id: patchId,
        diff: minimizePatch(seed.patch),
        filesTouched,
      },
      metadata: seed.metadata,
      status: 'queued',
      noveltyScore: this.noveltyScore(seed.patch),
    };
    this.trackCandidate(candidate);
    return candidate;
  }

  private trackCandidate(candidate: CandidateRecord): void {
    this.runRecord.candidates.push(candidate.id);
    this.runRecord.patches.push(candidate.patch.id);
    this.candidateMap.set(candidate.id, candidate);
  }

  private async evaluateCandidate(
    candidate: CandidateRecord,
    stepId: string,
  ): Promise<CandidateRecord> {
    const policyViolations = this.policyGate(candidate);
    const riskFlags = this.riskHeuristics(candidate);
    this.tokenBudgetUsed += estimateTokens(candidate.patch.diff);
    const evaluation = await evaluateCandidate(
      candidate,
      {
        run: async (command) => {
          this.toolCalls += 1;
          return this.router.callTool(stepId, 'command', { command });
        },
      },
      {
        profile: this.config.evaluationProfile,
        policyGate: () => policyViolations,
        riskHeuristics: () => riskFlags,
        reviewers: [
          () => candidate.metadata.risk < 10,
          () => candidate.metadata.diffSize < 200,
        ],
      } satisfies EvaluatorOptions,
    );

    candidate.evaluation = evaluation;
    candidate.status = evaluation.passed ? 'evaluated' : 'rejected';
    this.runRecord.evaluations.push(evaluation.id);
    this.candidateMap.set(candidate.id, candidate);
    this.intelGraph.addEvaluation(evaluation);
    this.intelGraph.addPatch(candidate.patch);
    this.intelGraph.addCandidate(candidate);

    if (evaluation.passed) {
      const archiveResult = this.archive.insert(candidate);
      candidate.status = archiveResult.promoted ? 'archived' : 'evaluated';
    }

    const episodicNode = this.memory.addNode('episodic', {
      candidateId: candidate.id,
      evaluationId: evaluation.id,
      stepId,
    });
    this.runRecord.memoryNodes.push(episodicNode.id);
    this.intelGraph.addMemoryNode(episodicNode);

    return candidate;
  }

  private policyGate(candidate: CandidateRecord): string[] {
    const disallowed = candidate.patch.filesTouched.filter(
      (file) => !this.config.allowedPaths.some((pathPrefix) => file.startsWith(pathPrefix)),
    );
    return disallowed.map((file) => `policy:path:${file}`);
  }

  private riskHeuristics(candidate: CandidateRecord): string[] {
    const flags: string[] = [];
    if (candidate.patch.filesTouched.some((file) => file.includes('auth'))) {
      flags.push('risk:auth-surface');
    }
    if (candidate.patch.filesTouched.some((file) => file.includes('billing'))) {
      flags.push('risk:billing-surface');
    }
    return flags;
  }

  private spawnDebuggerCandidate(candidate: CandidateRecord): void {
    const recoveryPatch = candidate.patch.diff
      .split('\n')
      .filter((line) => !line.startsWith('-'))
      .join('\n');
    const recoveryCandidate: CandidateRecord = {
      ...candidate,
      id: sha256(`${candidate.id}:debug`),
      title: `${candidate.title} (debugger)`,
      patch: {
        ...candidate.patch,
        diff: recoveryPatch,
      },
      status: 'queued',
      noveltyScore: this.noveltyScore(recoveryPatch),
    };
    const islandId = 'island-1';
    this.islands.seed(islandId, [recoveryCandidate]);
  }

  private noveltyScore(patch: string): number {
    const hash = sha256(patch);
    if (this.seenPatchHashes.has(hash)) {
      return 0;
    }
    this.seenPatchHashes.add(hash);
    return 1;
  }

  private enforceBudgets(): void {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    if (elapsedSeconds > this.config.budgets.maxSeconds) {
      throw new Error('Budget exceeded: time');
    }
    if (this.toolCalls > this.config.budgets.maxToolCalls) {
      throw new Error('Budget exceeded: tool calls');
    }
    if (this.tokenBudgetUsed > this.config.budgets.maxTokens) {
      throw new Error('Budget exceeded: tokens');
    }
  }

  private getCandidate(id: string): CandidateRecord | undefined {
    return this.candidateMap.get(id);
  }

  private async flushEvidence(): Promise<string> {
    await ensureDir(this.baseArtifactsDir);
    const archiveSummary = this.archive
      .list()
      .map((candidate) => ({
        key: this.archive.cellKey(candidate),
        candidateId: candidate.id,
      }));
    this.intelGraph.addRun(this.runRecord);
    return writeEvidenceBundle(this.baseArtifactsDir, this.config.runId, {
      config: this.config,
      candidates: this.archive.list(),
      evaluations: this.archive
        .list()
        .map((candidate) => candidate.evaluation!)
        .filter(Boolean),
      toolCalls: this.router.listLogs(),
      archiveSummary,
      intelGraph: this.intelGraph.export(),
    });
  }

  private registerTools(): void {
    const execAsync = promisify(exec);
    const allowedCommands = new Set([
      ...this.config.evaluationProfile.commands,
      ...this.config.evaluationProfile.targetedTests,
    ]);
    this.router.registerTool({
      name: 'command',
      description: 'Run a deterministic command during evaluation',
      argsSchema: z.object({ command: z.string() }),
      permissionTier: 'execute',
      handler: async ({ command }) => {
        if (!allowedCommands.has(command)) {
          return {
            exitCode: 1,
            output: redactValue(`Command not allowed: ${command}`) as string,
            durationMs: 0,
          };
        }
        const start = Date.now();
        try {
          const result = await execAsync(command, { cwd: process.cwd() });
          return {
            exitCode: 0,
            output: redactValue(`${result.stdout}${result.stderr}`) as string,
            durationMs: Date.now() - start,
          };
        } catch (error) {
          const err = error as { stdout?: string; stderr?: string; code?: number };
          return {
            exitCode: typeof err.code === 'number' ? err.code : 1,
            output: redactValue(`${err.stdout ?? ''}${err.stderr ?? ''}`) as string,
            durationMs: Date.now() - start,
          };
        }
      },
    });
  }
}

function minimizePatch(patch: string): string {
  return patch
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line !== '')
    .join('\n');
}

function extractFiles(patch: string): string[] {
  const files = new Set<string>();
  patch.split('\n').forEach((line) => {
    if (line.startsWith('+++ b/')) {
      files.add(line.replace('+++ b/', '').trim());
    }
  });
  return Array.from(files.values());
}
