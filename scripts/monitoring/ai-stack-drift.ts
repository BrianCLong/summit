export function detectDrift(metrics: any) {
  if (metrics.policyViolationRate > 0 || metrics.reproFailureRate > 0.05) {
    emitAlert("ai-stack-drift");
  }
}
function emitAlert(name: string) {
  console.log(`Alert emitted: ${name}`);
}
