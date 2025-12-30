
import { ALL_RULES, EvidenceRule } from './rules.js';

export interface EvidenceScore {
  score: number; // 0 to 1
  missing: string[]; // List of rule IDs that failed
  details: Record<string, boolean>; // Rule ID -> passed/failed
}

export function scoreEvidence(data: any, rules: EvidenceRule[] = ALL_RULES): EvidenceScore {
  let totalScore = 0;
  let totalWeight = 0;
  const missing: string[] = [];
  const details: Record<string, boolean> = {};

  for (const rule of rules) {
    const passed = rule.evaluate(data);
    details[rule.id] = passed;
    totalWeight += rule.weight;

    if (passed) {
      totalScore += rule.weight;
    } else {
      missing.push(rule.id);
    }
  }

  // Normalize score to 0-1 range if totalWeight > 0
  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  return {
    score: normalizedScore,
    missing,
    details,
  };
}
