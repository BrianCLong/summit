"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const postgres_plan_baseline_json_1 = __importDefault(require("../reliability/plan-regression/fixtures/postgres-plan-baseline.json"));
const critical_queries_1 = require("../reliability/plan-regression/critical-queries");
const plan_regression_1 = require("../reliability/plan-regression/plan-regression");
describe('plan signature utilities', () => {
    it('normalizes EXPLAIN JSON payloads', () => {
        const explainPayload = [
            {
                Plan: {
                    'Node Type': 'Limit',
                    'Plan Rows': 10,
                    Plans: [
                        {
                            'Node Type': 'Index Scan',
                            'Relation Name': 'plan_regression.investigations',
                            'Index Name': 'pr_investigations_status_priority_created_at_idx',
                            'Plan Rows': 50,
                        },
                    ],
                },
            },
        ];
        const signature = (0, plan_regression_1.collectPlanSignature)(explainPayload);
        expect(signature.nodeType).toBe('Limit');
        expect(signature.children?.[0].indexName).toContain('status_priority');
    });
    it('detects index and join regressions with readable diff', () => {
        const baselineEntry = postgres_plan_baseline_json_1.default.queries[0];
        const mutated = {
            ...baselineEntry.signature,
            indexName: 'unexpected_idx',
            estimatedRows: (baselineEntry.signature.estimatedRows ?? 0) * 2,
            children: baselineEntry.signature.children?.map((child) => ({
                ...child,
                joinType: 'Nested Loop',
            })),
        };
        const diffs = (0, plan_regression_1.comparePlanSignatures)(baselineEntry.signature, mutated);
        expect(diffs.length).toBeGreaterThan(0);
        const formatted = (0, plan_regression_1.formatPlanDiffs)(baselineEntry.id, baselineEntry.sql, diffs);
        expect(formatted).toContain('index');
        expect(formatted).toContain('estimatedRows');
    });
    it('keeps sql hashes stable across whitespace changes', () => {
        const sqlA = critical_queries_1.criticalQueries[1].sql;
        const sqlB = sqlA.replace(/\n/g, ' ');
        expect((0, plan_regression_1.hashSql)(sqlA)).toEqual((0, plan_regression_1.hashSql)(sqlB));
    });
});
const shouldRunIntegration = process.env.PLAN_REGRESSION_ENFORCE === 'true' &&
    !!(process.env.PLAN_REGRESSION_DATABASE_URL || process.env.DATABASE_URL);
(shouldRunIntegration ? describe : describe.skip)('plan regression integration', () => {
    it('compares critical plans against the stored baseline', async () => {
        jest.resetModules();
        const actualPg = jest.requireActual('pg');
        const { Pool } = actualPg;
        const connectionString = process.env.PLAN_REGRESSION_DATABASE_URL ||
            process.env.DATABASE_URL;
        const pool = new Pool({ connectionString });
        try {
            const results = await (0, plan_regression_1.checkPlansAgainstBaseline)({
                pool,
                analyze: process.env.PLAN_REGRESSION_ANALYZE === 'true',
            });
            const offenders = results.filter((result) => result.differences.length > 0);
            if (offenders.length > 0) {
                const message = offenders
                    .map((offender) => {
                    const query = critical_queries_1.criticalQueries.find((q) => q.id === offender.queryId);
                    return (0, plan_regression_1.formatPlanDiffs)(offender.queryId, query?.sql ?? offender.queryId, offender.differences);
                })
                    .join('\n\n');
                throw new Error(`${message}\nIf intentional, run pnpm dlx ts-node --esm reliability/plan-regression/update-baseline.ts and add a plan-baseline-change approval label.`);
            }
        }
        finally {
            await pool.end();
        }
    }, 30000);
});
