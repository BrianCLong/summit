import crypto from "crypto";

export interface PgStatStatementRow {
  query: string;
  mean_exec_time?: number;
  total_exec_time?: number;
  total_time?: number;
  calls: number;
}

export interface QueryFingerprintBudget {
  id: string;
  /** Optional raw query text; used to derive the fingerprint if fingerprint is missing */
  query?: string;
  /** Pre-computed fingerprint (normalized SHA-256) */
  fingerprint?: string;
  description?: string;
  /** Maximum mean execution time in milliseconds */
  maxMeanTimeMs?: number;
  /**
   * Maximum share of total execution time (0-1)
   * Example: 0.35 means this fingerprint cannot exceed 35% of workload time.
   */
  maxTotalTimeShare?: number;
  /** Maximum number of calls within the sampled window */
  maxCalls?: number;
}

export interface QueryBudgetFile {
  version: number;
  workload: string;
  budgets: QueryFingerprintBudget[];
}

export interface ObservedQueryStats {
  fingerprint: string;
  normalizedQuery: string;
  meanTimeMs: number;
  totalTimeMs: number;
  totalTimeShare: number;
  calls: number;
}

export type BudgetMetric = "mean_exec_time" | "total_time_share" | "calls";

export interface BudgetViolation {
  id: string;
  fingerprint: string;
  metric: BudgetMetric;
  limit: number;
  actual: number;
  regressionPct: number;
  description?: string;
  suggestion: string;
  observed: ObservedQueryStats;
}

export interface BudgetEvaluationResult {
  violations: BudgetViolation[];
  observed: ObservedQueryStats[];
  missingFingerprints: string[];
  baselineVersion?: number;
}

function stripSqlComments(sql: string): string {
  return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export function normalizeQuery(sql: string): { normalized: string; fingerprint: string } {
  const withoutComments = stripSqlComments(sql);

  const replacedLiterals = withoutComments
    // Replace single-quoted strings
    .replace(/'(?:''|[^'])*'/g, "?")
    // Replace numeric literals (including decimals)
    .replace(/\b\d+(?:\.\d+)?\b/g, "?")
    // Replace positional parameters ($1, $2, ?)
    .replace(/\$\d+|\?/g, "?")
    // Remove quoted identifiers while keeping the identifier
    .replace(/"([^"]+)"/g, "$1");

  // Collapse whitespace and lowercase for stability
  let normalized = replacedLiterals
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .toLowerCase();

  // Normalize alias noise (helps ORM-generated SQL)
  normalized = normalized.replace(/\s+as\s+[a-z_][\w$]*/gi, " as _");
  normalized = normalized.replace(/\s+[a-z_][\w$]*\s+on\s+/gi, " _ on ");

  const fingerprint = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);

  return { normalized, fingerprint };
}

export function attachFingerprints(
  rows: PgStatStatementRow[]
): Array<PgStatStatementRow & { normalized: string; fingerprint: string }> {
  return rows.map((row) => {
    const { normalized, fingerprint } = normalizeQuery(row.query);
    return {
      ...row,
      normalized,
      fingerprint,
    };
  });
}

export function prepareBudgets(budgetFile: QueryBudgetFile): QueryFingerprintBudget[] {
  return budgetFile.budgets.map((budget) => {
    if (budget.fingerprint) {
      return budget;
    }

    if (!budget.query) {
      throw new Error(`Budget "${budget.id}" is missing both fingerprint and query`);
    }

    const { fingerprint } = normalizeQuery(budget.query);
    return {
      ...budget,
      fingerprint,
    };
  });
}

export function evaluateBudgets(
  rows: PgStatStatementRow[],
  budgetFile: QueryBudgetFile
): BudgetEvaluationResult {
  const preparedBudgets = prepareBudgets(budgetFile);
  const fingerprinted = attachFingerprints(rows);
  const totalTimeMs = fingerprinted.reduce(
    (sum, row) => sum + (row.total_exec_time ?? row.total_time ?? 0),
    0
  );

  const observed: ObservedQueryStats[] = fingerprinted.map((row) => ({
    fingerprint: row.fingerprint,
    normalizedQuery: row.normalized,
    meanTimeMs: row.mean_exec_time ?? 0,
    totalTimeMs: row.total_exec_time ?? row.total_time ?? 0,
    totalTimeShare:
      totalTimeMs > 0 ? (row.total_exec_time ?? row.total_time ?? 0) / totalTimeMs : 0,
    calls: row.calls,
  }));

  const observedByFingerprint = new Map(observed.map((item) => [item.fingerprint, item]));

  const violations: BudgetViolation[] = [];
  const missingFingerprints: string[] = [];

  for (const budget of preparedBudgets) {
    const observedStats = observedByFingerprint.get(budget.fingerprint!);

    if (!observedStats) {
      missingFingerprints.push(budget.id);
      continue;
    }

    if (budget.maxMeanTimeMs !== undefined && observedStats.meanTimeMs > budget.maxMeanTimeMs) {
      const overage = observedStats.meanTimeMs - budget.maxMeanTimeMs;
      violations.push({
        id: budget.id,
        fingerprint: budget.fingerprint!,
        metric: "mean_exec_time",
        limit: budget.maxMeanTimeMs,
        actual: observedStats.meanTimeMs,
        regressionPct: budget.maxMeanTimeMs ? (overage / budget.maxMeanTimeMs) * 100 : 0,
        description: budget.description,
        suggestion:
          "Inspect EXPLAIN ANALYZE; add or adjust indexes on filter columns; confirm row estimates.",
        observed: observedStats,
      });
    }

    if (
      budget.maxTotalTimeShare !== undefined &&
      observedStats.totalTimeShare > budget.maxTotalTimeShare
    ) {
      const overage = observedStats.totalTimeShare - budget.maxTotalTimeShare;
      violations.push({
        id: budget.id,
        fingerprint: budget.fingerprint!,
        metric: "total_time_share",
        limit: budget.maxTotalTimeShare,
        actual: observedStats.totalTimeShare,
        regressionPct: budget.maxTotalTimeShare ? (overage / budget.maxTotalTimeShare) * 100 : 0,
        description: budget.description,
        suggestion:
          "Consider caching hot paths, materializing heavy views, or adding covering indexes.",
        observed: observedStats,
      });
    }

    if (budget.maxCalls !== undefined && observedStats.calls > budget.maxCalls) {
      const overage = observedStats.calls - budget.maxCalls;
      violations.push({
        id: budget.id,
        fingerprint: budget.fingerprint!,
        metric: "calls",
        limit: budget.maxCalls,
        actual: observedStats.calls,
        regressionPct: budget.maxCalls ? (overage / budget.maxCalls) * 100 : 0,
        description: budget.description,
        suggestion:
          "Batch or cache upstream requests; ensure pagination is applied for list endpoints.",
        observed: observedStats,
      });
    }
  }

  return {
    violations,
    observed,
    missingFingerprints,
    baselineVersion: budgetFile.version,
  };
}

export function formatBudgetDiff(result: BudgetEvaluationResult): string {
  if (!result.violations.length) {
    return "✅ Query budgets respected for sampled workload.";
  }

  const lines = [
    "⚠️  Query budget regressions detected:",
    "",
    ...result.violations.map((violation) => {
      const base = `- ${violation.id} (${violation.metric}) exceeded: ${violation.actual.toFixed(
        2
      )} > ${violation.limit}`;
      const regression = violation.regressionPct
        ? ` (+${violation.regressionPct.toFixed(1)}%)`
        : "";
      const share =
        violation.metric === "total_time_share"
          ? ` (workload share: ${(violation.observed.totalTimeShare * 100).toFixed(1)}%)`
          : "";
      const mean =
        violation.metric === "mean_exec_time"
          ? ` (mean ${violation.observed.meanTimeMs.toFixed(2)} ms)`
          : "";
      const calls = violation.metric === "calls" ? ` (calls ${violation.observed.calls})` : "";

      return `${base}${regression}${share}${mean}${calls}\n  Fingerprint: ${
        violation.fingerprint
      }\n  Query: ${violation.observed.normalizedQuery}\n  Suggestion: ${violation.suggestion}`;
    }),
  ];

  if (result.missingFingerprints.length) {
    lines.push(
      "",
      `Missing fingerprints (not observed in sample): ${result.missingFingerprints.join(", ")}`
    );
  }

  return lines.join("\n");
}

export async function pgStatStatementsAvailable(client: {
  query: (sql: string) => Promise<{ rows: Array<{ extname: string }> }>;
}): Promise<boolean> {
  try {
    const res = await client.query(
      "SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'"
    );
    return res.rows.length > 0;
  } catch (error) {
    return false;
  }
}
