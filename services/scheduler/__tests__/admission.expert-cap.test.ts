import fs from 'fs';
import os from 'os';
import path from 'path';
import { AdmissionController } from '../admission/admission-controller';

function writeQoS(tmp: string) {
  fs.writeFileSync(
    path.join(tmp, 'qos.yaml'),
    `
classes:
  business:
    explore_max: 0.08
    queue_target_sec: 10
    budget_overdraft_pct: 0
    experts:
      osint_analysis: { explore_max: 0.12 }
`,
  );
  return path.join(tmp, 'qos.yaml');
}

test('uses per-expert cap when present', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qos-'));
  const ctrl = new AdmissionController(writeQoS(dir));
  const d = ctrl.shouldAdmit(
    { tenantTier: 'business', expert: 'osint_analysis', exploration: true },
    {
      recentExploreRatio: 0.1,
      queueOldestAgeSec: 1,
      tenantBudgetRemaining: 1.0,
    }, // 10% < 12% cap
  );
  expect(d.ok).toBe(true);
});
