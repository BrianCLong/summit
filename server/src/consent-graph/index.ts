export {
  listConsentPolicyVersions,
  getConsentGraphSnapshot,
  diffConsentPolicies,
  analyzeConsentRevocationImpact,
} from './service.ts';

export type {
  ConsentGraphSnapshot,
  ConsentPolicyVersion,
  ConsentPolicyDiff,
  ConsentRevocationImpact,
  ConsentNode,
  ConsentEdge,
} from './types.ts';
