"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const query_budgets_json_1 = __importDefault(require("../../../perf/query-budgets.json"));
const pg_stat_sample_json_1 = __importDefault(require("./fixtures/pg-stat-sample.json"));
const pgStatBudgeter_1 = require("../src/pgStatBudgeter");
describe('pg_stat_statements budget evaluation', () => {
    it('normalizes ORM-style queries into stable fingerprints', () => {
        const { fingerprint: fpA, normalized: normA } = (0, pgStatBudgeter_1.normalizeQuery)("SELECT * FROM users WHERE id = 1 AND status = 'ACTIVE'");
        const { fingerprint: fpB, normalized: normB } = (0, pgStatBudgeter_1.normalizeQuery)('select * from "users" where id = $1 and status = $2');
        const { fingerprint: fpC } = (0, pgStatBudgeter_1.normalizeQuery)('select * from "users" where tenant_id = $1 and status = $2');
        expect(fpA).toEqual(fpB);
        expect(normA).toEqual(normB);
        expect(fpA).not.toEqual(fpC);
    });
    it('flags regressions when pg_stat_statements exceeds query budgets', () => {
        const budgets = (0, pgStatBudgeter_1.prepareBudgets)(query_budgets_json_1.default);
        expect(budgets.every((b) => Boolean(b.fingerprint))).toBe(true);
        const result = (0, pgStatBudgeter_1.evaluateBudgets)(pg_stat_sample_json_1.default, query_budgets_json_1.default);
        expect(result.violations).toHaveLength(3);
        expect(result.missingFingerprints).toHaveLength(0);
        const diff = (0, pgStatBudgeter_1.formatBudgetDiff)(result);
        expect(diff).toContain('audit-feed');
        expect(diff).toContain('case-update');
        expect(diff).toContain('workload share');
        const metrics = result.violations.map((v) => v.metric);
        expect(metrics).toContain('mean_exec_time');
        expect(metrics).toContain('total_time_share');
    });
});
