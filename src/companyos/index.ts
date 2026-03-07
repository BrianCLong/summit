export type {
  CompanyOSAction,
  Decision,
  Org,
  PolicyContext,
  PolicyRule,
  RiskTier,
} from './contracts/types.js';
export type { CompanyOSClient } from './contracts/client.js';
export { evaluatePolicyContext } from './policy/localEvaluator.js';

export function isCompanyOSEnforcementEnabled(): boolean {
  return process.env.COMPANYOS_ENFORCE === '1';
}
