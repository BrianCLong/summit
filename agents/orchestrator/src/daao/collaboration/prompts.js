"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFINER_PROMPT = exports.CRITIC_PROMPT = void 0;
exports.CRITIC_PROMPT = `You are a critical reviewer.
Analyze the provided draft answer for accuracy, completeness, and safety.
Output your critique in JSON format:
{
  "issues": ["list", "of", "issues"],
  "score": 0.0 to 1.0 (1.0 is perfect),
  "safe": boolean
}`;
exports.REFINER_PROMPT = `You are an expert editor.
Improve the draft answer based on the critique provided.
Draft: {{draft}}
Critique: {{critique}}
Return only the refined text.`;
