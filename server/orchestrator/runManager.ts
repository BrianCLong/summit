// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { Run, CreateRunRequest, RunStatus, Artifact } from './types';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), '.maestro/runs.db.json');

export class RunManager {
  private runStore: Map<string, Run> = new Map();
  private idempotencyIndex: Map<string, string> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        this.runStore = new Map(Object.entries(data.runs));
        this.idempotencyIndex = new Map(Object.entries(data.idempotency));
        // logger.info('Loaded runs from persistence');
      } else {
          // Ensure directory exists
          const dir = path.dirname(DB_PATH);
          if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
          }
      }
    } catch (err) {
      logger.error('Failed to load run DB', err);
    }
  }

  private save() {
    try {
      const data = {
        runs: Object.fromEntries(this.runStore),
        idempotency: Object.fromEntries(this.idempotencyIndex),
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
      logger.error('Failed to save run DB', err);
    }
  }

  async createRun(request: CreateRunRequest): Promise<Run> {
    // Reload to get latest state (simulating shared DB)
    this.load();

    if (request.idempotencyKey && this.idempotencyIndex.has(request.idempotencyKey)) {
      const existingRunId = this.idempotencyIndex.get(request.idempotencyKey)!;
      logger.info(`Idempotency hit for key ${request.idempotencyKey}, returning run ${existingRunId}`);
      return this.runStore.get(existingRunId)!;
    }

    const runId = uuidv4();
    const now = new Date().toISOString();

    const run: Run = {
      id: runId,
      type: request.type,
      status: 'queued',
      idempotencyKey: request.idempotencyKey,
      createdAt: now,
      input: request.input,
      metadata: request.metadata,
      artifacts: [],
      evidenceIds: [],
      childRunIds: [],
      parentId: request.parentId,
    };

    this.runStore.set(runId, run);

    if (request.idempotencyKey) {
      this.idempotencyIndex.set(request.idempotencyKey, runId);
    }

    if (request.parentId) {
      const parent = this.runStore.get(request.parentId);
      if (parent) {
        parent.childRunIds.push(runId);
        this.runStore.set(request.parentId, parent); // Update parent
      }
    }

    this.save();
    logger.info(`Created run ${runId} of type ${run.type}`);
    return run;
  }

  async getRun(runId: string): Promise<Run | undefined> {
    this.load(); // Refresh state
    return this.runStore.get(runId);
  }

  async updateStatus(runId: string, status: RunStatus, error?: string): Promise<Run> {
    this.load();
    const run = this.runStore.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.status = status;
    if (status === 'running' && !run.startedAt) {
      run.startedAt = new Date().toISOString();
    }
    if (['succeeded', 'failed', 'cancelled'].includes(status)) {
      run.completedAt = new Date().toISOString();
    }
    if (error) {
      run.error = error;
    }

    this.runStore.set(runId, run);
    this.save();
    logger.info(`Updated run ${runId} status to ${status}`);
    return run;
  }

  async completeRun(runId: string, output: any): Promise<Run> {
    this.load();
    const run = this.runStore.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.status = 'succeeded';
    run.completedAt = new Date().toISOString();
    run.output = output;

    this.runStore.set(runId, run);
    this.save();
    logger.info(`Completed run ${runId}`);
    return run;
  }

  async addArtifact(runId: string, artifact: Artifact): Promise<Run> {
    this.load();
    const run = this.runStore.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.artifacts.push(artifact);
    this.runStore.set(runId, run);
    this.save();
    return run;
  }

  async addEvidenceId(runId: string, evidenceId: string): Promise<Run> {
    this.load();
    const run = this.runStore.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.evidenceIds.push(evidenceId);
    this.runStore.set(runId, run);
    this.save();
    return run;
  }
}

export const runManager = new RunManager();
