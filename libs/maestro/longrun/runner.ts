import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { BudgetTracker } from './budget.js';
import {
  createEvidenceManifest,
  recordIteration,
  writeEvidenceManifest,
} from './evidence.js';
import {
  evaluateStopConditions,
  initialStopState,
} from './stop-conditions.js';
import type {
  IterationInput,
  LongRunJobSpec,
  StopDecision,
  StopState,
} from './types.js';

export class LongRunJobRunner {
  private readonly workspaceRoot: string;
  private readonly job: LongRunJobSpec;
  private readonly budget: BudgetTracker;
  private readonly stopState: StopState;
  private readonly evidenceDir: string;
  private readonly checkpointsDir: string;
  private manifest = createEvidenceManifest(this.job, new Date().toISOString());

  constructor(options: { workspaceRoot: string; job: LongRunJobSpec }) {
    this.workspaceRoot = options.workspaceRoot;
    this.job = options.job;
    this.budget = new BudgetTracker(options.job.budgets);
    this.stopState = initialStopState();
    this.evidenceDir = path.join(this.workspaceRoot, '.maestro', 'evidence');
    this.checkpointsDir = path.join(
      this.workspaceRoot,
      '.maestro',
      'checkpoints',
      this.job.job_id,
    );
  }

  runIteration(iteration: IterationInput): StopDecision {
    this.budget.record(iteration.metrics);
    const checkpointPath = this.writeCheckpoint(iteration);
    const stopDecision = evaluateStopConditions({
      iteration,
      state: this.stopState,
      policy: this.job.stop_conditions,
      budget: this.budget,
      workspaceRoot: this.workspaceRoot,
    });

    this.manifest = recordIteration({
      manifest: this.manifest,
      iteration,
      stopDecision,
      checkpointPath,
      timestamp: new Date().toISOString(),
    });

    writeEvidenceManifest({
      manifest: this.manifest,
      outputDir: this.evidenceDir,
      jobId: this.job.job_id,
    });
    this.createEvidenceBundle();

    return stopDecision;
  }

  private writeCheckpoint(iteration: IterationInput): string {
    const checkpointPath = path.join(
      this.checkpointsDir,
      String(iteration.iteration).padStart(4, '0'),
    );
    fs.mkdirSync(checkpointPath, { recursive: true });

    if (iteration.planDiff) {
      fs.writeFileSync(
        path.join(checkpointPath, 'plan-diff.md'),
        iteration.planDiff,
        'utf-8',
      );
    }

    if (iteration.patch) {
      fs.writeFileSync(
        path.join(checkpointPath, 'patch.diff'),
        iteration.patch,
        'utf-8',
      );
    }

    if (iteration.commandLog) {
      fs.writeFileSync(
        path.join(checkpointPath, 'command.log'),
        `${iteration.commandLog.join('\n')}\n`,
        'utf-8',
      );
    }

    if (iteration.testReport) {
      fs.writeFileSync(
        path.join(checkpointPath, 'test-report.json'),
        `${JSON.stringify(iteration.testReport, null, 2)}\n`,
        'utf-8',
      );
    }

    if (iteration.summary) {
      fs.writeFileSync(
        path.join(checkpointPath, 'summary.md'),
        iteration.summary,
        'utf-8',
      );
    }

    return checkpointPath;
  }

  private createEvidenceBundle(): void {
    fs.mkdirSync(this.evidenceDir, { recursive: true });
    const tarPath = path.join(this.evidenceDir, `${this.job.job_id}.tar.gz`);
    const manifestPath = path.join(
      this.evidenceDir,
      `${this.job.job_id}.manifest.json`,
    );

    const tarArgs = [
      '-czf',
      tarPath,
      '-C',
      this.workspaceRoot,
      '.maestro/checkpoints',
      `.maestro/evidence/${path.basename(manifestPath)}`,
    ];

    const result = spawnSync('tar', tarArgs, { stdio: 'pipe' });
    if (result.status !== 0) {
      const errorLog = result.stderr?.toString() || 'unknown tar error';
      fs.writeFileSync(
        path.join(this.evidenceDir, `${this.job.job_id}.tar.error.log`),
        errorLog,
        'utf-8',
      );
    }
  }
}
