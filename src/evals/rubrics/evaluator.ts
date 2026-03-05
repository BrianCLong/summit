import { AtomicRubric } from './schema';

/**
 * Scores an output string against a set of atomic rubrics.
 * In a real implementation, this would likely invoke an LLM or specific regexes.
 * This mock uses deterministic scoring to ensure repeatable tests.
 */
export function scoreOutput(rubrics: AtomicRubric[], output: string): number {
  if (rubrics.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  for (const rubric of rubrics) {
    const criterionMatch = simulateMatch(rubric.criterion, output);
    totalScore += rubric.weight * criterionMatch;
    totalWeight += rubric.weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function simulateMatch(criterion: string, output: string): number {
  const lowerOutput = output.toLowerCase();

  // Base mock score to simulate LLM partial matching, using deterministic logic
  // based on the length of the output string modulo 3 to provide some variation.
  let matchScore = 0.5 + (output.length % 3) * 0.1;

  // Specific mock checks for the dataset examples
  if (criterion.includes("standard libraries") && lowerOutput.includes("import numpy")) {
    matchScore += 0.3;
  }

  if (criterion.includes("dates") && /\d{4}/.test(lowerOutput)) {
    matchScore += 0.3;
  }

  if (criterion.includes("Reign of Terror") && lowerOutput.includes("reign of terror")) {
    matchScore += 0.3;
  }

  return Math.min(1.0, Math.max(0.0, matchScore));
}
