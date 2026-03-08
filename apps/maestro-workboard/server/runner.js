import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertToolAllowed, resolveCapabilityProfile } from './policy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const worktreeRoot = path.join(repoRoot, '.maestro-workboard', 'worktrees');
const evidenceRoot = path.join(repoRoot, '.maestro-workboard', 'evidence');

const toSafeName = (value) => value.replace(/[^a-zA-Z0-9-_]/g, '_');

const runCommand = ({
  command,
  policyCommand = command,
  args,
  cwd,
  capabilityProfile,
  requiresWrite = false,
  requiresNetwork = false,
}) =>
  new Promise((resolve, reject) => {
    const policy = assertToolAllowed({
      capabilityProfile,
      command: policyCommand,
      requiresWrite,
      requiresNetwork,
    });
    if (!policy.allowed) {
      const error = new Error(policy.reason);
      error.code = 'POLICY_BLOCK';
      reject(error);
      return;
    }
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });

const executeCommand = async (
  store,
  runId,
  { command, policyCommand, args, cwd, capabilityProfile, requiresWrite },
) => {
  await store.addEvent(runId, {
    type: 'command',
    payload: {
      command,
      args,
      cwd,
    },
  });
  try {
    const result = await runCommand({
      command,
      policyCommand,
      args,
      cwd,
      capabilityProfile,
      requiresWrite,
    });
    await store.addEvent(runId, {
      type: 'command_result',
      payload: {
        command,
        args,
        cwd,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
    });
    return result;
  } catch (error) {
    if (error.code === 'POLICY_BLOCK') {
      await store.addEvent(runId, {
        type: 'policy_block',
        payload: {
          command,
          reason: error.message,
        },
      });
    }
    throw error;
  }
};

const createWorktree = async ({ store, runId, capabilityProfile }) => {
  const worktreePath = path.join(worktreeRoot, toSafeName(runId));
  await fs.mkdir(worktreeRoot, { recursive: true });
  await executeCommand(store, runId, {
    command: 'git',
    policyCommand: 'git',
    args: ['worktree', 'add', worktreePath, 'HEAD'],
    cwd: repoRoot,
    capabilityProfile,
    requiresWrite: true,
  });
  return worktreePath;
};

const writeEvidence = async (store, runId, filePath, contents, metadata) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
  await store.addEvent(runId, {
    type: 'file_write',
    payload: {
      filePath,
      ...metadata,
    },
  });
};

const emitPhase = async (store, runId, phase, status, payload = {}) =>
  store.addEvent(runId, {
    type: 'phase',
    payload: {
      phase,
      status,
      ...payload,
    },
  });

const resolveSkills = async (store, runId, skills = []) => {
  await store.addEvent(runId, {
    type: 'skills_resolved',
    payload: {
      skills,
      resolution: 'stubbed-resolver',
    },
  });
  return skills.map((skill) => ({
    skill,
    status: 'ready',
    source: 'builtin-stub',
  }));
};

const createEvidenceBundle = (runId) => {
  const bundleDir = path.join(evidenceRoot, toSafeName(runId));
  return {
    bundleDir,
    plan: path.join(bundleDir, 'plan.md'),
    diffstat: path.join(bundleDir, 'changes.diffstat.json'),
    tests: path.join(bundleDir, 'test-results.json'),
    security: path.join(bundleDir, 'security-notes.md'),
    provenance: path.join(bundleDir, 'provenance.json'),
    summary: path.join(bundleDir, 'summary.md'),
  };
};

const buildProvenance = async ({
  run,
  workItem,
  capabilityProfile,
  toolVersions,
  inputs,
}) => ({
  runId: run.id,
  workItemId: workItem.id,
  capabilityProfile,
  waiverId: run.waiverId,
  inputs,
  toolVersions,
  timestamps: {
    createdAt: run.createdAt,
    startedAt: run.startedAt,
  },
});

export const startRun = async ({ store, workItem, capabilityProfile, worktreeMode }) => {
  const profile = resolveCapabilityProfile(capabilityProfile);
  const run = await store.createRun(workItem.id, {
    capabilityProfile: profile.id,
  });
  const bundle = createEvidenceBundle(run.id);
  const inputs = {
    workItem: {
      id: workItem.id,
      title: workItem.title,
      dependencies: workItem.dependencies,
      acceptanceCriteria: workItem.acceptanceCriteria,
      skills: workItem.skills,
    },
  };
  const toolVersions = {
    node: process.version,
  };

  await store.updateWorkItem(workItem.id, { status: 'Running' });
  await store.addEvent(run.id, {
    type: 'run_start',
    payload: {
      capabilityProfile: profile,
    },
  });

  try {
    await resolveSkills(store, run.id, workItem.skills);
    await emitPhase(store, run.id, 'plan', 'start');
    const planBody = `# Plan\n\n## Intent\n${workItem.title}\n\n## Constraints\n- Capability profile: ${profile.label}\n- Deterministic steps only\n\n## Acceptance Criteria\n${workItem.acceptanceCriteria
      .map((item) => `- ${item}`)
      .join('\n')}`;
    await writeEvidence(store, run.id, bundle.plan, planBody, {
      evidenceType: 'plan',
    });
    await emitPhase(store, run.id, 'plan', 'end');

    await emitPhase(store, run.id, 'implement', 'start');
    let worktreePath = null;
    if (worktreeMode !== 'noop') {
      worktreePath = await createWorktree({
        store,
        runId: run.id,
        capabilityProfile: profile.id,
      });
    }
    let diffResult = { stdout: '', stderr: '', exitCode: 0 };
    if (worktreePath) {
      diffResult = await executeCommand(store, run.id, {
        command: 'git',
        policyCommand: 'git-read',
        args: ['diff', '--stat'],
        cwd: worktreePath,
        capabilityProfile: profile.id,
      });
    }
    const diffPayload = {
      command: 'git diff --stat',
      exitCode: diffResult.exitCode,
      stdout: diffResult.stdout,
      stderr: diffResult.stderr,
      summary: diffResult.stdout.trim() || 'No changes (intentionally constrained).',
    };
    await writeEvidence(
      store,
      run.id,
      bundle.diffstat,
      JSON.stringify(diffPayload, null, 2),
      {
        evidenceType: 'diffstat',
      },
    );
    await emitPhase(store, run.id, 'implement', 'end', {
      worktreePath,
    });

    await emitPhase(store, run.id, 'validate', 'start');
    await store.addEvent(run.id, {
      type: 'command',
      payload: {
        command: 'tests',
        args: [],
        cwd: worktreePath ?? repoRoot,
        skipped: true,
        reason: 'intentionally constrained',
      },
    });
    const testPayload = {
      command: 'not-run (intentionally constrained)',
      exitCode: 0,
      stdout: 'No automated tests executed in MVP runner.',
      stderr: '',
      timestamp: new Date().toISOString(),
    };
    await writeEvidence(
      store,
      run.id,
      bundle.tests,
      JSON.stringify(testPayload, null, 2),
      {
        evidenceType: 'test-results',
      },
    );
    const securityNotes = `# Security Notes\n\n- Capability profile enforced: ${profile.label}\n- Secrets access: ${profile.allowsSecrets ? 'enabled' : 'disabled'}\n- Network access: ${profile.allowsNetwork ? 'enabled' : 'disabled'}\n`;
    await writeEvidence(store, run.id, bundle.security, securityNotes, {
      evidenceType: 'security-notes',
    });
    await emitPhase(store, run.id, 'validate', 'end');

    toolVersions.git = worktreePath ? 'git' : 'git (skipped)';
    const provenance = await buildProvenance({
      run,
      workItem,
      capabilityProfile: profile,
      toolVersions,
      inputs,
    });
    await writeEvidence(
      store,
      run.id,
      bundle.provenance,
      JSON.stringify(provenance, null, 2),
      {
        evidenceType: 'provenance',
      },
    );
    const summary = `# Run Summary\n\nRun ${run.id} completed with profile ${profile.label}.\n\nArtifacts:\n- plan.md\n- changes.diffstat.json\n- test-results.json\n- security-notes.md\n- provenance.json\n`;
    await writeEvidence(store, run.id, bundle.summary, summary, {
      evidenceType: 'summary',
    });

    await store.updateRun(run.id, {
      status: 'completed',
      endedAt: new Date().toISOString(),
      evidence: {
        plan: bundle.plan,
        diffstat: bundle.diffstat,
        tests: bundle.tests,
        security: bundle.security,
        provenance: bundle.provenance,
        summary: bundle.summary,
      },
      worktreePath,
    });
    await store.updateWorkItem(workItem.id, { status: 'Needs Review' });
    await store.addEvent(run.id, {
      type: 'run_end',
      payload: {
        status: 'completed',
      },
    });
  } catch (error) {
    await store.updateRun(run.id, {
      status: 'failed',
      endedAt: new Date().toISOString(),
    });
    await store.updateWorkItem(workItem.id, { status: 'Blocked' });
    await store.addEvent(run.id, {
      type: 'run_end',
      payload: {
        status: 'failed',
        error: error.message,
      },
    });
  }

  return run;
};
