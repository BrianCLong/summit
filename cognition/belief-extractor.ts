import { BeliefState, EmotionLabel, NarrativeFrame, clampScore } from "./narrative-model";

export interface ExtractionInput {
  postId: string;
  text: string;
  observedAt: string;
  narrativeFrame: NarrativeFrame;
}

export interface BeliefCandidate {
  belief: BeliefState;
  evidenceId: string;
}

const EMOTION_KEYWORDS: Record<EmotionLabel, string[]> = {
  anger: ["outrage", "angry", "rage"],
  fear: ["threat", "danger", "unsafe"],
  resentment: ["betrayed", "unfair", "stolen"],
  betrayal: ["corrupt", "traitor", "sold out"],
  hope: ["restore", "future", "win"],
  neutral: [],
};

function inferEmotion(text: string): EmotionLabel {
  const normalized = text.toLowerCase();

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS) as [
    EmotionLabel,
    string[],
  ][]) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return emotion;
    }
  }

  return "neutral";
}

export function extractBeliefCandidate(input: ExtractionInput): BeliefCandidate {
  const emotion = inferEmotion(input.text);
  const certainty = clampScore(Math.min(1, input.text.length / 280));

  return {
    evidenceId: input.postId,
    belief: {
      id: `${input.postId}:belief`,
      statement: input.text.trim(),
      certainty,
      emotionalValence: emotion === "neutral" ? 0.5 : 0.75,
      narrativeFrameId: input.narrativeFrame.id,
      extractedAt: input.observedAt,
    },
  };
}
