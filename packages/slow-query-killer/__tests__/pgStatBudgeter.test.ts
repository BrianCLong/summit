import budgetFile from "../../../perf/query-budgets.json";
import sampleStats from "./fixtures/pg-stat-sample.json";
import {
  evaluateBudgets,
  formatBudgetDiff,
  normalizeQuery,
  prepareBudgets,
} from "../src/pgStatBudgeter";

describe("pg_stat_statements budget evaluation", () => {
  it("normalizes ORM-style queries into stable fingerprints", () => {
    const { fingerprint: fpA, normalized: normA } = normalizeQuery(
      "SELECT * FROM users WHERE id = 1 AND status = 'ACTIVE'"
    );
    const { fingerprint: fpB, normalized: normB } = normalizeQuery(
      'select * from "users" where id = $1 and status = $2'
    );
    const { fingerprint: fpC } = normalizeQuery(
      'select * from "users" where tenant_id = $1 and status = $2'
    );

    expect(fpA).toEqual(fpB);
    expect(normA).toEqual(normB);
    expect(fpA).not.toEqual(fpC);
  });

  it("flags regressions when pg_stat_statements exceeds query budgets", () => {
    const budgets = prepareBudgets(budgetFile);
    expect(budgets.every((b) => Boolean(b.fingerprint))).toBe(true);

    const result = evaluateBudgets(sampleStats, budgetFile);
    expect(result.violations).toHaveLength(3);
    expect(result.missingFingerprints).toHaveLength(0);

    const diff = formatBudgetDiff(result);
    expect(diff).toContain("audit-feed");
    expect(diff).toContain("case-update");
    expect(diff).toContain("workload share");

    const metrics = result.violations.map((v) => v.metric);
    expect(metrics).toContain("mean_exec_time");
    expect(metrics).toContain("total_time_share");
  });
});
