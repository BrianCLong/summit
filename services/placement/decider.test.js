// services/placement/decider.test.js
const { decide } = require('./decider');

test('moves to OCI when AWS credits low', () => {
  const p = { pinned: false, placement: 'auto' };
  const m = {
    aws: { creditsUsd: 40, freePlanDays: 10, errorRate: 0, p95ms: 150 },
    oci: { errorRate: 0, p95ms: 200 },
  };
  expect(decide(p, m)).toBe('oci');
});

test('stays on AWS when healthy & credits ok', () => {
  const p = { pinned: false, placement: 'auto' };
  const m = {
    aws: { creditsUsd: 150, freePlanDays: 120, errorRate: 0.005, p95ms: 180 },
    oci: { errorRate: 0.005, p95ms: 220 },
  };
  expect(decide(p, m)).toBe('aws');
});
