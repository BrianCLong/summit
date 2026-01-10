
import { FeatureFlags } from '../../server/src/config/featureFlags.js';

// Mock process.env to ensure we are testing defaults
const originalEnv = process.env;
process.env = {};

try {
  console.log('🔍 Verifying GA Feature Flag Defaults...');

  // Get instance (which loads from empty env, forcing defaults)
  const flags = FeatureFlags.getInstance();
  const allFlags = flags.getAll();

  // 1. Verify Application Features (Toggleable)
  const REQUIRED_APPS = [
    'ai.enabled',
    'audit.trail',
    'rbac.fineGrained',
    'opentelemetry.enabled',
    'copilot.service',
    'analytics.panel',
    'pdf.export',
    'narrative.simulation'
  ];

  // 2. Verify MVP1 Continuity Flags (Internal)
  const REQUIRED_MVP1 = [
    'mvp1.authentication',
    'mvp1.authorizationRbac',
    'mvp1.tenancyIsolation',
    'mvp1.auditLogging',
    'mvp1.dataIngestion',
    'mvp1.graphExploration',
    'mvp1.searchElastic',
    'mvp1.comments',
    'mvp1.notifications',
    'mvp1.workspaces',
    'mvp1.csvExports'
  ];

  // 3. Verify Agents
  const REQUIRED_AGENTS = [
    'agent.memory',
    'agent.toolUse',
    'agent.planning'
  ];

  const REQUIRED_FALSE = [
    'agent.multiSwarm',
    'agent.autonomousDeployment'
  ];

  let failed = false;

  const check = (list: string[], expected: boolean) => {
    for (const key of list) {
        // @ts-ignore
      const val = allFlags[key];
      if (val !== expected) {
        console.error(`❌ FAIL: Flag '${key}' should be ${expected} by default, but is ${val}`);
        failed = true;
      } else {
        console.log(`✅ PASS: ${key} is ${expected}`);
      }
    }
  };

  console.log('\n-- Application Features --');
  check(REQUIRED_APPS, true);

  console.log('\n-- MVP1 Continuity --');
  check(REQUIRED_MVP1, true);

  console.log('\n-- Agents --');
  check(REQUIRED_AGENTS, true);

  console.log('\n-- Experimental (Disabled) --');
  check(REQUIRED_FALSE, false);

  if (failed) {
    console.error('\n💥 Configuration Integrity Check FAILED. GA defaults have been altered.');
    process.exit(1);
  } else {
    console.log('\n✨ All GA Feature Flag defaults are correct.');
    process.exit(0);
  }

} catch (error) {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
} finally {
  process.env = originalEnv;
}
