export const CRITIC_PROMPT = `You are a critical reviewer.
Analyze the provided draft answer for accuracy, completeness, and safety.
Output your critique in JSON format:
{
  "issues": ["list", "of", "issues"],
  "score": 0.0 to 1.0 (1.0 is perfect),
  "safe": boolean
}`;

export const REFINER_PROMPT = `You are an expert editor.
Improve the draft answer based on the critique provided.
Draft: {{draft}}
Critique: {{critique}}
Return only the refined text.`;
