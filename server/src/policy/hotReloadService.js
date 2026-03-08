"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyHotReloadService = exports.PolicyHotReloadService = void 0;
const emit_js_1 = require("../audit/emit.js");
const ReceiptService_js_1 = require("../services/ReceiptService.js");
const AuditService_js_1 = require("../services/security/AuditService.js");
const bundleStore_js_1 = require("./bundleStore.js");
const ramp_js_1 = require("./ramp.js");
function assertHotReloadEnabled() {
    const enabled = (process.env.POLICY_HOT_RELOAD || '').toLowerCase() === 'true';
    if (!enabled) {
        throw new Error('policy hot reload disabled');
    }
}
class PolicyHotReloadService {
    async recordRampChange(params) {
        const before = (0, ramp_js_1.normalizeRampConfig)(params.before);
        const after = (0, ramp_js_1.normalizeRampConfig)(params.after);
        if ((0, ramp_js_1.areRampConfigsEqual)(before, after))
            return;
        const receiptService = ReceiptService_js_1.ReceiptService.getInstance();
        const receipt = await receiptService.generateReceipt({
            action: params.action,
            actor: { id: 'system', tenantId: params.tenantId },
            resource: `policy_bundle:${params.versionId}`,
            input: {
                before,
                after,
                versionId: params.versionId,
                digest: params.digest,
                signatureVerified: params.signatureVerified,
            },
        });
        await AuditService_js_1.AuditService.log({
            userId: 'system',
            action: params.action,
            resourceType: 'policy_bundle',
            resourceId: params.versionId,
            details: {
                receiptId: receipt.id,
                digest: params.digest,
                signatureVerified: params.signatureVerified,
            },
            before: before,
            after: after,
        });
    }
    async reload(bundlePath, signaturePath) {
        assertHotReloadEnabled();
        const previous = bundleStore_js_1.policyBundleStore.getCurrent();
        const version = await (0, bundleStore_js_1.loadPolicyBundleFromDisk)(bundlePath, signaturePath);
        bundleStore_js_1.policyBundleStore.addVersion(version, true);
        await (0, emit_js_1.emitAuditEvent)({
            eventId: version.versionId,
            occurredAt: new Date().toISOString(),
            tenantId: version.bundle.tenantId,
            actor: { id: 'system', type: 'service' },
            action: { type: 'policy.reload', outcome: 'success' },
            target: { type: 'policy_bundle', id: version.versionId },
            metadata: {
                digest: version.digest,
                signatureVerified: version.signatureVerified,
                path: version.path,
            },
        }, { level: 'critical', serviceId: 'policy-hot-reload' });
        await this.recordRampChange({
            action: 'policy.ramp.updated',
            tenantId: version.bundle.tenantId,
            versionId: version.versionId,
            digest: version.digest,
            signatureVerified: version.signatureVerified,
            before: previous?.bundle?.baseProfile?.ramp,
            after: version.bundle.baseProfile?.ramp,
        });
        return version;
    }
    async rollback(versionId) {
        // Sprint 08: Automated rollback trigger check
        // In a real system, this would verify the rollback target is stable
        const previous = bundleStore_js_1.policyBundleStore.getCurrent();
        const version = bundleStore_js_1.policyBundleStore.rollback(versionId);
        await (0, emit_js_1.emitAuditEvent)({
            eventId: `${version.versionId}-rollback`,
            occurredAt: new Date().toISOString(),
            tenantId: version.bundle.tenantId,
            actor: { id: 'system', type: 'service' },
            action: { type: 'policy.rollback', outcome: 'success' },
            target: { type: 'policy_bundle', id: version.versionId },
            metadata: { digest: version.digest },
        }, { level: 'critical', serviceId: 'policy-hot-reload' });
        await this.recordRampChange({
            action: 'policy.ramp.rollback',
            tenantId: version.bundle.tenantId,
            versionId: version.versionId,
            digest: version.digest,
            signatureVerified: version.signatureVerified,
            before: previous?.bundle?.baseProfile?.ramp,
            after: version.bundle.baseProfile?.ramp,
        });
        return version;
    }
}
exports.PolicyHotReloadService = PolicyHotReloadService;
exports.policyHotReloadService = new PolicyHotReloadService();
