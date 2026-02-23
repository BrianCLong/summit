/**
 * Switchboard Capsule Runner
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as crypto from 'crypto';
import {
  CapsuleManifest,
  CapsuleStep,
  loadCapsuleManifest,
  normalizeRelativePath,
} from './switchboard-capsule.js';
import { CapsuleLedger } from './switchboard-ledger.js';
import { CapsulePolicyGate, CapsulePolicyAction } from './switchboard-policy.js';
import { TelemetryEmitter } from './telemetry.js';

export interface CapsuleRunOptions {
  manifestPath: string;
  repoRoot: string;
  sessionsRoot?: string;
  waiverToken?: string;
}

export interface CapsuleRunResult {
  sessionId: string;
  sessionDir: string;
  status: 'completed' | 'failed';
  diffPath: string;
  outputsDir: string;
  ledgerPath: string;
}

function createSessionId(): string {
  return `capsule-${crypto.randomUUID()}`;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyPath(src: string, dest: string, allowMissing: boolean): void {
  if (!fs.existsSync(src)) {
    if (allowMissing) {
      return;
    }
    throw new Error(`Capsule path missing: ${src}`);
  }
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
}

function bootstrapWritePath(baseDir: string, normalizedPath: string, isDirHint: boolean): void {
  if (!normalizedPath) {
    return;
  }
  const targetPath = path.join(baseDir, normalizedPath);
  if (fs.existsSync(targetPath)) {
    return;
  }
  if (isDirHint) {
    ensureDir(targetPath);
    return;
  }
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, '', 'utf8');
}

function buildEnv(manifest: CapsuleManifest, secrets: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '',
  };
  for (const key of manifest.env_allowlist) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  if (manifest.time.timezone) {
    env.TZ = manifest.time.timezone;
  }
  if (manifest.time.locale) {
    env.LANG = manifest.time.locale;
    env.LC_ALL = manifest.time.locale;
  }
  if (manifest.time.fixed_time) {
    const epoch = Date.parse(manifest.time.fixed_time);
    if (!Number.isNaN(epoch)) {
      env.SOURCE_DATE_EPOCH = Math.floor(epoch / 1000).toString();
    }
  }
  for (const [handle, value] of Object.entries(secrets)) {
    env[`SWITCHBOARD_SECRET_${handle}`] = value;
  }
  env.SWITCHBOARD_NETWORK = manifest.network_mode;
  return env;
}

function normalizeCapsulePaths(
  paths: string[]
): { original: string; normalized: string; isDirHint: boolean }[] {
  return paths.map((entry) => {
    const normalized = normalizeRelativePath(entry);
    if (!normalized) {
      throw new Error(`Invalid capsule path: ${entry}`);
    }
    return { original: entry, normalized, isDirHint: entry.endsWith('/') };
  });
}

function parseDiffFiles(diffText: string): string[] {
  const files = new Set<string>();
  const lines = diffText.split('\n');
  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      const filePath = line.slice('+++ b/'.length).trim();
      if (filePath && filePath !== '/dev/null') {
        const normalized = filePath.startsWith('workspace/')
          ? filePath.slice('workspace/'.length)
          : filePath;
        files.add(normalized);
      }
    }
  }
  return Array.from(files).sort();
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function evaluatePolicy(
  ledger: CapsuleLedger,
  telemetry: TelemetryEmitter,
  gate: CapsulePolicyGate,
  action: CapsulePolicyAction,
  target: string,
  ids?: { job_id?: string; action_id?: string }
): void {
  const decision = gate.evaluate(action);
  const decisionData = {
    action: action.type,
    target,
    allow: decision.allow,
    reason: decision.reason,
    waiver_token: decision.waiver_token ?? null,
    waiver_reason: decision.waiver_reason ?? null,
  };

  ledger.append('policy_decision', decisionData);

  telemetry.emitPreflightDecision({
    rule: action.type,
    allow: decision.allow,
    reason: decision.reason,
  }, ids);

  if (!decision.allow) {
    throw new Error(`Policy denied ${action.type} for ${target}: ${decision.reason}`);
  }
}

function loadSecrets(
  step: CapsuleStep,
  gate: CapsulePolicyGate,
  ledger: CapsuleLedger,
  telemetry: TelemetryEmitter,
  job_id: string
): Record<string, string> {
  const secrets: Record<string, string> = {};
  for (const handle of step.secrets) {
    const action_id = crypto.randomUUID();
    evaluatePolicy(ledger, telemetry, gate, { type: 'secret', secret_handle: handle }, handle, { job_id, action_id });
    const value = process.env[`SWITCHBOARD_SECRET_${handle}`];
    if (!value) {
      throw new Error(`Secret handle missing in environment: ${handle}`);
    }
    secrets[handle] = value;
  }
  return secrets;
}

function evaluatePathActions(
  step: CapsuleStep,
  gate: CapsulePolicyGate,
  ledger: CapsuleLedger,
  telemetry: TelemetryEmitter,
  job_id: string
): void {
  for (const filePath of step.reads) {
    const action_id = crypto.randomUUID();
    evaluatePolicy(ledger, telemetry, gate, { type: 'read', path: filePath }, filePath, { job_id, action_id });
  }
  for (const filePath of step.writes) {
    const action_id = crypto.randomUUID();
    evaluatePolicy(ledger, telemetry, gate, { type: 'write', path: filePath }, filePath, { job_id, action_id });
  }
}

export async function runCapsule(options: CapsuleRunOptions): Promise<CapsuleRunResult> {
  const manifest = loadCapsuleManifest(options.manifestPath);
  const repoRoot = path.resolve(options.repoRoot);
  const sessionsRoot = options.sessionsRoot ?? path.join(repoRoot, '.switchboard', 'capsules');
  const sessionId = createSessionId();
  const sessionDir = path.join(sessionsRoot, sessionId);
  const snapshotDir = path.join(sessionDir, 'snapshot');
  const workspaceDir = path.join(sessionDir, 'workspace');
  const outputsDir = path.join(sessionDir, 'outputs');
  const diffPath = path.join(sessionDir, 'diff.patch');

  ensureDir(sessionDir);
  ensureDir(snapshotDir);
  ensureDir(workspaceDir);
  ensureDir(outputsDir);

  fs.writeFileSync(
    path.join(sessionDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  const ledger = new CapsuleLedger(sessionDir, sessionId);
  const telemetry = new TelemetryEmitter(repoRoot, sessionId);

  ledger.append('capsule_start', {
    manifest_path: path.resolve(options.manifestPath),
    network_mode: manifest.network_mode,
    step_count: manifest.steps.length,
  });

  const gate = new CapsulePolicyGate(manifest, options.waiverToken);

  const readPaths = normalizeCapsulePaths(manifest.allowed_paths.read);
  const writePaths = normalizeCapsulePaths(manifest.allowed_paths.write);

  for (const capsulePath of readPaths) {
    copyPath(
      path.join(repoRoot, capsulePath.normalized),
      path.join(snapshotDir, capsulePath.normalized),
      false
    );
    copyPath(
      path.join(repoRoot, capsulePath.normalized),
      path.join(workspaceDir, capsulePath.normalized),
      false
    );
  }

  for (const capsulePath of writePaths) {
    copyPath(
      path.join(repoRoot, capsulePath.normalized),
      path.join(snapshotDir, capsulePath.normalized),
      true
    );
    copyPath(
      path.join(repoRoot, capsulePath.normalized),
      path.join(workspaceDir, capsulePath.normalized),
      true
    );
    bootstrapWritePath(snapshotDir, capsulePath.normalized, capsulePath.isDirHint);
    bootstrapWritePath(workspaceDir, capsulePath.normalized, capsulePath.isDirHint);
  }

  let status: CapsuleRunResult['status'] = 'completed';
  let failure: Error | null = null;

  try {
    for (let index = 0; index < manifest.steps.length; index += 1) {
      const step = manifest.steps[index];
      const stepId = step.id ?? `step-${index + 1}`;
      const stepLabel = step.name ?? stepId;
      const jobId = stepId;

      const execActionId = crypto.randomUUID();
      evaluatePolicy(ledger, telemetry, gate, { type: 'exec', command: step.command }, step.command, { job_id: jobId, action_id: execActionId });

      const netActionId = crypto.randomUUID();
      evaluatePolicy(ledger, telemetry, gate, { type: 'network', allow_network: step.allow_network }, 'network', { job_id: jobId, action_id: netActionId });

      evaluatePathActions(step, gate, ledger, telemetry, jobId);

      const secrets = loadSecrets(step, gate, ledger, telemetry, jobId);
      const env = buildEnv(manifest, secrets);

      const toolActionId = crypto.randomUUID();
      telemetry.emitToolExecutionStart({
        tool: step.command,
        args: step.args,
      }, { job_id: jobId, action_id: toolActionId });

      const start = Date.now();
      const result = spawnSync(step.command, step.args, {
        cwd: workspaceDir,
        env,
        encoding: 'utf8',
      });
      const durationMs = Date.now() - start;

      const stdoutPath = path.join(outputsDir, `${stepId}.stdout.log`);
      const stderrPath = path.join(outputsDir, `${stepId}.stderr.log`);
      fs.writeFileSync(stdoutPath, result.stdout ?? '', 'utf8');
      fs.writeFileSync(stderrPath, result.stderr ?? '', 'utf8');

      ledger.append('tool_exec', {
        step_id: stepId,
        step_name: stepLabel,
        command: step.command,
        args: step.args,
        exit_code: result.status ?? 0,
        duration_ms: durationMs,
        stdout_path: path.relative(sessionDir, stdoutPath),
        stderr_path: path.relative(sessionDir, stderrPath),
      });

      telemetry.emitToolExecutionEnd({
        tool: step.command,
        exit_code: result.status ?? 0,
        duration_ms: durationMs,
      }, { job_id: jobId, action_id: toolActionId });

      if (step.category === 'test') {
        ledger.append('test_result', {
          step_id: stepId,
          status: result.status === 0 ? 'passed' : 'failed',
          exit_code: result.status ?? 0,
        });
      }

      if (result.status !== 0) {
        throw new Error(`Step failed (${stepLabel}) with exit code ${result.status}`);
      }
    }
  } catch (error) {
    status = 'failed';
    const message = error instanceof Error ? error.message : String(error);
    ledger.append('capsule_error', { message });
    failure = error instanceof Error ? error : new Error(message);
  } finally {
    const diffResult = spawnSync('git', ['diff', '--no-index', '--', 'snapshot', 'workspace'], {
      encoding: 'utf8',
      cwd: sessionDir,
    });
    const diffText = diffResult.stdout ?? '';
    fs.writeFileSync(diffPath, diffText, 'utf8');
    const diffHash = computeHash(diffText);

    ledger.append('diff_hash', {
      diff_path: path.relative(sessionDir, diffPath),
      hash: diffHash,
    });

    const changedFiles = parseDiffFiles(diffText);
    for (const filePath of changedFiles) {
      ledger.append('file_write', {
        path: filePath,
      });
    }

    const policyViolations: string[] = [];
    for (const filePath of changedFiles) {
      const action_id = crypto.randomUUID();
      const decision = gate.evaluate({ type: 'write', path: filePath });

      const decisionData = {
        action: 'write',
        target: filePath,
        allow: decision.allow,
        reason: decision.reason,
        waiver_token: decision.waiver_token ?? null,
        waiver_reason: decision.waiver_reason ?? null,
      };

      if (!decision.allow) {
        ledger.append('policy_decision', decisionData);
        policyViolations.push(filePath);
        status = 'failed';
      }

      telemetry.emitPreflightDecision({
        rule: 'write',
        allow: decision.allow,
        reason: decision.reason,
      }, { action_id });
    }

    ledger.append('capsule_end', {
      status,
      diff_hash: diffHash,
      outputs_dir: path.relative(sessionDir, outputsDir),
    });

    if (policyViolations.length > 0 && !failure) {
      failure = new Error(`Capsule write policy violations: ${policyViolations.join(', ')}`);
    }
  }

  if (failure) {
    throw failure;
  }

  return {
    sessionId,
    sessionDir,
    status,
    diffPath,
    outputsDir,
    ledgerPath: ledger.getLedgerPath(),
  };
}
