"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyBundleStore = void 0;
exports.loadPolicyBundleFromDisk = loadPolicyBundleFromDisk;
const tenantBundle_js_1 = require("./tenantBundle.js");
const loader_js_1 = require("./loader.js");
function deriveVersionId(bundle, digest) {
    return (bundle.bundleId ||
        bundle.baseProfile?.version ||
        `${bundle.tenantId}-${bundle.baseProfile?.regoPackage || 'policy'}-${digest.slice(0, 12)}`);
}
async function loadPolicyBundleFromDisk(bundlePath, signaturePath) {
    const verification = await (0, loader_js_1.loadSignedPolicy)(bundlePath, signaturePath);
    const content = verification.buf.toString('utf8');
    const parsed = tenantBundle_js_1.tenantPolicyBundleSchema.parse(JSON.parse(content));
    const versionId = deriveVersionId(parsed, verification.digest);
    return {
        versionId,
        path: verification.path,
        digest: verification.digest,
        loadedAt: new Date(),
        signatureVerified: verification.signatureVerified,
        bundle: parsed,
    };
}
class PolicyBundleStore {
    versions = new Map();
    currentPolicyVersionId;
    reset() {
        this.versions.clear();
        this.currentPolicyVersionId = undefined;
    }
    addVersion(version, makeCurrent = true) {
        this.versions.set(version.versionId, version);
        if (makeCurrent)
            this.currentPolicyVersionId = version.versionId;
        return version;
    }
    get(versionId) {
        return this.versions.get(versionId);
    }
    getCurrent() {
        return this.currentPolicyVersionId ? this.versions.get(this.currentPolicyVersionId) : undefined;
    }
    resolveForTenant(tenantId, versionId) {
        if (versionId) {
            const byVersion = this.versions.get(versionId);
            if (byVersion && byVersion.bundle.tenantId === tenantId)
                return byVersion;
        }
        const current = this.getCurrent();
        if (current && current.bundle.tenantId === tenantId)
            return current;
        const candidates = Array.from(this.versions.values())
            .filter((version) => version.bundle.tenantId === tenantId)
            .sort((a, b) => a.loadedAt.getTime() - b.loadedAt.getTime());
        return candidates.at(-1);
    }
    list() {
        return Array.from(this.versions.values()).sort((a, b) => a.loadedAt.getTime() - b.loadedAt.getTime());
    }
    resolve(versionId) {
        const candidate = versionId && this.versions.get(versionId);
        if (candidate)
            return candidate;
        const current = this.getCurrent();
        if (!current) {
            throw new Error('no policy bundles loaded');
        }
        return current;
    }
    rollback(toVersion) {
        const target = this.versions.get(toVersion);
        if (!target) {
            throw new Error(`policy version ${toVersion} not found`);
        }
        this.currentPolicyVersionId = target.versionId;
        return target;
    }
}
exports.policyBundleStore = new PolicyBundleStore();
