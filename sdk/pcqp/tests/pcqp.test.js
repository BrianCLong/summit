"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_url_1 = require("node:url");
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("../src/index.js");
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
const goldenPlanPath = node_path_1.default.resolve(__dirname, '../../../pcqp/tests/golden/compliant_plan.json');
(0, vitest_1.describe)('pcqp sdk', () => {
    (0, vitest_1.it)('loads and normalizes the golden federated plan', async () => {
        const plan = await (0, index_js_1.loadPlanFromFile)(goldenPlanPath);
        (0, vitest_1.expect)(plan.subplans).toHaveLength(2);
        (0, vitest_1.expect)(plan.subplans[0].sourceAlias).toBe('c');
        (0, vitest_1.expect)(plan.coordinator.joinStrategy).toEqual({ Broadcast: { build: 'c' } });
    });
    (0, vitest_1.it)('computes policy gate summaries deterministically', async () => {
        const plan = await (0, index_js_1.loadPlanFromFile)(goldenPlanPath);
        const summary = (0, index_js_1.policyGateSummary)(plan);
        (0, vitest_1.expect)(summary['policy::residency::us']).toBe(1);
        (0, vitest_1.expect)(summary['policy::egress::customers']).toBe(2);
        (0, vitest_1.expect)(Object.values(summary).reduce((acc, value) => acc + value, 0)).toBe(plan.compliance.events.length);
    });
    (0, vitest_1.it)('maps subplans for a requested silo', async () => {
        const plan = await (0, index_js_1.loadPlanFromFile)(goldenPlanPath);
        const euSubplans = (0, index_js_1.getSubplansForSilo)(plan, 'Eu');
        (0, vitest_1.expect)(euSubplans).toHaveLength(1);
        (0, vitest_1.expect)(euSubplans[0].pushedProjections).toEqual(['customer_id', 'loyalty_tier']);
    });
    (0, vitest_1.it)('exposes the compliance timeline in recorded order', async () => {
        const plan = await (0, index_js_1.loadPlanFromFile)(goldenPlanPath);
        const timeline = (0, index_js_1.complianceTimeline)(plan);
        (0, vitest_1.expect)(timeline[0]).toMatch(/policy::residency::us/);
        (0, vitest_1.expect)(timeline.at(-1)).toContain('policy::join-strategy');
    });
    (0, vitest_1.it)('finds the first event for a policy', async () => {
        const plan = await (0, index_js_1.loadPlanFromFile)(goldenPlanPath);
        const event = (0, index_js_1.findFirstPolicyEvent)(plan, 'policy::egress::orders');
        (0, vitest_1.expect)(event?.message).toContain('amount');
    });
    (0, vitest_1.it)('rejects malformed plans', () => {
        const malformed = { bad: true };
        (0, vitest_1.expect)(() => (0, index_js_1.parseFederatedPlan)(malformed)).toThrowError(/Plan must include an array of subplans/);
    });
});
