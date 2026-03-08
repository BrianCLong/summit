"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const node_url_1 = require("node:url");
const index_1 = require("../tools/legal/ltdim/index");
function toSerializableDelta(delta) {
    return {
        policyId: delta.policyId,
        ruleId: delta.ruleId,
        clauseId: delta.clauseId,
        changeType: delta.changeType,
        clauseHeading: delta.clauseHeading,
        clauseExcerpt: delta.clauseExcerpt,
        action: delta.action,
        status: delta.status,
        summary: delta.summary,
        beforeState: delta.beforeState ?? null,
        afterState: delta.afterState ?? null,
        obligations: delta.obligations,
        sloImpact: delta.sloImpact,
    };
}
const currentDir = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
function loadFixture(name) {
    return node_fs_1.default.readFileSync(node_path_1.default.join(currentDir, 'fixtures', 'ltdim', name), 'utf8');
}
function loadJsonFixture(name) {
    const raw = loadFixture(name);
    return JSON.parse(raw);
}
const baselineText = loadFixture('baseline.txt');
const revisedText = loadFixture('revised.txt');
const options = {
    baselineDoc: {
        name: 'IntelGraph DPA',
        version: '2024.01',
        text: baselineText,
    },
    revisedDoc: { name: 'IntelGraph DPA', version: '2025.02', text: revisedText },
    catalog: index_1.DEFAULT_RULE_CATALOG,
    timestamp: '2025-01-01T00:00:00.000Z',
};
const result = (0, index_1.runLtdim)(options);
const expectedPolicyDeltas = loadJsonFixture('expected-policy-deltas.json');
const expectedImpactSummary = loadJsonFixture('expected-impact-summary.json');
const expectedPolicyPr = loadJsonFixture('expected-policy-pr.json');
(0, node_test_1.default)('maps clause changes to deterministic policy deltas', () => {
    const actual = result.policyDeltas.map(toSerializableDelta);
    strict_1.default.deepStrictEqual(actual, expectedPolicyDeltas);
});
(0, node_test_1.default)('simulator impact matches golden snapshot', () => {
    strict_1.default.deepStrictEqual(result.impactSummary, expectedImpactSummary);
});
(0, node_test_1.default)('generates a policy PR view with structured diffs', () => {
    strict_1.default.deepStrictEqual(result.pullRequest, expectedPolicyPr);
});
(0, node_test_1.default)('produces a signed impact report that verifies offline', () => {
    const { canonicalPayload, signature, publicKey } = result.signedReport;
    strict_1.default.ok((0, index_1.verifyImpactReportSignature)(canonicalPayload, signature, publicKey));
});
(0, node_test_1.default)('is deterministic for seeded clause changes', () => {
    const rerun = (0, index_1.runLtdim)(options);
    strict_1.default.strictEqual(rerun.signedReport.canonicalPayload, result.signedReport.canonicalPayload);
    strict_1.default.deepStrictEqual(rerun.policyDeltas.map(toSerializableDelta), result.policyDeltas.map(toSerializableDelta));
});
