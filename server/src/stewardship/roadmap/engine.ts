import { DriftSignal, DriftType, DriftSeverity } from '../drift/types.js';
import { Forecast, ForecastType } from '../forecast/types.js';
import { PressureCategory, RoadmapSignal } from './types.js';

export class RoadmapEngine {
  generateSignals(driftSignals: DriftSignal[], forecasts: Forecast[]): RoadmapSignal[] {
    const signals: RoadmapSignal[] = [];

    // Check for Cost Efficiency Pressure
    const costDrift = driftSignals.filter((d) => d.type === DriftType.COST && d.severity === DriftSeverity.HIGH);
    const costForecast = forecasts.find((f) => f.type === ForecastType.COST_GROWTH);

    if (costDrift.length > 0 || (costForecast && costForecast.predictedValue > 5500)) {
      signals.push({
        category: PressureCategory.COST_EFFICIENCY,
        score: 85,
        reason: 'Accelerating burn rate and projected budget overrun.',
        supportingEvidence: {
          driftSignals: costDrift,
          forecasts: costForecast ? [costForecast] : [],
        },
        suggestedInvestmentArea: 'FinOps & Resource Optimization',
      });
    }

    // Check for Governance Debt
    const agentDrift = driftSignals.filter(
      (d) => d.type === DriftType.AGENT && d.metric === 'policy_override_rate'
    );
    const govForecast = forecasts.find((f) => f.type === ForecastType.GOVERNANCE_PRESSURE);

    if (agentDrift.length > 0 || (govForecast && govForecast.predictedValue > 40)) {
      signals.push({
        category: PressureCategory.GOVERNANCE_DEBT,
        score: 70,
        reason: 'High frequency of policy overrides indicates friction.',
        supportingEvidence: {
          driftSignals: agentDrift,
          forecasts: govForecast ? [govForecast] : [],
        },
        suggestedInvestmentArea: 'Policy Refinement & Workflow flexibility',
      });
    }

    return signals.sort((a, b) => b.score - a.score);
  }
}
