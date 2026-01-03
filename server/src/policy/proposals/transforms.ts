import { ChangeType } from './schema.js';
import { TenantPolicyBundle } from '../tenantBundle.js';

export interface TransformResult {
  patch: any[]; // JSON Patch format or similar
  rollback: any[];
  safetyClaims: string[];
  riskScore: number;
  riskFactors: string[];
  expectedImpact: {
    stricter: string[];
    breakageRisk: string[];
  };
}

export type TransformFunction = (
  bundle: TenantPolicyBundle,
  args: Record<string, any>
) => TransformResult;

const createOverlayPatch = (description: string, patches: any[]): TransformResult => {
    const overlayId = `prop-${Math.floor(Date.now() / 1000)}`;
    const overlay = {
        id: overlayId,
        description,
        precedence: 100, // Standard priority
        selectors: {},
        patches: patches
    };

    return {
        patch: [{
            op: 'append',
            path: '/overlays',
            value: overlay
        }],
        rollback: [], // Engine handles file reversion
        safetyClaims: [],
        riskScore: 0,
        riskFactors: [],
        expectedImpact: { stricter: [], breakageRisk: [] }
    };
};

export const Transforms: Record<ChangeType, TransformFunction> = {
  ENFORCE_GUARDRAIL_PURPOSE: (bundle, _args) => {
      if (bundle.baseProfile.guardrails.requirePurpose) {
        throw new Error('Transform irrelevant: requirePurpose is already true');
      }
      const res = createOverlayPatch('Proposal: Enforce Purpose', [{ op: 'set', path: 'guardrails.requirePurpose', value: true }]);
      return {
          ...res,
          safetyClaims: ['Strictly narrows access by requiring purpose'],
          riskScore: 3,
          riskFactors: ['Missing purpose headers blocked'],
          expectedImpact: { stricter: ['Require purpose'], breakageRisk: ['Legacy clients'] }
      };
  },
  ENFORCE_GUARDRAIL_DENY: (bundle, _args) => {
      const res = createOverlayPatch('Enforce Default Deny', [{ op: 'set', path: 'guardrails.defaultDeny', value: true }]);
       return {
          ...res,
          safetyClaims: ['Monotonic: default behavior deny'],
          riskScore: 8,
          riskFactors: [],
          expectedImpact: { stricter: ['Default deny'], breakageRisk: ['Implicit allows'] }
      };
  },
  RESTRICT_CROSS_TENANT: (bundle, _args) => {
       const res = createOverlayPatch('Deny Cross Tenant', [{ op: 'set', path: 'crossTenant.mode', value: 'deny' }]);
       return {
          ...res,
          safetyClaims: ['Monotonic: disables cross-tenant'],
          riskScore: 5,
          riskFactors: [],
          expectedImpact: { stricter: ['Block cross-tenant'], breakageRisk: ['Collab flows'] }
      };
  },
  ADD_DENY_RULE: (bundle, args) => {
      const { ruleId, actions } = args;
      const newRule = {
        id: ruleId,
        effect: 'deny',
        priority: 1000,
        conditions: { actions }
      };
      // Note: "append" in overlay patch for arrays
      const res = createOverlayPatch(`Deny Rule ${ruleId}`, [{ op: 'append', path: 'rules', value: newRule }]);
      return {
          ...res,
          safetyClaims: ['Monotonic: adds deny rule'],
          riskScore: 2,
          riskFactors: [],
          expectedImpact: { stricter: [`Deny ${actions}`], breakageRisk: ['Matching traffic'] }
      };
  }
};
