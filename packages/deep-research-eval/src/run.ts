import { readFile } from 'fs/promises';
import {
  createMockRetriever,
  verifyClaims,
  type EvidenceRetriever,
} from './factcheck/verifier.js';
import { extractClaims } from './factcheck/claim_extractor.js';
import { writeEvidenceBundle } from './evidence/bundle.js';
import { loadTaskPack } from './taskpack/loader.js';
import { generateAdaptiveRubric } from './rubric/adaptive_rubric.js';
import { scoreReport } from './rubric/scorer.js';
import { accessFeasibility } from './filters/access_feasibility.js';
import { searchNecessity } from './filters/search_necessity.js';
import { taskQualification } from './filters/task_qualification.js';
import type { TaskDefinition } from './taskpack/schema.js';

export interface ReportInput {
  taskId: string;
  reportId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationThresholds {
  minScoreRatio: number;
  minCoverageRatio: number;
  maxContradictions: number;
}

export interface WaiverFile {
  expiresAt: string;
  reason: string;
  approvedBy: string;
}

export interface EvaluationRunOptions {
  taskPackPath: string;
  reportsPath: string;
  outDir: string;
  runId: string;
  dryRun?: boolean;
  thresholds?: EvaluationThresholds;
  waiverPath?: string;
  retriever?: EvidenceRetriever;
}

export interface EvaluationSummary {
  runId: string;
  totals: {
    tasks: number;
    reports: number;
    failed: number;
  };
  results: {
    taskId: string;
    reportId: string;
    scoreRatio: number;
    coverageRatio: number;
    contradictions: number;
    status: 'pass' | 'fail';
    reasons: string[];
  }[];
  waiverApplied?: WaiverFile;
}

const loadReports = async (path: string): Promise<ReportInput[]> => {
  const raw = await readFile(path, 'utf-8');
  const payload = JSON.parse(raw);
  if (!Array.isArray(payload)) {
    throw new Error('Reports payload must be an array.');
  }
  return payload.map((report) => {
    if (!report.taskId || !report.reportId || !report.content) {
      throw new Error('Report entry missing required fields.');
    }
    return report as ReportInput;
  });
};

const loadWaiver = async (waiverPath?: string): Promise<WaiverFile | undefined> => {
  if (!waiverPath) return undefined;
  const raw = await readFile(waiverPath, 'utf-8');
  const payload = JSON.parse(raw) as WaiverFile;
  if (!payload.expiresAt || !payload.reason || !payload.approvedBy) {
    throw new Error('Waiver file missing required fields.');
  }
  return payload;
};

const waiverValid = (waiver?: WaiverFile): boolean => {
  if (!waiver) return false;
  const expiry = new Date(waiver.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry >= Date.now();
};

const defaultThresholds: EvaluationThresholds = {
  minScoreRatio: 0.7,
  minCoverageRatio: 0.6,
  maxContradictions: 0,
};

export const runDeepResearchEval = async (
  options: EvaluationRunOptions,
): Promise<EvaluationSummary> => {
  const { taskPack, warnings } = await loadTaskPack(options.taskPackPath);
  const reports = await loadReports(options.reportsPath);
  const waiver = await loadWaiver(options.waiverPath);

  const threshold = options.thresholds ?? defaultThresholds;

  if (warnings.length > 0) {
    console.warn(`Task pack warnings: ${warnings.join(' | ')}`);
  }

  const retriever = options.dryRun
    ? createMockRetriever()
    : (options.retriever ?? createMockRetriever());

  const results: EvaluationSummary['results'] = [];

  for (const report of reports) {
    const task = taskPack.tasks.find((taskItem) => taskItem.id === report.taskId);
    if (!task) {
      throw new Error(`Report ${report.reportId} references unknown task ${report.taskId}.`);
    }

    const filters = [taskQualification(task), searchNecessity(task), accessFeasibility(task)];
    const filterFailures = filters.filter((filter) => !filter.passed);

    if (filterFailures.length > 0) {
      results.push({
        taskId: task.id,
        reportId: report.reportId,
        scoreRatio: 0,
        coverageRatio: 0,
        contradictions: 0,
        status: 'fail',
        reasons: filterFailures.flatMap((filter) => filter.reasons),
      });
      continue;
    }

    const rubric = generateAdaptiveRubric(task, options.runId);
    const claims = extractClaims(report.content);
    const verification = await verifyClaims(claims, retriever, task.policy);

    const scoring = scoreReport(rubric, {
      reportText: report.content,
      policyViolations: verification.policyViolations,
      coverageRatio: verification.summary.coverageRatio,
      contradictionCount: verification.summary.contradictions,
    });

    const scoreRatio = scoring.maxScore === 0 ? 0 : scoring.totalScore / scoring.maxScore;
    const coverageRatio = verification.summary.coverageRatio;
    const contradictions = verification.summary.contradictions;

    const reasons: string[] = [];
    if (scoreRatio < threshold.minScoreRatio) {
      reasons.push(`Score ratio ${scoreRatio.toFixed(2)} below ${threshold.minScoreRatio}.`);
    }
    if (coverageRatio < threshold.minCoverageRatio) {
      reasons.push(`Coverage ratio ${coverageRatio.toFixed(2)} below ${threshold.minCoverageRatio}.`);
    }
    if (contradictions > threshold.maxContradictions) {
      reasons.push(`Contradictions ${contradictions} exceed ${threshold.maxContradictions}.`);
    }
    if (verification.policyViolations.length > 0) {
      reasons.push(`Policy violations: ${verification.policyViolations.join('; ')}`);
    }

    const status = reasons.length === 0 ? 'pass' : 'fail';

    await writeEvidenceBundle(options.outDir, {
      runId: options.runId,
      task,
      reportId: report.reportId,
      reportText: report.content,
      rubric,
      scoring,
      factChecks: verification.results,
      factSummary: verification.summary,
      policyViolations: verification.policyViolations,
      claimGraph: verification.claimGraph,
    });

    results.push({
      taskId: task.id,
      reportId: report.reportId,
      scoreRatio,
      coverageRatio,
      contradictions,
      status,
      reasons,
    });
  }

  const failed = results.filter((result) => result.status === 'fail').length;

  return {
    runId: options.runId,
    totals: {
      tasks: taskPack.tasks.length,
      reports: reports.length,
      failed,
    },
    results,
    waiverApplied: waiverValid(waiver) ? waiver : undefined,
  };
};

export const formatSummary = (
  summary: EvaluationSummary,
  thresholds: EvaluationThresholds,
): { status: 'pass' | 'fail'; message: string } => {
  const failures = summary.results.filter((result) => result.status === 'fail');
  if (failures.length === 0) {
    return {
      status: 'pass',
      message: `All ${summary.results.length} reports passed thresholds.`,
    };
  }

  if (summary.waiverApplied) {
    return {
      status: 'pass',
      message: `Waiver applied until ${summary.waiverApplied.expiresAt} for ${failures.length} failures.`,
    };
  }

  const message = `Failed ${failures.length} of ${summary.results.length} reports. Thresholds: score>=${thresholds.minScoreRatio}, coverage>=${thresholds.minCoverageRatio}, contradictions<=${thresholds.maxContradictions}.`;
  return { status: 'fail', message };
};

export const resolveThresholds = (input?: Partial<EvaluationThresholds>): EvaluationThresholds => ({
  ...defaultThresholds,
  ...input,
});

export const getTaskById = (
  tasks: TaskDefinition[],
  taskId: string,
): TaskDefinition | undefined => tasks.find((task) => task.id === taskId);
