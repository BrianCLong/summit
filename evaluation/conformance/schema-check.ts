export interface RunArtifacts {
  trace: unknown;
  plan: unknown;
  metrics: unknown;
  report: unknown;
  stamp: unknown;
}

export function assertDeterministicArtifacts(a: RunArtifacts, b: RunArtifacts) {
  // Use a deep equality check or assert depending on test runner
  // For the actual code it doesn't need to import assert directly if it throws
  // or it can just return a boolean. We will use node:assert in tests.
  // We'll just provide a simple implementation.
  const stringify = (obj: unknown) => JSON.stringify(obj);
  if (stringify(a.trace) !== stringify(b.trace)) throw new Error('trace mismatch');
  if (stringify(a.plan) !== stringify(b.plan)) throw new Error('plan mismatch');
  if (stringify(a.metrics) !== stringify(b.metrics)) throw new Error('metrics mismatch');
  if (stringify(a.report) !== stringify(b.report)) throw new Error('report mismatch');
}
