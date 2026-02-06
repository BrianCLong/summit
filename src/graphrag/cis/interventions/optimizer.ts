import { CIEState } from '../../../agents/cis/game/equilibrium';

export interface Intervention {
  type: 'FACT_CHECK' | 'CONTENT_LABEL' | 'DEAMPLIFY';
  target_id: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class InterventionOptimizer {
  recommend(state: CIEState): Intervention[] {
    const bundles: Intervention[] = [];

    for (const [narrativeId, risk] of Object.entries(state.risk_distribution)) {
      if (risk > 0.8) {
        bundles.push({
          type: 'DEAMPLIFY',
          target_id: narrativeId,
          reason: `High cumulative risk score: ${risk.toFixed(2)}`,
          priority: 'HIGH'
        });
      } else if (risk > 0.5) {
        bundles.push({
          type: 'CONTENT_LABEL',
          target_id: narrativeId,
          reason: `Moderate risk score: ${risk.toFixed(2)}`,
          priority: 'MEDIUM'
        });
      }
    }

    return bundles;
  }
}
