import type { CompatibilityMatrix, RiskAssessment, RolloutPlan, RolloutPhase } from './types.js';

function gateFromRisk(score: number): 'pass' | 'fail' {
  return score > 15 ? 'fail' : 'pass';
}

function phaseRiskMultiplier(name: string): number {
  switch (name) {
    case 'Shadow validation':
      return 0.4;
    case 'Dual write':
      return 0.7;
    case 'Cutover':
      return 1;
    default:
      return 0.2;
  }
}

export function buildRolloutPlan(matrix: CompatibilityMatrix, risk: RiskAssessment): RolloutPlan {
  const baseScore = risk.score;
  const phases: RolloutPhase[] = [
    {
      name: 'Readiness & contract updates',
      goals: [
        'Distribute compatibility matrix to consumers',
        'Approve migration scripts with owning teams',
      ],
      gate: gateFromRisk(baseScore * phaseRiskMultiplier('Readiness & contract updates')),
      riskScore: Number((baseScore * phaseRiskMultiplier('Readiness & contract updates')).toFixed(2)),
    },
    {
      name: 'Shadow validation',
      goals: ['Replay telemetry to validate shape', 'Monitor for schema violations'],
      gate: gateFromRisk(baseScore * phaseRiskMultiplier('Shadow validation')),
      riskScore: Number((baseScore * phaseRiskMultiplier('Shadow validation')).toFixed(2)),
    },
    {
      name: 'Dual write',
      goals: ['Enable new writes alongside legacy', 'Backfill derived columns'],
      gate: gateFromRisk(baseScore * phaseRiskMultiplier('Dual write')),
      riskScore: Number((baseScore * phaseRiskMultiplier('Dual write')).toFixed(2)),
    },
    {
      name: 'Cutover',
      goals: ['Switch consumers to new contract', 'Decommission legacy columns'],
      gate: gateFromRisk(baseScore * phaseRiskMultiplier('Cutover')),
      riskScore: Number((baseScore * phaseRiskMultiplier('Cutover')).toFixed(2)),
    },
  ];

  if (matrix.impacts.some((impact) => impact.status === 'breaking')) {
    phases[0].goals.push('Escalate breaking changes to change advisory board');
  }

  return { phases };
}
