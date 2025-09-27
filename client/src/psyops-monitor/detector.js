const EMOTION_KEYWORDS = {
  anger: ["hate", "furious", "rage"],
  fear: ["fear", "terror", "panic"],
  disgust: ["disgust", "vile", "gross"],
  joy: ["happy", "joy", "delight"],
  sadness: ["sad", "depress", "gloom"],
};

const BIAS_PHRASES = [
  "everyone knows",
  "no one can deny",
  "fake news",
  "the truth is",
  "always",
  "never",
];

export function analyzeText(text) {
  const lower = (text || "").toLowerCase();
  let score = 0;
  const tags = [];

  Object.entries(EMOTION_KEYWORDS).forEach(([emotion, words]) => {
    if (words.some((w) => lower.includes(w))) {
      score += 0.2;
      tags.push(`emotion:${emotion}`);
    }
  });

  if (BIAS_PHRASES.some((p) => lower.includes(p))) {
    score += 0.2;
    tags.push("bias");
  }

  return {
    score: Math.min(1, score),
    tags,
  };
}
