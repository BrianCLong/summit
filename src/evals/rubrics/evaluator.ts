import crypto from 'crypto';
import { RubricComposite, EvalRun } from './types.js';

export class RubricEvaluator {
  static evaluate(composite: RubricComposite, output: string, model: string, evidenceId: string): EvalRun {
    const scores: { [key: string]: number } = {};
    let totalScore = 0;

    for (const criterion of composite.atomicCriteria) {
      // Split the criterion into words and check if any word exists in the output
      const words = criterion.criterion.toLowerCase().split(' ').filter(w => w.length > 3); // ignoring small words
      const match = words.some(w => output.toLowerCase().includes(w));
      const score = match ? 1 : 0;
      scores[criterion.id] = score * criterion.weight;
      totalScore += score * criterion.weight;
    }

    const maxScore = composite.atomicCriteria.reduce((sum, c) => sum + c.weight, 0);
    const normalizedScore = maxScore > 0 ? totalScore / maxScore : 0;

    // Create deterministic hash for run
    const runData = JSON.stringify({ evidenceId, model, output, scores, totalScore: normalizedScore });
    const timestampHash = crypto.createHash('sha256').update(runData).digest('hex');

    return {
      evidenceId,
      model,
      instruction: composite.instruction,
      output,
      rubricId: composite.id,
      scores,
      totalScore: normalizedScore,
      timestampHash
    };
  }
}
