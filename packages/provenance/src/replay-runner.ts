import { Trace } from './trace-model';

export interface ReplayContext {
  mockResults: Record<string, any>;
  strictMode: boolean; // If true, fail if inputs don't match exactly
}

export interface ReplayResult {
  success: boolean;
  traceId: string;
  replayTraceId: string;
  stepResults: {
    stepId: string;
    matched: boolean;
    output?: any;
    error?: string;
  }[];
}

export abstract class ReplayRunner {
  // Abstract because actual execution requires access to the Gateway/Connectors
  abstract executeStep(stepId: string, inputs: any): Promise<any>;

  async replay(trace: Trace, context: ReplayContext): Promise<ReplayResult> {
    const replayTraceId = `replay-${trace.id}-${Date.now()}`;
    const stepResults = [];
    let success = true;

    for (const step of trace.steps) {
      if (step.type !== 'action') continue;

      try {
        // In a real replay, we might use the original inputs or overridden inputs
        const output = await this.executeStep(step.name, step.inputs);

        // Compare output with original output
        const matched = JSON.stringify(output) === JSON.stringify(step.outputs);

        stepResults.push({
          stepId: step.id,
          matched,
          output
        });

        if (!matched && context.strictMode) {
          success = false;
          break;
        }

      } catch (error: any) {
         stepResults.push({
          stepId: step.id,
          matched: false,
          error: error.message
        });
        success = false;
      }
    }

    return {
      success,
      traceId: trace.id,
      replayTraceId,
      stepResults
    };
  }
}
