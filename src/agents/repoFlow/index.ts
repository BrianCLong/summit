import path from 'node:path';
import { createPlan } from './planner';
import { writeEvidence } from './evidenceWriter';
import { runPolicyGate } from './policyGate';
import {
  commitAll,
  createBranch,
  defaultPrSimulator,
  ensureCleanWorkingTree,
  headSha,
} from './gitWriter';
import { defaultSandboxProfile, runSandboxCommand } from './sandboxRunner';
import {
  EvidenceMetrics,
  EvidenceReport,
  EvidenceStamp,
  RepoFlowRequest,
  RepoFlowResult,
  SandboxProfile,
} from './types';
import { PullRequestSimulator } from './gitWriter';

export type RepoFlowOptions = {
  policyPath?: string;
  prSimulator?: PullRequestSimulator;
  sandboxProfile?: SandboxProfile;
  applyChange?: (repoDir: string) => Promise<string[]>;
  evidenceDir?: string;
};

export const runRepoFlow = async (
  request: RepoFlowRequest,
  options: RepoFlowOptions = {},
): Promise<RepoFlowResult> => {
  const plan = createPlan(request);
  const evidenceDir =
    options.evidenceDir ??
    path.join(process.cwd(), 'artifacts', 'evidence', plan.evidenceId);

  await ensureCleanWorkingTree(request.repoDir);
  const branchName = await createBranch(request.repoDir, request.slug);

  const filesTouched = options.applyChange
    ? await options.applyChange(request.repoDir)
    : [];

  const sandboxProfile = options.sandboxProfile ?? defaultSandboxProfile;
  const sandboxResult = await runSandboxCommand(
    'node',
    ['-e', "console.log('repoflow')"],
    sandboxProfile,
    request.repoDir,
  );

  const policyDecision = await runPolicyGate({
    changedFiles: filesTouched,
    evidence: {
      evidenceId: plan.evidenceId,
      repo: { url: request.repoUrl, ref: request.ref },
      changes: { filesTouched },
      sandbox: { profile: sandboxProfile.id, exitCode: sandboxResult.exitCode },
      policy: { decision: 'allow', reasons: [], policyHash: '' },
    },
    policyPath: options.policyPath,
  });

  const report: EvidenceReport = {
    evidenceId: plan.evidenceId,
    repo: { url: request.repoUrl, ref: request.ref },
    changes: { filesTouched },
    sandbox: { profile: sandboxProfile.id, exitCode: sandboxResult.exitCode },
    policy: policyDecision,
  };

  const metrics: EvidenceMetrics = {
    evidenceId: plan.evidenceId,
    filesTouchedCount: filesTouched.length,
    sandboxDurationMs: sandboxResult.durationMs,
    sandboxExitCode: sandboxResult.exitCode,
    policyDecision: policyDecision.decision,
  };

  const preCommitSha = await headSha(request.repoDir);

  if (policyDecision.decision === 'deny') {
    const denyStamp: EvidenceStamp = {
      evidenceId: plan.evidenceId,
      gitSha: preCommitSha,
      policyHash: policyDecision.policyHash,
      schemaVersion: '1.0.0',
    };
    await writeEvidence(evidenceDir, report, metrics, denyStamp);
    throw new Error(`Policy denied: ${policyDecision.reasons.join('; ')}`);
  }

  const commitSha = await commitAll(request.repoDir, request.changeDescription);
  const postCommitSha = await headSha(request.repoDir);
  const stamp: EvidenceStamp = {
    evidenceId: plan.evidenceId,
    gitSha: postCommitSha,
    policyHash: policyDecision.policyHash,
    schemaVersion: '1.0.0',
  };

  await writeEvidence(evidenceDir, report, metrics, stamp);

  const prSimulator = options.prSimulator ?? defaultPrSimulator;
  await prSimulator.openPullRequest({
    repoDir: request.repoDir,
    branchName,
    title: request.changeDescription,
    body: `Evidence: ${plan.evidenceId}`,
  });

  return {
    evidenceId: plan.evidenceId,
    reportPath: path.join(evidenceDir, 'report.json'),
    policyDecision,
    branchName,
    commitSha,
  };
};
