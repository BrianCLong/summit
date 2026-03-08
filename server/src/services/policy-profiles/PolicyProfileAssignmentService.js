"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyProfileAssignmentService = exports.PolicyProfileAssignmentService = void 0;
const database_js_1 = require("../../config/database.js");
const profile_manifests_js_1 = require("../../policies/profile-manifests.js");
const policyProfileAssignments_js_1 = require("../../provenance/policyProfileAssignments.js");
const TenantService_js_1 = require("../TenantService.js");
const ReceiptService_js_1 = require("../ReceiptService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class PolicyProfileAssignmentService {
    static instance;
    _receiptService;
    constructor() {
        // Lazy
    }
    get receiptService() {
        if (!this._receiptService) {
            this._receiptService = ReceiptService_js_1.ReceiptService.getInstance();
        }
        return this._receiptService;
    }
    static getInstance() {
        if (!PolicyProfileAssignmentService.instance) {
            PolicyProfileAssignmentService.instance = new PolicyProfileAssignmentService();
        }
        return PolicyProfileAssignmentService.instance;
    }
    async assignProfile(input) {
        const { tenantId, profileId, actorId, actorType, source } = input;
        const manifest = (0, profile_manifests_js_1.getPolicyProfileManifest)(profileId);
        if (!manifest) {
            throw new Error(`Policy profile '${profileId}' not found`);
        }
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant '${tenantId}' not found`);
        }
        const bundle = (0, profile_manifests_js_1.buildTenantPolicyBundle)(tenantId, profileId, source);
        const bundlePointer = manifest.bundle;
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const newSettings = {
                ...(tenant.settings || {}),
                policy_profile: profileId,
                policy_profile_version: manifest.version,
                policy_bundle_pointer: bundlePointer,
                policy_bundle: bundle,
            };
            await client.query('UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2', [newSettings, tenantId]);
            await (0, policyProfileAssignments_js_1.recordPolicyProfileAssignment)({
                tenantId,
                profileId,
                bundlePointer,
                manifest,
                actorId,
                actorType,
                source,
            });
            const receipt = await this.receiptService.generateReceipt({
                action: 'POLICY_PROFILE_ASSIGNED',
                actor: { id: actorId, tenantId },
                resource: `policy-profile:${profileId}`,
                input: {
                    tenantId,
                    profileId,
                    bundlePointer,
                    manifestVersion: manifest.version,
                    manifestChecksum: manifest.checksum,
                },
            });
            await client.query('COMMIT');
            logger_js_1.default.info(`Assigned policy profile '${profileId}' to tenant ${tenantId}`);
            return {
                profileId,
                manifest,
                bundlePointer,
                bundle,
                receipt,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Failed to assign policy profile', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getActiveProfile(tenantId) {
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant '${tenantId}' not found`);
        }
        const settings = tenant.settings || {};
        const profileId = settings.policy_profile || profile_manifests_js_1.DEFAULT_POLICY_PROFILE_ID;
        const manifest = (0, profile_manifests_js_1.getPolicyProfileManifest)(profileId);
        if (!manifest) {
            throw new Error(`Policy profile '${profileId}' not found`);
        }
        const bundlePointer = settings.policy_bundle_pointer || manifest.bundle;
        const bundle = settings.policy_bundle ||
            (0, profile_manifests_js_1.buildTenantPolicyBundle)(tenantId, profileId, 'policy-profile:resolved');
        return {
            profileId,
            manifest,
            bundlePointer,
            bundle,
            source: settings.policy_profile ? 'tenant-settings' : 'default',
        };
    }
}
exports.PolicyProfileAssignmentService = PolicyProfileAssignmentService;
exports.policyProfileAssignmentService = PolicyProfileAssignmentService.getInstance();
