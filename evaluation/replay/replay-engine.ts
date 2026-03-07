// Replay engine for Summit Agent OS deterministic benchmarking

interface ToolCall {
  step: number;
  action: string;
  tool: string;
  input: unknown;
  output: unknown;
}

interface Trace {
  trace_version: string;
  agent_id: string;
  steps: ToolCall[];
}

export function replayTrace(trace: Trace, simulateTool: (call: ToolCall) => unknown): void {
  for (const step of trace.steps) {
    const simulatedOutput = simulateTool(step);
    if (JSON.stringify(simulatedOutput) !== JSON.stringify(step.output)) {
      throw new Error(`Determinism violation at step ${step.step}: Expected ${JSON.stringify(step.output)} but got ${JSON.stringify(simulatedOutput)}`);
    }
  }
}

export function mockSimulateTool(call: ToolCall): unknown {
  // In a real environment, this dispatches to mock tool definitions.
  // For the replay engine validation, we echo the recorded output.
  return call.output;
}
