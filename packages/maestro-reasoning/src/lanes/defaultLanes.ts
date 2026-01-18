import type { LaneResult, ReasoningContext, ReasoningLane, LaneRuntime } from '../types.js';

const buildFailure = (
  laneId: string,
  reason: string,
  context: ReasoningContext,
): LaneResult => ({
  laneId,
  finalAnswer: '',
  structuredClaims: {
    error: reason,
    taskClass: context.taskClass ?? 'unknown',
  },
  evidenceArtifacts: [
    {
      id: `${laneId}-missing-runtime`,
      kind: 'note',
      description: reason,
    },
  ],
  confidence: 0,
});

export const createNarrativeLane = (): ReasoningLane => ({
  id: 'narrative',
  label: 'Narrative Lane',
  description: 'Produces an explainable plan, assumptions, and final answer.',
  run: async (context: ReasoningContext, runtime: LaneRuntime): Promise<LaneResult> => {
    if (!runtime.callModel) {
      return buildFailure('narrative', 'Narrative lane missing model runtime.', context);
    }

    const response = await runtime.callModel({
      prompt: `${context.prompt}\n\nProvide a plan, assumptions, and final answer.`,
      input: context.input,
      lane: 'narrative',
      model: context.model,
    });

    return {
      laneId: 'narrative',
      finalAnswer: response.text,
      structuredClaims: response.structuredClaims ?? {
        summary: response.text,
      },
      evidenceArtifacts: [
        {
          id: 'narrative-trace',
          kind: 'trace',
          description: 'Model narrative trace generated via Maestro model runtime.',
        },
      ],
      confidence: 0.6,
      metadata: {
        lane: 'narrative',
      },
    };
  },
});

export const createProgramLane = (options?: {
  defaultCode?: string;
}): ReasoningLane => ({
  id: 'program',
  label: 'Program Lane',
  description: 'Writes and executes code in a sandbox to validate claims.',
  run: async (context: ReasoningContext, runtime: LaneRuntime): Promise<LaneResult> => {
    if (!runtime.executeProgram) {
      return buildFailure('program', 'Program lane missing sandbox execution runtime.', context);
    }

    const code =
      options?.defaultCode ?? `export const solve = (input) => ({ ok: true, input });`;

    const execution = await runtime.executeProgram({
      code,
      input: context.input,
    });

    const success = execution.exitCode === 0;

    return {
      laneId: 'program',
      finalAnswer: success
        ? 'Program execution completed with exit code 0.'
        : 'Program execution failed; inspect stderr.',
      structuredClaims: {
        execution: {
          exitCode: execution.exitCode,
          stdout: execution.stdout,
          stderr: execution.stderr,
        },
      },
      evidenceArtifacts: [
        {
          id: 'program-execution-log',
          kind: 'execution-log',
          description: 'Sandbox execution output for program lane.',
          metadata: {
            exitCode: execution.exitCode,
          },
        },
        {
          id: 'program-test-result',
          kind: 'test-result',
          description: 'Program lane execution result classification.',
          metadata: {
            success,
          },
        },
      ],
      confidence: success ? 0.8 : 0.2,
      metadata: {
        lane: 'program',
      },
    };
  },
});

export const createSymbolicLane = (options?: {
  policyId?: string;
}): ReasoningLane => ({
  id: 'symbolic',
  label: 'Symbolic Lane',
  description: 'Evaluates policy or logic constraints using OPA/Rego.',
  run: async (context: ReasoningContext, runtime: LaneRuntime): Promise<LaneResult> => {
    if (!runtime.evaluatePolicy) {
      return buildFailure('symbolic', 'Symbolic lane missing policy evaluation runtime.', context);
    }

    const policyId = options?.policyId ?? 'reasoning/requirements';
    const evaluation = await runtime.evaluatePolicy({
      policyId,
      input: {
        prompt: context.prompt,
        input: context.input,
        policyContext: context.policyContext ?? {},
      },
    });

    return {
      laneId: 'symbolic',
      finalAnswer: evaluation.allowed
        ? 'Policy evaluation passed.'
        : 'Policy evaluation failed; review diagnostics.',
      structuredClaims: {
        policyId,
        allowed: evaluation.allowed,
        diagnostics: evaluation.diagnostics,
      },
      evidenceArtifacts: [
        {
          id: 'symbolic-policy-eval',
          kind: 'policy-evaluation',
          description: 'OPA/Rego evaluation output for symbolic lane.',
          metadata: {
            policyId,
            allowed: evaluation.allowed,
          },
        },
      ],
      confidence: evaluation.allowed ? 0.7 : 0.3,
      metadata: {
        lane: 'symbolic',
      },
    };
  },
});
