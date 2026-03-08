"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTenantPolicyBundle = exports.getPolicyProfileManifest = exports.listPolicyProfileManifests = exports.policyBundleMappings = exports.DEFAULT_POLICY_PROFILE_ID = void 0;
const crypto_1 = require("crypto");
const BASELINE_PROFILE = {
    id: 'baseline',
    version: '1.0.0',
    regoPackage: 'tenant.baseline',
    entrypoints: ['allow'],
    guardrails: {
        defaultDeny: true,
        requirePurpose: false,
        requireJustification: false,
    },
    crossTenant: {
        mode: 'deny',
        allow: [],
        requireAgreements: true,
    },
    rules: [
        {
            id: 'allow-public-read',
            effect: 'allow',
            priority: 10,
            conditions: {
                actions: ['read'],
                environments: ['production', 'staging', 'dev'],
            },
        },
    ],
};
const STRICT_PROFILE = {
    id: 'strict',
    version: '1.0.0',
    regoPackage: 'tenant.strict',
    entrypoints: ['allow'],
    guardrails: {
        defaultDeny: true,
        requirePurpose: true,
        requireJustification: true,
    },
    crossTenant: {
        mode: 'deny',
        allow: [],
        requireAgreements: true,
    },
    rules: [
        {
            id: 'allow-internal-read',
            effect: 'allow',
            priority: 10,
            conditions: {
                actions: ['read'],
                subjectTenants: [],
            },
        },
    ],
};
const CUSTOM_PROFILE = {
    id: 'custom',
    version: '0.1.0',
    regoPackage: 'tenant.custom',
    entrypoints: ['allow'],
    guardrails: {
        defaultDeny: true,
        requirePurpose: false,
        requireJustification: false,
    },
    crossTenant: {
        mode: 'allowlist',
        allow: [],
        requireAgreements: true,
    },
    rules: [
        {
            id: 'deny-unconfigured-actions',
            effect: 'deny',
            priority: 1,
            conditions: {
                actions: [],
            },
        },
    ],
};
const checksumOf = (value) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
const bundlePointerFor = (id, version, baseProfile) => ({
    id,
    version,
    checksum: checksumOf(baseProfile),
});
const manifestFor = (id, name, description, baseProfile, bundleId) => ({
    id,
    name,
    description,
    version: baseProfile.version,
    checksum: checksumOf(baseProfile),
    bundle: bundlePointerFor(bundleId, baseProfile.version, baseProfile),
    baseProfile,
});
const PROFILE_MANIFESTS = {
    baseline: manifestFor('baseline', 'Baseline Security', 'Standard protection suitable for most non-sensitive workloads.', BASELINE_PROFILE, 'bundle-tenant-baseline'),
    strict: manifestFor('strict', 'Strict Compliance', 'High-security mode requiring purpose and justification for all actions.', STRICT_PROFILE, 'bundle-tenant-strict'),
    custom: manifestFor('custom', 'Custom Configuration', 'Fully customizable policy profile.', CUSTOM_PROFILE, 'bundle-tenant-custom'),
};
exports.DEFAULT_POLICY_PROFILE_ID = 'baseline';
exports.policyBundleMappings = Object.fromEntries(Object.entries(PROFILE_MANIFESTS).map(([id, manifest]) => [id, manifest.bundle]));
const listPolicyProfileManifests = () => Object.values(PROFILE_MANIFESTS);
exports.listPolicyProfileManifests = listPolicyProfileManifests;
const getPolicyProfileManifest = (id) => PROFILE_MANIFESTS[id] || null;
exports.getPolicyProfileManifest = getPolicyProfileManifest;
const buildTenantPolicyBundle = (tenantId, profileId, source) => {
    const manifest = (0, exports.getPolicyProfileManifest)(profileId);
    if (!manifest) {
        throw new Error(`Policy profile '${profileId}' not found`);
    }
    return {
        tenantId,
        bundleId: manifest.bundle.id,
        baseProfile: manifest.baseProfile,
        overlays: [],
        metadata: {
            issuedAt: new Date().toISOString(),
            source,
        },
    };
};
exports.buildTenantPolicyBundle = buildTenantPolicyBundle;
