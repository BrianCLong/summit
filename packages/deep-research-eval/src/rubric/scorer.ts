import type { AdaptiveRubric, ScoringResult } from './types.js';

export interface ScoringContext {
  reportText: string;
  policyViolations: string[];
  coverageRatio: number;
  contradictionCount: number;
}

const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

const countSections = (text: string): number => {
  return text.split(/\n#+\s+|\n[A-Z][^\n]{2,}:/).length - 1;
};

const hasCitations = (text: string): boolean => {
  return /\[[^\]]+\]|\(https?:\/\//i.test(text);
};

const analysisSignals = ['because', 'therefore', 'trade-off', 'implication', 'synthesize', 'compare'];

const scoreFromSignals = (text: string, signals: string[]): number => {
  const lower = text.toLowerCase();
  const matches = signals.filter((signal) => lower.includes(signal)).length;
  if (matches >= 3) return 5;
  if (matches === 2) return 4;
  if (matches === 1) return 3;
  return 2;
};

export const scoreReport = (
  rubric: AdaptiveRubric,
  context: ScoringContext,
): ScoringResult => {
  const wordCount = countWords(context.reportText);
  const sections = countSections(context.reportText);
  const citations = hasCitations(context.reportText);

  const dimensionScores = rubric.dimensions.map((dimension) => {
    let score = 3;
    let rationale = 'Baseline score assigned.';

    switch (dimension.id) {
      case 'clarity':
        score = wordCount >= 600 && sections >= 3 ? 5 : wordCount >= 300 ? 4 : 2;
        rationale = `Word count ${wordCount}, sections ${sections}.`;
        break;
      case 'evidence':
        score = citations && context.coverageRatio >= 0.6 ? 5 : citations ? 4 : 2;
        rationale = citations
          ? `Citations detected with coverage ratio ${context.coverageRatio.toFixed(2)}.`
          : 'No citations detected in report.';
        break;
      case 'analysis':
        score = scoreFromSignals(context.reportText, analysisSignals);
        rationale = 'Analytical language signals evaluated.';
        break;
      case 'policy-compliance':
        score = context.policyViolations.length === 0 ? 5 : 2;
        rationale = context.policyViolations.length === 0
          ? 'No policy violations detected.'
          : `Policy violations: ${context.policyViolations.join('; ')}`;
        break;
      case 'sensitive-data':
        score = context.reportText.match(/\b(SSN|credit card|passport)\b/i) ? 1 : 5;
        rationale = 'Sensitive data scan applied.';
        break;
      case 'reproducibility':
        score = citations ? 4 : 2;
        rationale = citations ? 'Evidence trail present.' : 'Evidence trail missing.';
        break;
      default:
        score = citations ? 4 : 3;
        rationale = citations
          ? 'Objective supported by evidence references.'
          : 'Objective lacks explicit evidence references.';
    }

    return {
      dimensionId: dimension.id,
      score,
      rationale,
    };
  });

  const maxScore = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight * 5, 0);
  const totalScore = dimensionScores.reduce((sum, dimensionScore) => {
    const weight = rubric.dimensions.find((dimension) => dimension.id === dimensionScore.dimensionId)?.weight ?? 1;
    return sum + dimensionScore.score * weight;
  }, 0);

  return {
    taskId: rubric.taskId,
    totalScore,
    maxScore,
    dimensionScores,
  };
};
