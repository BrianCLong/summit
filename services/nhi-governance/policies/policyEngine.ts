import { AlgorithmFamily, CryptoAsset, InventoryGraph, PolicyReport, PolicyViolation } from '../models.js';

const DEFAULT_MAX_TTL_DAYS = 90;
const LEGACY_ALGORITHMS: AlgorithmFamily[] = ['rsa-2048', 'sha1', 'aes-128'];

const buildViolation = (
  rule: string,
  subjectId: string,
  severity: PolicyViolation['severity'],
  message: string,
  remediation: string,
): PolicyViolation => ({
  id: `${rule}:${subjectId}`,
  rule,
  subjectId,
  severity,
  message,
  remediation,
});

const isExpired = (maybeDate?: string): boolean => {
  if (!maybeDate) return false;
  return new Date(maybeDate).getTime() < Date.now();
};

const isNearExpiry = (maybeDate?: string, withinDays = 30): boolean => {
  if (!maybeDate) return false;
  const threshold = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  return new Date(maybeDate).getTime() < threshold;
};

const evaluateCredentialPolicies = (graph: InventoryGraph, maxTtlDays = DEFAULT_MAX_TTL_DAYS): PolicyViolation[] => {
  const violations: PolicyViolation[] = [];

  for (const credential of graph.credentials) {
    if (credential.expiresAt) {
      const issued = credential.issuedAt ? new Date(credential.issuedAt).getTime() : undefined;
      const expires = new Date(credential.expiresAt).getTime();
      if (issued && expires - issued > maxTtlDays * 24 * 60 * 60 * 1000) {
        violations.push(
          buildViolation(
            'credential.max-ttl',
            credential.id,
            'high',
            `Credential ${credential.name} exceeds max TTL of ${maxTtlDays} days`,
            'Rotate credential to short-lived token or session',
          ),
        );
      }
      if (isExpired(credential.expiresAt)) {
        violations.push(
          buildViolation(
            'credential.expired',
            credential.id,
            'high',
            `Credential ${credential.name} is expired`,
            'Revoke and rotate immediately',
          ),
        );
      }
    }

    if (credential.secretSource) {
      violations.push(
        buildViolation(
          'credential.in-code-secret',
          credential.id,
          'high',
          `Secret material found in repository at ${credential.secretSource}`,
          'Move secret to vault and purge from history',
        ),
      );
    }
  }

  return violations;
};

const evaluatePermissionPolicies = (graph: InventoryGraph): PolicyViolation[] => {
  const violations: PolicyViolation[] = [];
  for (const nhi of graph.nhis) {
    for (const permission of nhi.permissions) {
      if (permission.role.includes('admin') || permission.resource === '*' || permission.resource.endsWith(':*')) {
        violations.push(
          buildViolation(
            'nhi.least-privilege',
            nhi.id,
            'medium',
            `NHI ${nhi.name} has wildcard/admin permission ${permission.role} on ${permission.resource}`,
            'Scope permission to exact resource and enforce JIT elevation',
          ),
        );
      }
    }
  }
  return violations;
};

const evaluateCryptoAssets = (graph: InventoryGraph): PolicyViolation[] => {
  const violations: PolicyViolation[] = [];

  const flagLegacy = (asset: CryptoAsset, algorithm: AlgorithmFamily) => {
    if (LEGACY_ALGORITHMS.includes(algorithm)) {
      violations.push(
        buildViolation(
          'crypto.legacy-algorithm',
          asset.id,
          'medium',
          `${asset.name} uses legacy algorithm ${algorithm}`,
          'Plan migration to ML-KEM/ML-DSA or stronger modern algorithm',
        ),
      );
    }
  };

  for (const asset of graph.cryptoAssets) {
    flagLegacy(asset, asset.algorithm);

    if (isExpired(asset.expiresAt)) {
      violations.push(
        buildViolation(
          'crypto.expired',
          asset.id,
          'high',
          `${asset.name} is expired`,
          'Rotate certificate or regenerate key material',
        ),
      );
    } else if (isNearExpiry(asset.expiresAt)) {
      violations.push(
        buildViolation(
          'crypto.near-expiry',
          asset.id,
          'medium',
          `${asset.name} is nearing expiry`,
          'Schedule renewal and validate deployment plan',
        ),
      );
    }

    if (!asset.pqcPlan && !['ml-kem', 'ml-dsa'].includes(asset.algorithm)) {
      violations.push(
        buildViolation(
          'crypto.pqc-missing',
          asset.id,
          'medium',
          `${asset.name} lacks PQC migration metadata`,
          'Document PQC migration path (ML-KEM/ML-DSA) and owner',
        ),
      );
    }
  }

  return violations;
};

export const evaluatePolicies = (graph: InventoryGraph, maxTtlDays = DEFAULT_MAX_TTL_DAYS): PolicyReport => {
  const violations = [
    ...evaluateCredentialPolicies(graph, maxTtlDays),
    ...evaluatePermissionPolicies(graph),
    ...evaluateCryptoAssets(graph),
  ];

  const summary: Record<string, number> = {};
  for (const violation of violations) {
    summary[violation.severity] = (summary[violation.severity] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    violations,
    summary,
  };
};
