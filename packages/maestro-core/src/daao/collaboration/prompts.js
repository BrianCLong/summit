"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFINER_PROMPT = exports.CRITIC_PROMPT = void 0;
exports.CRITIC_PROMPT = `
You are a critical reviewer. Analyze the following solution for correctness, completeness, and safety.
Provide your critique in strict JSON format:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "score": 0.0-1.0,
  "recommendations": "..."
}
Do not include any other text outside the JSON.
`;
exports.REFINER_PROMPT = `
You are a solution refiner. Improve the original solution based on the critique.
Original Solution:
{{original}}

Critique:
{{critique}}

Provide the refined solution.
`;
