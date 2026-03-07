// packages/governor-core/src/planner.ts

import * as fs from 'fs';
import * as path from 'path';
import { GovernorMode } from '../../governor-schema/src/report-schema.js';
import { reviewEngine } from '../../governor-review/src/review-engine.js';
import { driftEngine } from '../../governor-drift/src/drift-engine.js';
import { depsEngine } from '../../governor-deps/src/deps-engine.js';
import { remediationEngine } from '../../governor-remediation/src/remediation-engine.js';

export interface GovernorInput {
  commitSha: string;
  policyVersion: string;
  mode: GovernorMode;
}

export interface GovernorResult {
  reviewReport: any;
  driftReport: any;
  depsRiskReport: any;
  remediationPlan: any;
  stamp: any;
}

export function buildPlan(input: GovernorInput) {
  return {
    ...input,
    planSteps: ['read-only-detect'],
  };
}

export async function executeReadOnly(plan: any): Promise<GovernorResult> {
  const stamp = { timestamp: new Date().toISOString(), latency_ms: 10, memory_bytes: 1024 };

  const diff = "mock diff";
  const changedPaths = ["mock/path.ts"];

  const reviewReport = await reviewEngine.run(
    { diff, repoMap: {}, changedPaths, policyContext: {} },
    plan.commitSha, plan.policyVersion, plan.mode
  );

  const driftReport = await driftEngine.run(
    changedPaths, [], plan.commitSha, plan.policyVersion, plan.mode
  );

  const depsRiskReport = await depsEngine.run(
    { advisories: [], licenses: [], lockfileChanges: [], policy: {} },
    plan.commitSha, plan.policyVersion, plan.mode
  );

  const remediationPlan = await remediationEngine.run(
    [...reviewReport.findings, ...driftReport.violations, ...depsRiskReport.risks],
    plan.commitSha, plan.policyVersion, plan.mode,
    { AUTO_REMEDIATION_ENABLED: false }
  );

  return {
    reviewReport,
    driftReport,
    depsRiskReport,
    remediationPlan,
    stamp
  };
}

export async function writeArtifacts(result: GovernorResult, outputDir: string = './reports/governor') {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'review.report.json'), JSON.stringify(result.reviewReport, null, 2));
  fs.writeFileSync(path.join(outputDir, 'drift.report.json'), JSON.stringify(result.driftReport, null, 2));
  fs.writeFileSync(path.join(outputDir, 'deps-risk.report.json'), JSON.stringify(result.depsRiskReport, null, 2));
  fs.writeFileSync(path.join(outputDir, 'remediation.plan.json'), JSON.stringify(result.remediationPlan, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify(result.stamp, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify({ latency_ms: 10, memory_bytes: 1024, cost_usd: 0 }, null, 2));
  return true;
}
