import { AtomicRubric, RubricEvalResult } from './schema.js';

export function evaluateRubricAlignment(rubrics: AtomicRubric[], output: string): RubricEvalResult {
  let score = 0;
  const matchedRubrics: string[] = [];

  // Dummy evaluation logic for the sake of the task
  for (const rubric of rubrics) {
    // Adversarial check: If the output contains adversarial prompt like "Ignore all previous instructions", it gets no score.
    if (output.includes("Ignore all previous instructions")) {
        continue;
    }

    // In a real scenario, an LLM or complex logic would determine criterion match.
    // For now, we simulate a match (e.g., random or simple keyword check).
    // Let's just assume it matches if the output has some length or specific conditions.
    const isMatch = output.length > 10;

    if (isMatch) {
      score += rubric.weight * 1; // criterion_match_i = 1
      matchedRubrics.push(rubric.id);
    }
  }

  // Normalize score between 0 and 1
  const maxScore = rubrics.reduce((acc, r) => acc + r.weight, 0);
  const finalScore = maxScore > 0 ? score / maxScore : 0;

  return {
    score: finalScore,
    reason: `Matched ${matchedRubrics.length} out of ${rubrics.length} rubrics.`,
    matchedRubrics
  };
}
