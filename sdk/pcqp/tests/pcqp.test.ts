import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  complianceTimeline,
  findFirstPolicyEvent,
  getSubplansForSilo,
  loadPlanFromFile,
  parseFederatedPlan,
  policyGateSummary
} from '../src/index.js';
import type { FederatedPlan } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goldenPlanPath = path.resolve(__dirname, '../../../pcqp/tests/golden/compliant_plan.json');

describe('pcqp sdk', () => {
  it('loads and normalizes the golden federated plan', async () => {
    const plan = await loadPlanFromFile(goldenPlanPath);
    expect(plan.subplans).toHaveLength(2);
    expect(plan.subplans[0].sourceAlias).toBe('c');
    expect(plan.coordinator.joinStrategy).toEqual({ Broadcast: { build: 'c' } });
  });

  it('computes policy gate summaries deterministically', async () => {
    const plan = await loadPlanFromFile(goldenPlanPath);
    const summary = policyGateSummary(plan);
    expect(summary['policy::residency::us']).toBe(1);
    expect(summary['policy::egress::customers']).toBe(2);
    expect(Object.values(summary).reduce((acc, value) => acc + value, 0)).toBe(plan.compliance.events.length);
  });

  it('maps subplans for a requested silo', async () => {
    const plan = await loadPlanFromFile(goldenPlanPath);
    const euSubplans = getSubplansForSilo(plan, 'Eu');
    expect(euSubplans).toHaveLength(1);
    expect(euSubplans[0].pushedProjections).toEqual(['customer_id', 'loyalty_tier']);
  });

  it('exposes the compliance timeline in recorded order', async () => {
    const plan = await loadPlanFromFile(goldenPlanPath);
    const timeline = complianceTimeline(plan);
    expect(timeline[0]).toMatch(/policy::residency::us/);
    expect(timeline.at(-1)).toContain('policy::join-strategy');
  });

  it('finds the first event for a policy', async () => {
    const plan = await loadPlanFromFile(goldenPlanPath);
    const event = findFirstPolicyEvent(plan, 'policy::egress::orders');
    expect(event?.message).toContain('amount');
  });

  it('rejects malformed plans', () => {
    const malformed = { bad: true } as unknown as FederatedPlan;
    expect(() => parseFederatedPlan(malformed as unknown as object)).toThrowError(/Plan must include an array of subplans/);
  });
});
