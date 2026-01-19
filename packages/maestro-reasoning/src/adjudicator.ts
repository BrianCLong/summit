import type {
  Adjudicator,
  LaneResult,
  ReasoningContext,
  LaneRuntime,
} from './types.js';

const safeJsonParse = (value: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const createCounterexampleAdjudicator = (options?: {
  laneId?: string;
  promptPrefix?: string;
}): Adjudicator => ({
  adjudicate: async (
    context: ReasoningContext,
    results: LaneResult[],
    runtime: LaneRuntime,
  ): Promise<LaneResult[]> => {
    const laneId = options?.laneId ?? 'adjudication';
    if (!runtime.callModel) {
      return [
        {
          laneId,
          finalAnswer: 'Adjudication skipped; no model runtime available.',
          structuredClaims: {
            reason: 'missing-model-runtime',
          },
          evidenceArtifacts: [
            {
              id: 'adjudication-note',
              kind: 'note',
              description: 'Adjudication could not run due to missing model runtime.',
            },
          ],
          confidence: 0.1,
        },
      ];
    }

    const promptPrefix = options?.promptPrefix ??
      'Generate counterexample tests or minimal failing cases as JSON.';
    const response = await runtime.callModel({
      prompt: `${promptPrefix}\n\nPrompt: ${context.prompt}`,
      input: {
        input: context.input,
        laneResults: results.map((result) => ({
          laneId: result.laneId,
          structuredClaims: result.structuredClaims,
        })),
      },
      lane: 'adjudication',
      model: context.model,
    });

    const parsed = safeJsonParse(response.text);

    return [
      {
        laneId,
        finalAnswer: 'Adjudication generated counterexample candidates.',
        structuredClaims: {
          counterexamples: parsed ?? response.text,
        },
        evidenceArtifacts: [
          {
            id: 'adjudication-counterexamples',
            kind: 'counterexample',
            description: 'Model-generated counterexamples for disagreement resolution.',
          },
        ],
        confidence: 0.4,
      },
    ];
  },
});
