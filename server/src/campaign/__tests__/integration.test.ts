import assert from 'assert';
import { loadCampaignTemplate, validateCampaign } from '../builders';
import { createEvidenceBundle } from '../../provenance/evidence_bundle/generator';
import { enforce } from '../../governance/cogops/enforcement';
import { defaultPolicies } from '../../governance/cogops/policies';

async function runTest() {
  console.log('Starting Integration Test for Cognitive Ops (v2)...');

  // 1. Load Campaign Template
  console.log('Loading Espionage Template...');
  const campaign = await loadCampaignTemplate('espionage_eu');
  assert(campaign, 'Campaign should be loaded');
  assert(validateCampaign(campaign), 'Campaign should be valid');
  console.log(`Loaded campaign: ${campaign.name}`);

  // 2. Test Governance Policies & Create Evidence
  console.log('Testing Governance & Generating Evidence...');

  // 2.1 Valid Action (Monitor)
  const validAction = campaign.actions[0];
  const result1 = enforce(validAction, campaign, defaultPolicies);
  assert(result1.allowed, 'Monitoring action should be allowed');

  // Create evidence bundle with PASS result
  const bundlePass = createEvidenceBundle(campaign, result1);
  // The espionage_eu.json has action timestamp "2026-02-04T12:00:00Z"
  assert(bundlePass.report.evidence_id.includes('20260204'), `ID should include campaign timestamp 20260204, got ${bundlePass.report.evidence_id}`);
  assert(bundlePass.report.result === 'pass', 'Report result should be pass');
  console.log(`Generated PASS Evidence ID: ${bundlePass.report.evidence_id}`);

  // 2.2 Violation (Deepfake without label)
  const badAction = {
      ...validAction,
      id: 'ACT-BAD-01',
      type: 'seed' as const,
      metadata: { is_synthetic: true }, // Missing label
      timestamp: '2026-02-10T12:00:00Z'
  };

  const result2 = enforce(badAction, campaign, defaultPolicies);
  assert(!result2.allowed, 'Unlabeled synthetic media should be blocked');

  // Create evidence bundle with FAIL result
  const bundleFail = createEvidenceBundle(campaign, result2);
  assert(bundleFail.report.result === 'fail', 'Report result should be fail');
  // Note: bundleFail still uses campaign.actions for timestamp generation, so ID is same as pass
  // But metrics should differ
  assert(bundleFail.metrics.metadata?.policyViolations === 1, 'Metrics should count 1 violation');
  console.log(`Generated FAIL Evidence ID: ${bundleFail.report.evidence_id}`);

  console.log('Integration Test Passed!');
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
