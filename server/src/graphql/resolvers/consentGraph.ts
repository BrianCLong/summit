import {
  analyzeConsentRevocationImpact,
  diffConsentPolicies,
  getConsentGraphSnapshot,
  listConsentPolicyVersions,
} from '../../consent-graph/index.ts';

export const consentGraphResolvers = {
  Query: {
    consentPolicyVersions: () => listConsentPolicyVersions(),
    consentGraphAsOf: (_parent: unknown, args: { validTime: string; txTime: string }) =>
      getConsentGraphSnapshot(args.validTime, args.txTime),
    consentPolicyDiff: (
      _parent: unknown,
      args: { baseVersionId: string; compareVersionId: string },
    ) => diffConsentPolicies(args.baseVersionId, args.compareVersionId),
    consentRevocationImpact: (
      _parent: unknown,
      args: { purposeId: string; validTime: string; txTime: string },
    ) => analyzeConsentRevocationImpact(args.purposeId, args.validTime, args.txTime),
  },
};
