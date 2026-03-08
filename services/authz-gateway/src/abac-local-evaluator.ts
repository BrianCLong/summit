import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AuthorizationDecision,
  AuthorizationInput,
  DecisionObligation,
} from './types';

interface BundleData {
  classification: { levels: Record<string, number> };
  residency: { default: string; allowed_global: string[] };
  step_up: {
    actions: string[];
    min_auth_strength: string;
    obligation: DecisionObligation;
  };
  actions: Record<string, { roles: string[] }>;
}

interface BundleManifest {
  policy_version: string;
  revision: string;
}

export interface BundleEvaluation {
  version: string;
  decision: AuthorizationDecision;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function canonicalize(input: AuthorizationInput): string {
  return JSON.stringify(input, Object.keys(input).sort());
}

export class AbacLocalEvaluator {
  private readonly manifest: BundleManifest;
  private readonly data: BundleData;

  constructor(bundleDir = path.resolve(__dirname, '..', 'policy', 'abac', 'v1')) {
    const resolved = fs.existsSync(bundleDir)
      ? bundleDir
      : path.resolve(process.cwd(), 'services', 'authz-gateway', 'policy', 'abac', 'v1');
    this.manifest = readJson<BundleManifest>(path.join(resolved, 'manifest.json'));
    this.data = readJson<BundleData>(path.join(resolved, 'data.json'));
  }

  evaluate(input: AuthorizationInput): BundleEvaluation {
    const decision = this.decide(input);
    const inputsHash = crypto
      .createHash('sha256')
      .update(canonicalize(input))
      .digest('hex');
    const decisionId = crypto.randomUUID();
    return {
      version: this.manifest.policy_version,
      decision: {
        ...decision,
        decisionId,
        policyVersion: this.manifest.policy_version,
        inputsHash,
      },
    };
  }

  private decide(input: AuthorizationInput): AuthorizationDecision {
    const subjectRegion = (input.subject.region || input.subject.residency || '').toLowerCase();
    const resourceResidency = (input.resource.residency || '').toLowerCase();
    const allowedGlobal = new Set(this.data.residency.allowed_global.map((r) => r.toLowerCase()));
    if (
      !subjectRegion ||
      (!allowedGlobal.has(resourceResidency) && subjectRegion !== resourceResidency)
    ) {
      return { allowed: false, reason: 'residency_mismatch', obligations: [] };
    }

    const requiredClearance = this.data.classification.levels[input.resource.classification];
    const haveClearance = this.data.classification.levels[input.subject.clearance];
    if (
      requiredClearance === undefined ||
      haveClearance === undefined ||
      haveClearance < requiredClearance
    ) {
      return { allowed: false, reason: 'insufficient_clearance', obligations: [] };
    }

    if (
      input.resource.owner &&
      input.subject.org &&
      input.resource.owner.toLowerCase() !== input.subject.org.toLowerCase()
    ) {
      return { allowed: false, reason: 'ownership_mismatch', obligations: [] };
    }

    const actionKey = (input.action || '').toLowerCase();
    const actionRoles = this.data.actions[actionKey]?.roles || [];
    const normalizedRoles = new Set(
      [...(input.subject.roles || []), input.subject.role]
        .filter((r): r is string => !!r)
        .map((role) => role.toLowerCase()),
    );
    const hasRole = actionRoles.some((role) => normalizedRoles.has(role.toLowerCase()));
    if (!hasRole) {
      return { allowed: false, reason: 'role_mismatch', obligations: [] };
    }

    const needsStepUp = this.data.step_up.actions
      .map((action) => action.toLowerCase())
      .includes(actionKey);
    const strengthOrder = { loa1: 1, loa2: 2, loa3: 3 } as const;
    const current = strengthOrder[(input.subject.auth_strength || '').toLowerCase() as keyof typeof strengthOrder];
    const required = strengthOrder[this.data.step_up.min_auth_strength.toLowerCase() as keyof typeof strengthOrder];
    if (needsStepUp && current !== undefined && required !== undefined && current < required) {
      return {
        allowed: false,
        reason: 'step_up_required',
        obligations: [this.data.step_up.obligation],
      };
    }

    return { allowed: true, reason: 'allow', obligations: [] };
  }
}
