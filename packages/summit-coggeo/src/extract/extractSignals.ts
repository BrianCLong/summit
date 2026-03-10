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

export async function extractSignals(obs: { id: string; ts: string; content: string }): Promise<ExtractSignalsResult> {
  const lower = obs.content.toLowerCase();

  let title = "Institutional trust shock";
  let summary = "A narrative centered on distrust, scandal, and public anger.";
  let tags = ["trust", "scandal", "anger"];

  if (lower.includes("corruption")) {
    title = "Corruption and waste backlash";
    summary = "A narrative focused on corruption, waste, and institutional failure.";
    tags = ["corruption", "waste", "institutional-failure"];
  }

  return {
    narratives: [
      {
        id: `narCand:demo-corruption-backlash`,
        obs_id: obs.id,
        ts: obs.ts,
        title,
        summary,
        tags,
        confidence: 0.72,
      },
    ],
    frames: [
      {
        id: `frame:${obs.id}`,
        obs_id: obs.id,
        ts: obs.ts,
        frame: "elite corruption",
        polarity: -0.7,
        confidence: 0.67,
      },
    ],
    emotions: [
      {
        id: `emo:${obs.id}`,
        obs_id: obs.id,
        ts: obs.ts,
        valence: -0.8,
        arousal: 0.9,
        anger: 0.82,
        fear: 0.33,
        sadness: 0.12,
        joy: 0.01,
        confidence: 0.74,
      },
    ],
    beliefs: [
      {
        id: `belief:${obs.id}`,
        obs_id: obs.id,
        ts: obs.ts,
        statement: "Institutions are wasting resources and cannot be trusted.",
        certainty: 0.76,
        confidence: 0.68,
        targets: ["institutions"],
      },
    ],
    provenance: { model: "stub-demo-v2", prompt_id: "stub-demo-v2" },
  };
}
