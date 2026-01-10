import path from 'path';
import { createRepoBaselineSnapshot } from '../repoBaselineProducer.js';
import { createRuntimeSnapshot } from '../runtimeSnapshotProducer.js';
import { compareSnapshots } from '../comparator.js';
import { PolicyDriftMonitor } from '../monitor.js';
import { driftAlertStore } from '../alertStore.js';

const fixtureRoot = path.resolve(
  process.cwd(),
  'src/security/policyDrift/__tests__/__fixtures__/baseline'
);

process.env.POLICY_DRIFT_SKIP_AUDIT = 'true';
process.env.POLICY_DRIFT_SKIP_TELEMETRY = 'true';

describe('Policy Drift Snapshot Producers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('normalizes repo baseline from fixtures', () => {
    const snapshot = createRepoBaselineSnapshot(fixtureRoot);
    expect(snapshot.normalized.toolAllowlist).toContain('api.example.com');
    expect(snapshot.normalized.strictAttribution).toBe(true);
    expect(snapshot.metadata.environment).toBe('repo-baseline');
  });

  it('redacts sensitive runtime fields', () => {
    process.env.TOOL_ALLOWLIST = 'a,b,c';
    process.env.REDACTION_FIELDS = 'verysecrettokenvalue';
    const snapshot = createRuntimeSnapshot({ environment: 'test' });
    expect(snapshot.normalized.redaction.fields[0]).toBe('***REDACTED***');
  });
});

describe('Policy drift comparator', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('classifies risky and critical changes deterministically', () => {
    const baseline = createRepoBaselineSnapshot(fixtureRoot);
    process.env.TOOL_ALLOWLIST = 'api.example.com,audit.example.com,new-tool';
    process.env.BUDGET_CAP_USD = '100';
    process.env.STRICT_ATTRIBUTION = 'false';
    const runtime = createRuntimeSnapshot({ environment: 'prod' });

    const report = compareSnapshots(baseline, runtime);
    expect(report.severity).toBe('critical');
    const paths = report.diffs.map((diff: { path: string }) => diff.path);
    expect(paths).toEqual(
      expect.arrayContaining(['toolAllowlist.2', 'budgets.globalUsdCap', 'strictAttribution'])
    );
  });
});

describe('Policy drift monitor outputs', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    driftAlertStore.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('emits alerts and proposals without mutating runtime', async () => {
    process.env.TOOL_ALLOWLIST = 'api.example.com,audit.example.com,new-tool';
    process.env.BUDGET_CAP_USD = '250';
    const monitor = new PolicyDriftMonitor({ warnOnly: true, enabled: true });
    await monitor.runCheck();
    const alerts = driftAlertStore.all();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].proposals.length).toBe(3);
  });
});
