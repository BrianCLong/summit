export interface NarrativeCandidate {
  id: string;
  obs_id: string;
  ts: string;
  title: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export interface FrameSignal {
  id: string;
  obs_id: string;
  ts: string;
  frame: string;
  polarity: number;
  confidence: number;
}

export interface EmotionSignal {
  id: string;
  obs_id: string;
  ts: string;
  valence: number;
  arousal: number;
  anger?: number;
  fear?: number;
  sadness?: number;
  joy?: number;
  confidence: number;
}

export interface BeliefSignal {
  id: string;
  obs_id: string;
  ts: string;
  statement: string;
  certainty: number;
  confidence: number;
  targets: string[];
}

export interface ExtractSignalsResult {
  narratives: NarrativeCandidate[];
  frames: FrameSignal[];
  emotions: EmotionSignal[];
  beliefs: BeliefSignal[];
  provenance: { model: string; prompt_id: string };
}

/**
 * Extract cognitive signals from a raw observation.
 *
 * TODO: Wire to your model gateway (Claude/OpenAI/local) with strict JSON schema output.
 *       Return empty arrays on partial extraction rather than throwing.
 *       Each extracted object must carry obs_id and provenance (model+prompt_id).
 */
export async function extractSignals(obs: {
  id: string;
  ts: string;
  content: string;
}): Promise<ExtractSignalsResult> {
  return {
    narratives: [
      {
        id: `narCand:${obs.id.replace('obs:', '')}`,
        obs_id: obs.id,
        ts: obs.ts,
        title: 'Unclassified narrative (stub)',
        summary:
          'Signal extraction not yet wired to LLM. Replace extractSignals() with model gateway call.',
        tags: [],
        confidence: 0.01,
      },
    ],
    frames: [],
    emotions: [],
    beliefs: [],
    provenance: { model: 'stub', prompt_id: 'stub' },
  };
}
