"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const builders_1 = require("../builders");
const generator_1 = require("../../provenance/evidence_bundle/generator");
const enforcement_1 = require("../../governance/cogops/enforcement");
const policies_1 = require("../../governance/cogops/policies");
async function runTest() {
    console.log('Starting Integration Test for Cognitive Ops (v2)...');
    // 1. Load Campaign Template
    console.log('Loading Espionage Template...');
    const campaign = await (0, builders_1.loadCampaignTemplate)('espionage_eu');
    (0, assert_1.default)(campaign, 'Campaign should be loaded');
    (0, assert_1.default)((0, builders_1.validateCampaign)(campaign), 'Campaign should be valid');
    console.log(`Loaded campaign: ${campaign.name}`);
    // 2. Test Governance Policies & Create Evidence
    console.log('Testing Governance & Generating Evidence...');
    // 2.1 Valid Action (Monitor)
    const validAction = campaign.actions[0];
    const result1 = (0, enforcement_1.enforce)(validAction, campaign, policies_1.defaultPolicies);
    (0, assert_1.default)(result1.allowed, 'Monitoring action should be allowed');
    // Create evidence bundle with PASS result
    const bundlePass = (0, generator_1.createEvidenceBundle)(campaign, result1);
    // The espionage_eu.json has action timestamp "2026-02-04T12:00:00Z"
    (0, assert_1.default)(bundlePass.report.evidence_id.includes('20260204'), `ID should include campaign timestamp 20260204, got ${bundlePass.report.evidence_id}`);
    (0, assert_1.default)(bundlePass.report.result === 'pass', 'Report result should be pass');
    console.log(`Generated PASS Evidence ID: ${bundlePass.report.evidence_id}`);
    // 2.2 Violation (Deepfake without label)
    const badAction = {
        ...validAction,
        id: 'ACT-BAD-01',
        type: 'seed',
        metadata: { is_synthetic: true }, // Missing label
        timestamp: '2026-02-10T12:00:00Z'
    };
    const result2 = (0, enforcement_1.enforce)(badAction, campaign, policies_1.defaultPolicies);
    (0, assert_1.default)(!result2.allowed, 'Unlabeled synthetic media should be blocked');
    // Create evidence bundle with FAIL result
    const bundleFail = (0, generator_1.createEvidenceBundle)(campaign, result2);
    (0, assert_1.default)(bundleFail.report.result === 'fail', 'Report result should be fail');
    // Note: bundleFail still uses campaign.actions for timestamp generation, so ID is same as pass
    // But metrics should differ
    (0, assert_1.default)(bundleFail.metrics.metadata?.policyViolations === 1, 'Metrics should count 1 violation');
    console.log(`Generated FAIL Evidence ID: ${bundleFail.report.evidence_id}`);
    console.log('Integration Test Passed!');
}
runTest().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
