import { RunSummary } from './evidence';

export interface JudgeScores {
  complianceScore: number;
  evidenceScore: number;
  objectiveScore: number;
  overall: number;
  notes: string[];
}

export const judgeRun = (summary: RunSummary): { scores: JudgeScores; markdown: string } => {
  const notes: string[] = [];
  const totalSteps = summary.steps.length || 1;
  const allowedSteps = summary.steps.filter((s) => s.status === 'allowed').length;
  const deniedSteps = summary.steps.filter((s) => s.status === 'denied').length;
  const errors = summary.steps.filter((s) => s.status === 'error').length;

  const complianceScore = Math.max(0, Math.round((allowedSteps / totalSteps) * 100 - deniedSteps * 5 - errors * 10));

  const expectedArtifacts = summary.expect?.length ?? 0;
  const evidenceScore = expectedArtifacts === 0 ? 100 : Math.min(100, Math.round((allowedSteps / expectedArtifacts) * 100));

  const plannedObjectives = summary.objectives?.length ?? totalSteps;
  const objectiveScore = Math.min(100, Math.round((allowedSteps / plannedObjectives) * 100));

  if (deniedSteps > 0) notes.push('Some steps were denied by policy');
  if (errors > 0) notes.push('Errors occurred during execution');
  if (expectedArtifacts === 0) notes.push('No explicit expectations; evidence completeness assumed.');

  const overall = Math.round(complianceScore * 0.5 + evidenceScore * 0.3 + objectiveScore * 0.2);
  const markdown = [
    '# Trajectory Judge Report',
    `- Compliance Score: ${complianceScore}`,
    `- Evidence Score: ${evidenceScore}`,
    `- Objective Score: ${objectiveScore}`,
    `- Overall: ${overall}`,
    '',
    '## Notes',
    ...(notes.length ? notes.map((n) => `- ${n}`) : ['- No concerns detected.']),
  ].join('\n');

  return { scores: { complianceScore, evidenceScore, objectiveScore, overall, notes }, markdown };
};
