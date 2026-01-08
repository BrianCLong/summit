import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

interface ChangedFile {
  path: string;
  changeType?: string;
  churn?: number;
}

interface RiskInput {
  changeId?: string;
  git?: {
    filesChanged: ChangedFile[];
    additions?: number;
    deletions?: number;
  };
  code?: {
    schemaChanges?: boolean;
    securitySensitiveTouches?: boolean;
    highChurnFiles?: string[];
    coverageDrop?: boolean;
  };
  ci?: {
    flakySuites?: string[];
    nearFailures?: string[];
    longRunningJobs?: string[];
    policyEdgeCases?: string[];
  };
  agent?: {
    scopeExpansionAttempts?: number;
    policyViolations?: number;
    debtAdded?: number;
    debtRetired?: number;
    promptReuseAnomalies?: number;
  };
  governance?: {
    openExceptions?: number;
    legacyModeDays?: number;
    invariantsAtRisk?: string[];
    evidenceGaps?: number;
  };
  metadata?: {
    timestamp?: string;
    pr?: string | number;
  };
}

interface Contribution {
  id: string;
  category: "code" | "ci" | "agent" | "governance";
  weight: number;
  reason: string;
}

interface WeightsConfig {
  version: number;
  bands: { thresholds: { low: number; medium: number; high: number; critical: number } };
  code: { weights: Record<string, number>; patterns?: Record<string, string[]> };
  ci: { weights: Record<string, number> };
  agent: { weights: Record<string, number> };
  governance: { weights: Record<string, number> };
  recommendations?: { high?: string[]; critical?: string[] };
}

interface RiskReport {
  changeId: string;
  score: number;
  band: "Low" | "Medium" | "High" | "Critical";
  contributions: Contribution[];
  recommendations: string[];
  timestamp: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 1) {
    const [key, value] = args[i].split("=");
    const normalizedKey = key.replace(/^--/, "");
    if (value === undefined) {
      options[normalizedKey] = args[i + 1];
      i += 1;
    } else {
      options[normalizedKey] = value;
    }
  }

  return {
    input: options.input ?? "risk/change-input.json",
    output: options.output ?? "risk-report.json",
    weights: options.weights ?? "risk/weights.yaml",
  };
}

function loadJsonFile<T>(filePath: string): T {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, "utf8");
  return JSON.parse(raw) as T;
}

function loadWeights(filePath: string): WeightsConfig {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, "utf8");
  return yaml.parse(raw) as WeightsConfig;
}

function matchPatterns(file: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    const regex = new RegExp(pattern, "i");
    return regex.test(file);
  });
}

function determineBand(
  score: number,
  thresholds: WeightsConfig["bands"]["thresholds"]
): RiskReport["band"] {
  if (score >= thresholds.critical) return "Critical";
  if (score >= thresholds.high) return "High";
  if (score >= thresholds.medium) return "Medium";
  return "Low";
}

function addContribution(
  contributions: Contribution[],
  id: string,
  category: Contribution["category"],
  weight: number,
  reason: string
) {
  contributions.push({ id, category, weight, reason });
}

function scoreCode(inputs: RiskInput, weights: WeightsConfig): Contribution[] {
  const contributions: Contribution[] = [];
  const files = inputs.git?.filesChanged ?? [];
  const codeWeights = weights.code.weights;
  const patterns = weights.code.patterns;

  const touchesCriticalPath = files.some((file) =>
    matchPatterns(file.path, patterns?.ga_critical_path)
  );
  if (touchesCriticalPath) {
    addContribution(
      contributions,
      "ga_critical_path",
      "code",
      codeWeights.ga_critical_path,
      "Touches GA-critical path"
    );
  }

  if (
    inputs.code?.schemaChanges ||
    files.some((file) => matchPatterns(file.path, patterns?.schema_or_migration))
  ) {
    addContribution(
      contributions,
      "schema_or_migration",
      "code",
      codeWeights.schema_or_migration,
      "Schema or migration change"
    );
  }

  if (
    inputs.code?.securitySensitiveTouches ||
    files.some((file) => matchPatterns(file.path, patterns?.security_sensitive))
  ) {
    addContribution(
      contributions,
      "security_sensitive",
      "code",
      codeWeights.security_sensitive,
      "Security-sensitive surface touched"
    );
  }

  if ((inputs.code?.highChurnFiles ?? []).length > 0) {
    addContribution(
      contributions,
      "high_churn_file",
      "code",
      codeWeights.high_churn_file,
      "High-churn file modified"
    );
  }

  const largeDiff = (inputs.git?.additions ?? 0) + (inputs.git?.deletions ?? 0) > 800;
  if (largeDiff) {
    addContribution(
      contributions,
      "large_diff",
      "code",
      codeWeights.large_diff,
      "Large diff size exceeds threshold"
    );
  }

  if (inputs.code?.coverageDrop) {
    addContribution(
      contributions,
      "test_coverage_drop",
      "code",
      codeWeights.test_coverage_drop,
      "Coverage decreased"
    );
  }

  return contributions;
}

function scoreCi(inputs: RiskInput, weights: WeightsConfig): Contribution[] {
  const contributions: Contribution[] = [];
  const ciWeights = weights.ci.weights;

  if ((inputs.ci?.flakySuites ?? []).length > 0) {
    addContribution(
      contributions,
      "flaky_suite",
      "ci",
      ciWeights.flaky_suite,
      "Flaky suites impacted"
    );
  }

  if ((inputs.ci?.nearFailures ?? []).length > 0) {
    addContribution(
      contributions,
      "near_failure",
      "ci",
      ciWeights.near_failure,
      "Recent runs nearly failed"
    );
  }

  if ((inputs.ci?.longRunningJobs ?? []).length > 0) {
    addContribution(
      contributions,
      "long_running_job",
      "ci",
      ciWeights.long_running_job,
      "Long-running jobs involved"
    );
  }

  if ((inputs.ci?.policyEdgeCases ?? []).length > 0) {
    addContribution(
      contributions,
      "policy_edge_case",
      "ci",
      ciWeights.policy_edge_case,
      "Policy edge cases triggered"
    );
  }

  return contributions;
}

function scoreAgent(inputs: RiskInput, weights: WeightsConfig): Contribution[] {
  const contributions: Contribution[] = [];
  const agentWeights = weights.agent.weights;
  const scopeExpansion = (inputs.agent?.scopeExpansionAttempts ?? 0) > 0;
  const priorViolations = (inputs.agent?.policyViolations ?? 0) > 0;
  const debtAdded = inputs.agent?.debtAdded ?? 0;
  const debtRetired = inputs.agent?.debtRetired ?? 0;
  const debtRatioNegative = debtAdded > debtRetired;

  if (scopeExpansion) {
    addContribution(
      contributions,
      "scope_expansion",
      "agent",
      agentWeights.scope_expansion,
      "Agent attempted scope expansion"
    );
  }

  if (priorViolations) {
    addContribution(
      contributions,
      "prior_policy_violations",
      "agent",
      agentWeights.prior_policy_violations,
      "Agent has prior policy violations"
    );
  }

  if (debtRatioNegative) {
    addContribution(
      contributions,
      "debt_ratio_negative",
      "agent",
      agentWeights.debt_ratio_negative,
      "Debt creation exceeds retirement"
    );
  }

  if ((inputs.agent?.promptReuseAnomalies ?? 0) > 0) {
    addContribution(
      contributions,
      "prompt_reuse_anomaly",
      "agent",
      agentWeights.prompt_reuse_anomaly,
      "Prompt reuse anomaly detected"
    );
  }

  return contributions;
}

function scoreGovernance(inputs: RiskInput, weights: WeightsConfig): Contribution[] {
  const contributions: Contribution[] = [];
  const govWeights = weights.governance.weights;

  if ((inputs.governance?.openExceptions ?? 0) > 3) {
    addContribution(
      contributions,
      "exception_load",
      "governance",
      govWeights.exception_load,
      "Exception load increasing"
    );
  }

  if ((inputs.governance?.legacyModeDays ?? 0) > 14) {
    addContribution(
      contributions,
      "legacy_mode_stagnation",
      "governance",
      govWeights.legacy_mode_stagnation,
      "Legacy mode stagnation detected"
    );
  }

  if ((inputs.governance?.invariantsAtRisk ?? []).length > 0) {
    addContribution(
      contributions,
      "invariant_erosion",
      "governance",
      govWeights.invariant_erosion,
      "Invariants show erosion"
    );
  }

  if ((inputs.governance?.evidenceGaps ?? 0) > 0) {
    addContribution(
      contributions,
      "evidence_gap",
      "governance",
      govWeights.evidence_gap,
      "Audit evidence gaps detected"
    );
  }

  return contributions;
}

function assembleRecommendations(band: RiskReport["band"], weights: WeightsConfig): string[] {
  const { recommendations } = weights;
  if (band === "Critical") return recommendations?.critical ?? [];
  if (band === "High") return recommendations?.high ?? [];
  return [];
}

function calculateScore(contributions: Contribution[]): number {
  const total = contributions.reduce((sum, item) => sum + item.weight, 0);
  return Math.min(100, Math.round(total));
}

function scoreChange(): RiskReport {
  const { input, output, weights: weightsPath } = parseArgs();
  const inputData = loadJsonFile<RiskInput>(input);
  const weights = loadWeights(weightsPath);

  const contributions = [
    ...scoreCode(inputData, weights),
    ...scoreCi(inputData, weights),
    ...scoreAgent(inputData, weights),
    ...scoreGovernance(inputData, weights),
  ];

  const score = calculateScore(contributions);
  const band = determineBand(score, weights.bands.thresholds);
  const recommendations = assembleRecommendations(band, weights);
  const report: RiskReport = {
    changeId: inputData.changeId ?? "unknown-change",
    score,
    band,
    contributions,
    recommendations,
    timestamp: inputData.metadata?.timestamp ?? new Date().toISOString(),
  };

  const outputPath = path.resolve(process.cwd(), output);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[RISK] score=${report.score} band=${report.band}`);
  console.log(`[RISK] factors=${report.contributions.map((c) => c.id).join(",")}`);
  if (recommendations.length > 0) {
    console.log(`[RISK] guidance=${recommendations.join(" | ")}`);
  }

  return report;
}

if (require.main === module) {
  scoreChange();
}

export { scoreChange };
