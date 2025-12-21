import path from 'path';
import { PolicyService, loadExampleContexts } from '../src/policy-service';

const baseline = path.join(__dirname, '..', 'policies', 'examples', 'baseline.json');
const denyPolicy = path.join(__dirname, '..', 'policies', 'examples', 'deny-export-no-purpose.json');

describe('PolicyService', () => {
  it('simulates contexts deterministically', () => {
    const service = new PolicyService(baseline);
    const snapshot = service.simulate(loadExampleContexts());
    expect(snapshot).toHaveLength(2);
    const exportDecision = snapshot.find((entry) => entry.context.action === 'export:bundle');
    expect(exportDecision?.decision.allowed).toBe(false);
  });

  it('diffs across policy versions', () => {
    const service = new PolicyService(baseline);
    const differences = service.diff(denyPolicy, loadExampleContexts());
    expect(differences.some((entry) => entry.context.action === 'graph:read')).toBe(true);
  });
});
