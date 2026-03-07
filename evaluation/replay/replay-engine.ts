export function simulateTool(step: any) {
  // Dummy tool simulation
  return step.output || null;
}

export function replayTrace(trace: any) {
  if (!trace || !trace.steps) return;
  for (const step of trace.steps) {
    simulateTool(step);
  }
}
