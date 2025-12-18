import { RiskCategory } from './types';

export const HighRiskUseCaseRegistry: Record<RiskCategory, { color: string; allowed: boolean }> = {
  defensive_security: { color: 'green', allowed: true },
  analytics: { color: 'green', allowed: true },
  foresight: { color: 'yellow', allowed: true }, // Conditional
  influence_operations: { color: 'red', allowed: false },
  authoritarian_surveillance: { color: 'hard_red', allowed: false }
};

export function getRiskProfile(category: RiskCategory) {
  return HighRiskUseCaseRegistry[category];
}
