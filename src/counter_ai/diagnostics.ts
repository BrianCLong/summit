import { globalRiskEmitter, RiskObservation } from './hooks.js';
import { COUNTER_AI_RISKS } from './risk_register.js';

export function getCounterAiDiagnostics() {
  return {
    risks: COUNTER_AI_RISKS.map(r => ({ id: r.risk_id, name: r.name })),
    recent_observations: globalRiskEmitter.getRecentObservations(10)
  };
}
