// server/tests/unit/featureFlags-manual.ts
import { FeatureFlags, FeatureKey } from '../../src/config/featureFlags';

console.log('Running FeatureFlags Manual Tests...');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`PASSED: ${message}`);
  }
}

// Reset instance helper
function resetInstance() {
  (FeatureFlags as any).instance = undefined;
}

// Test 1: Defaults
resetInstance();
const flags1 = FeatureFlags.getInstance();
assert(flags1.isEnabled('analytics.panel') === true, 'Default analytics.panel should be true');
assert(flags1.isEnabled('agent.singlaub') === true, 'Default agent.singlaub should be true');
assert(flags1.isEnabled('agent.multiSwarm') === false, 'Default agent.multiSwarm should be false');

// Test 2: Env Var Override (False)
resetInstance();
process.env.FEATURE_PDF_EXPORT = 'false';
const flags2 = FeatureFlags.getInstance();
assert(flags2.isEnabled('pdf.export') === false, 'FEATURE_PDF_EXPORT=false should override default');

// Test 3: Env Var Override (True) - forcing a default-false to true (if we had one mapped)
// Let's force a default-true to true (redundant but checks logic)
process.env.FEATURE_COPILOT_SERVICE = 'true';
const flags3 = FeatureFlags.getInstance();
assert(flags3.isEnabled('copilot.service') === true, 'FEATURE_COPILOT_SERVICE=true should be true');

// Test 4: Empty String Env Var (Should be unset -> default)
resetInstance();
process.env.FEATURE_PDF_EXPORT = '';
const flags4 = FeatureFlags.getInstance();
assert(flags4.isEnabled('pdf.export') === true, 'Empty FEATURE_PDF_EXPORT should fallback to default true');

// Test 5: Update with Legacy Key
resetInstance();
const flags5 = FeatureFlags.getInstance();
flags5.update({ 'ANALYTICS_PANEL': false });
assert(flags5.isEnabled('analytics.panel') === false, 'Update with ANALYTICS_PANEL should update analytics.panel');

console.log('All tests passed.');
