"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryLegalHoldRepository = exports.LegalHoldOrchestrator = void 0;
// @ts-nocheck
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const audit_js_1 = require("../../utils/audit.js");
function cloneDeep(value) {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (Array.isArray(value)) {
        return value.map((item) => cloneDeep(item));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [key, nestedValue]) => {
            acc[key] = cloneDeep(nestedValue);
            return acc;
        }, {});
    }
    return value;
}
function now() {
    return new Date();
}
class LegalHoldOrchestrator {
    repository;
    connectors = new Map();
    notificationDispatcher;
    chainOfCustody;
    lifecyclePolicies;
    auditWriter;
    constructor(options) {
        if (!options.repository) {
            throw new Error('LegalHoldOrchestrator requires a repository');
        }
        if (!options.connectors?.length) {
            throw new Error('LegalHoldOrchestrator requires at least one preservation connector');
        }
        this.repository = options.repository;
        options.connectors.forEach((connector) => {
            this.connectors.set(connector.id, connector);
        });
        this.notificationDispatcher = options.notificationDispatcher;
        this.chainOfCustody = options.chainOfCustody;
        this.lifecyclePolicies = options.lifecyclePolicies ?? [];
        this.auditWriter =
            options.auditWriter ?? this.defaultAuditWriter.bind(this);
    }
    async automatePreservation(input, options = {}) {
        const hold = await this.initiateHold(input);
        const verifications = await this.verifyPreservation(hold.holdId);
        let exports;
        if (input.eDiscovery?.enabled && !options.skipExports) {
            exports = await this.prepareEDiscoveryExport(hold.holdId, {
                exportFormat: input.eDiscovery.exportFormats?.[0],
                matterId: input.eDiscovery.matterId,
                searchTerms: input.scope.searchTerms,
            });
        }
        let tamperSeal;
        if (!options.skipSeal) {
            tamperSeal = await this.sealPreservationPackage(hold.holdId, input.issuedBy.id, input.issuedBy.role);
        }
        const updatedHold = await this.ensureHold(hold.holdId);
        return { hold: updatedHold, verifications, tamperSeal, exports };
    }
    async initiateHold(input) {
        const holdId = `hold_${(0, crypto_1.randomUUID)()}`;
        const createdAt = now();
        const normalizedCustodians = input.custodians.map((custodian) => ({
            ...custodian,
            status: custodian.status ?? 'pending_notification',
            notifiedAt: custodian.notifiedAt ?? null,
            acknowledgedAt: custodian.acknowledgedAt ?? null,
            releasedAt: custodian.releasedAt ?? null,
        }));
        const lifecyclePolicies = this.resolveLifecyclePolicies(input.scope, input.lifecyclePolicyOverrides);
        const holdRecord = {
            holdId,
            caseId: input.caseId,
            holdName: input.holdName,
            status: 'DRAFT',
            reason: input.reason,
            issuedBy: input.issuedBy,
            scope: cloneDeep(input.scope),
            custodians: normalizedCustodians,
            connectors: [],
            lifecyclePolicies,
            compliance: [],
            notifications: [],
            createdAt,
            updatedAt: createdAt,
            eDiscovery: input.eDiscovery
                ? {
                    enabled: input.eDiscovery.enabled,
                    matterId: input.eDiscovery.matterId,
                    exportFormats: input.eDiscovery.exportFormats,
                    latestCollections: [],
                }
                : undefined,
            metadata: cloneDeep(input.additionalMetadata ?? {}),
        };
        await this.repository.create(holdRecord);
        await this.appendAudit({
            holdId,
            caseId: input.caseId,
            actorId: input.issuedBy.id,
            actorRole: input.issuedBy.role,
            action: 'LEGAL_HOLD_INITIATED',
            details: {
                holdName: input.holdName,
                connectors: input.scope.connectors,
                custodians: normalizedCustodians.map((c) => c.id),
                lifecyclePolicies: lifecyclePolicies.map((policy) => policy.policyId),
            },
            createdAt,
        });
        if (this.chainOfCustody) {
            try {
                await this.chainOfCustody.appendEvent({
                    caseId: input.caseId,
                    actorId: input.issuedBy.id,
                    action: 'LEGAL_HOLD_INITIATED',
                    payload: {
                        holdId,
                        holdName: input.holdName,
                        custodians: normalizedCustodians.map((c) => c.id),
                    },
                });
            }
            catch (error) {
                logger_js_1.default.error({ err: error }, 'Failed to append chain of custody event for legal hold');
            }
        }
        await this.notifyCustodians(holdRecord, input.notificationTemplateId);
        const connectorResults = [];
        let holdStatus = 'ACTIVE';
        for (const connectorId of input.scope.connectors) {
            const connector = this.connectors.get(connectorId);
            if (!connector) {
                logger_js_1.default.warn({ connectorId }, 'Connector not registered for legal hold scope');
                holdStatus = 'FAILED';
                continue;
            }
            const holdInput = {
                holdId,
                caseId: input.caseId,
                holdName: input.holdName,
                custodians: normalizedCustodians,
                scope: input.scope,
                issuedBy: input.issuedBy,
                metadata: input.additionalMetadata,
            };
            try {
                const result = await connector.applyHold(holdInput);
                connectorResults.push(result);
                await this.repository.recordConnectorAction(holdId, result);
                await this.recordComplianceCheckpoint(holdId, {
                    checkId: `connector:${connectorId}:apply`,
                    description: `Preservation hold applied via ${connector.displayName}`,
                    status: result.status === 'applied' ? 'pass' : 'warning',
                    details: result.error
                        ? `Hold applied with warnings: ${result.error}`
                        : `Reference ${result.referenceId}`,
                    timestamp: now(),
                });
                if (connector.supportsVerification && result.status === 'applied') {
                    const verification = await connector.verifyHold(holdId, input.caseId, input.scope);
                    await this.repository.recordVerification(holdId, verification);
                    await this.recordComplianceCheckpoint(holdId, {
                        checkId: `connector:${connectorId}:verify`,
                        description: `Preservation verification for ${connector.displayName}`,
                        status: verification.verified ? 'pass' : 'fail',
                        details: verification.details,
                        timestamp: verification.checkedAt,
                    });
                    if (!verification.verified) {
                        holdStatus = 'FAILED';
                    }
                }
                if (result.status === 'failed') {
                    holdStatus = 'FAILED';
                }
            }
            catch (error) {
                logger_js_1.default.error({ err: error, connectorId, holdId }, 'Connector failed to apply legal hold');
                connectorResults.push({
                    connectorId,
                    referenceId: 'n/a',
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                await this.repository.recordConnectorAction(holdId, {
                    connectorId,
                    referenceId: 'n/a',
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                await this.recordComplianceCheckpoint(holdId, {
                    checkId: `connector:${connectorId}:apply`,
                    description: `Preservation hold failed via ${connectorId}`,
                    status: 'fail',
                    details: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: now(),
                });
                holdStatus = 'FAILED';
            }
        }
        holdRecord.connectors = connectorResults;
        holdRecord.status = holdStatus;
        holdRecord.updatedAt = now();
        await this.repository.update(holdId, {
            connectors: connectorResults,
            custodians: normalizedCustodians,
            status: holdStatus,
            updatedAt: holdRecord.updatedAt,
        });
        await this.appendAudit({
            holdId,
            caseId: input.caseId,
            actorId: input.issuedBy.id,
            actorRole: input.issuedBy.role,
            action: 'LEGAL_HOLD_PRESERVATION_COMPLETE',
            details: {
                status: holdStatus,
                connectors: connectorResults,
            },
            createdAt: holdRecord.updatedAt,
        });
        return (await this.repository.getById(holdId)) ?? holdRecord;
    }
    async verifyPreservation(holdId) {
        const hold = await this.ensureHold(holdId);
        const verifications = [];
        for (const connectorResult of hold.connectors) {
            const connector = this.connectors.get(connectorResult.connectorId);
            if (!connector?.supportsVerification) {
                continue;
            }
            try {
                const verification = await connector.verifyHold(holdId, hold.caseId, hold.scope);
                verifications.push(verification);
                await this.repository.recordVerification(holdId, verification);
                await this.recordComplianceCheckpoint(holdId, {
                    checkId: `connector:${connector.id}:verify:manual`,
                    description: `Manual preservation verification for ${connector.displayName}`,
                    status: verification.verified ? 'pass' : 'fail',
                    details: verification.details,
                    timestamp: verification.checkedAt,
                });
            }
            catch (error) {
                logger_js_1.default.error({ err: error, connectorId: connectorResult.connectorId, holdId }, 'Failed to verify preservation hold');
                verifications.push({
                    connectorId: connectorResult.connectorId,
                    referenceId: connectorResult.referenceId,
                    verified: false,
                    details: error instanceof Error ? error.message : 'Unknown error',
                    checkedAt: now(),
                });
                await this.repository.recordVerification(holdId, verifications.at(-1));
                await this.recordComplianceCheckpoint(holdId, {
                    checkId: `connector:${connectorResult.connectorId}:verify:error`,
                    description: 'Preservation verification error',
                    status: 'fail',
                    details: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: now(),
                });
            }
        }
        await this.appendAudit({
            holdId,
            caseId: hold.caseId,
            actorId: 'system',
            actorRole: 'automation',
            action: 'LEGAL_HOLD_VERIFICATION_RUN',
            details: { verifications },
            createdAt: now(),
        });
        return verifications;
    }
    async recordCustodianAcknowledgement(holdId, custodianId, actor) {
        const hold = await this.ensureHold(holdId);
        const custodian = hold.custodians.find((c) => c.id === custodianId);
        if (!custodian) {
            throw new Error(`Custodian ${custodianId} not found for hold ${holdId}`);
        }
        const acknowledgementAt = now();
        await this.repository.recordCustodianStatus(holdId, custodianId, 'acknowledged', {
            acknowledgedAt: acknowledgementAt,
            status: 'acknowledged',
        });
        await this.appendAudit({
            holdId,
            caseId: hold.caseId,
            actorId: actor.id,
            actorRole: actor.role,
            action: 'LEGAL_HOLD_CUSTODIAN_ACKNOWLEDGED',
            details: { custodianId },
            createdAt: acknowledgementAt,
        });
    }
    async prepareEDiscoveryExport(holdId, request) {
        const hold = await this.ensureHold(holdId);
        if (!hold.eDiscovery?.enabled) {
            throw new Error('eDiscovery exports are not enabled for this legal hold');
        }
        const exportRequests = [];
        for (const connectorResult of hold.connectors) {
            const connector = this.connectors.get(connectorResult.connectorId);
            if (!connector?.supportsExport || !connector.collectPreservedData) {
                continue;
            }
            try {
                const collection = await connector.collectPreservedData({
                    ...request,
                    holdId,
                    caseId: hold.caseId,
                    matterId: request.matterId ?? hold.eDiscovery?.matterId,
                });
                exportRequests.push(collection);
            }
            catch (error) {
                logger_js_1.default.error({ err: error, connectorId: connectorResult.connectorId, holdId }, 'Failed to collect e-discovery export');
                exportRequests.push({
                    connectorId: connectorResult.connectorId,
                    exportPath: 'n/a',
                    format: request.exportFormat ??
                        hold.eDiscovery?.exportFormats?.[0] ??
                        'zip',
                    itemCount: 0,
                    generatedAt: now(),
                });
            }
        }
        await this.appendAudit({
            holdId,
            caseId: hold.caseId,
            actorId: 'system',
            actorRole: 'automation',
            action: 'LEGAL_HOLD_EDISCOVERY_EXPORT',
            details: { exports: exportRequests },
            createdAt: now(),
        });
        if (hold.eDiscovery) {
            hold.eDiscovery.latestCollections = exportRequests;
            await this.repository.update(holdId, {
                eDiscovery: hold.eDiscovery,
                updatedAt: now(),
            });
        }
        return exportRequests;
    }
    async runComplianceMonitoring(holdId) {
        const hold = await this.ensureHold(holdId);
        const checkpoints = [];
        const timestamp = now();
        // Custodian acknowledgement check
        const unacknowledged = hold.custodians.filter((c) => c.status !== 'acknowledged');
        checkpoints.push({
            checkId: 'custodian_acknowledgement',
            description: 'All custodians acknowledged legal hold',
            status: unacknowledged.length === 0 ? 'pass' : 'warning',
            details: unacknowledged.length === 0
                ? 'All custodians acknowledged'
                : `Pending custodians: ${unacknowledged.map((c) => c.id).join(', ')}`,
            timestamp,
        });
        // Connector preservation status check
        const failedConnectors = hold.connectors.filter((c) => c.status === 'failed');
        checkpoints.push({
            checkId: 'connector_preservation',
            description: 'All connectors successfully preserved data',
            status: failedConnectors.length === 0 ? 'pass' : 'fail',
            details: failedConnectors.length === 0
                ? 'All connectors succeeded'
                : `Failures: ${failedConnectors.map((c) => c.connectorId).join(', ')}`,
            timestamp,
        });
        // Lifecycle policy suspension check
        const unsuspendedPolicies = hold.lifecyclePolicies.filter((policy) => !policy.suspensionApplied);
        checkpoints.push({
            checkId: 'lifecycle_policy_suspension',
            description: 'Lifecycle policies suspended for legal hold duration',
            status: unsuspendedPolicies.length === 0 ? 'pass' : 'warning',
            details: unsuspendedPolicies.length === 0
                ? 'All linked policies suspended'
                : `Pending policies: ${unsuspendedPolicies.map((p) => p.policyId).join(', ')}`,
            timestamp,
        });
        for (const checkpoint of checkpoints) {
            await this.recordComplianceCheckpoint(holdId, checkpoint);
        }
        await this.appendAudit({
            holdId,
            caseId: hold.caseId,
            actorId: 'system',
            actorRole: 'automation',
            action: 'LEGAL_HOLD_COMPLIANCE_MONITORING',
            details: { checkpoints },
            createdAt: timestamp,
        });
        return checkpoints;
    }
    async releaseHold(holdId, actor, reason) {
        const hold = await this.ensureHold(holdId);
        for (const connectorResult of hold.connectors) {
            const connector = this.connectors.get(connectorResult.connectorId);
            if (!connector?.releaseHold) {
                continue;
            }
            try {
                await connector.releaseHold(holdId, hold.caseId);
            }
            catch (error) {
                logger_js_1.default.error({ err: error, connectorId: connectorResult.connectorId, holdId }, 'Failed to release legal hold from connector');
            }
        }
        for (const custodian of hold.custodians) {
            await this.repository.recordCustodianStatus(holdId, custodian.id, 'released', {
                releasedAt: now(),
                status: 'released',
            });
        }
        await this.repository.update(holdId, {
            status: 'RELEASED',
            updatedAt: now(),
        });
        await this.appendAudit({
            holdId,
            caseId: hold.caseId,
            actorId: actor.id,
            actorRole: actor.role,
            action: 'LEGAL_HOLD_RELEASED',
            details: { reason },
            createdAt: now(),
        });
    }
    async generateAuditPackage(holdId) {
        const hold = await this.ensureHold(holdId);
        const auditTrail = await this.repository.listAudit(holdId);
        const custodyVerified = this.chainOfCustody
            ? await this.chainOfCustody.verify(hold.caseId)
            : false;
        return { hold, auditTrail, custodyVerified };
    }
    async sealPreservationPackage(holdId, actorId, actorRole) {
        const hold = await this.ensureHold(holdId);
        const payload = {
            holdId: hold.holdId,
            caseId: hold.caseId,
            custodians: hold.custodians.map((custodian) => ({
                id: custodian.id,
                status: custodian.status,
                acknowledgedAt: custodian.acknowledgedAt,
                notifiedAt: custodian.notifiedAt,
            })),
            connectors: hold.connectors,
            lifecyclePolicies: hold.lifecyclePolicies,
            eDiscovery: hold.eDiscovery?.latestCollections ?? [],
            compliance: hold.compliance,
            notifications: hold.notifications,
            metadata: hold.metadata,
            updatedAt: hold.updatedAt,
        };
        const sealHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
        const sealCreatedAt = now();
        const seal = {
            algorithm: 'sha256',
            hash: sealHash,
            signedBy: actorId,
            createdAt: sealCreatedAt,
        };
        const signingKeys = this.chainOfCustody?.getSigningKeys?.();
        if (signingKeys?.privateKey) {
            try {
                seal.signature = (0, crypto_1.sign)(null, Buffer.from(sealHash), signingKeys.privateKey).toString('base64');
                if (signingKeys.publicKey) {
                    const publicKeyPem = signingKeys.publicKey
                        .export({ type: 'spki', format: 'pem' })
                        .toString();
                    seal.publicKeyFingerprint = (0, crypto_1.createHash)('sha256')
                        .update(publicKeyPem)
                        .digest('hex');
                }
            }
            catch (error) {
                logger_js_1.default.error({ err: error, holdId }, 'Failed to sign tamper-proof seal');
            }
        }
        await this.repository.update(holdId, {
            tamperSeal: seal,
            updatedAt: sealCreatedAt,
        });
        await this.appendAudit({
            holdId,
            caseId: hold.caseId,
            actorId,
            actorRole,
            action: 'LEGAL_HOLD_SEALED',
            details: {
                hashAlgorithm: seal.algorithm,
                publicKeyFingerprint: seal.publicKeyFingerprint,
            },
            createdAt: sealCreatedAt,
        });
        if (this.chainOfCustody) {
            try {
                await this.chainOfCustody.appendEvent({
                    caseId: hold.caseId,
                    actorId,
                    action: 'LEGAL_HOLD_SEALED',
                    payload: {
                        holdId,
                        sealHash: seal.hash,
                        fingerprint: seal.publicKeyFingerprint,
                    },
                });
            }
            catch (error) {
                logger_js_1.default.error({ err: error, holdId }, 'Failed to append chain of custody seal event');
            }
        }
        return seal;
    }
    async notifyCustodians(hold, templateId) {
        if (!this.notificationDispatcher) {
            return;
        }
        try {
            const response = await this.notificationDispatcher.sendNotification({
                templateId,
                recipients: hold.custodians,
                channel: 'LEGAL_HOLD',
                data: {
                    holdId: hold.holdId,
                    holdName: hold.holdName,
                    caseId: hold.caseId,
                    reason: hold.reason,
                },
                priority: 'HIGH',
                metadata: { issuedBy: hold.issuedBy },
            });
            const notificationRecord = {
                notificationId: response.id,
                templateId,
                recipients: hold.custodians.map((c) => c.email),
                channel: 'LEGAL_HOLD',
                status: response.status,
                dispatchedAt: now(),
            };
            await this.repository.recordNotification(hold.holdId, notificationRecord);
            if (response.status === 'sent' || response.status === 'queued') {
                for (const custodian of hold.custodians) {
                    await this.repository.recordCustodianStatus(hold.holdId, custodian.id, 'notified', {
                        status: 'notified',
                        notifiedAt: now(),
                    });
                }
            }
        }
        catch (error) {
            logger_js_1.default.error({ err: error, holdId: hold.holdId }, 'Failed to send legal hold notifications');
            await this.appendAudit({
                holdId: hold.holdId,
                caseId: hold.caseId,
                actorId: 'system',
                actorRole: 'automation',
                action: 'LEGAL_HOLD_NOTIFICATION_FAILED',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
                createdAt: now(),
            });
        }
    }
    resolveLifecyclePolicies(scope, overrides) {
        const policies = new Map();
        for (const policy of this.lifecyclePolicies) {
            policies.set(policy.policyId, { ...policy });
        }
        if (overrides) {
            for (const override of overrides) {
                policies.set(override.policyId, { ...override });
            }
        }
        // Ensure suspension applied flag defaults to true for connectors in scope
        for (const policy of policies.values()) {
            if (policy.suspensionApplied === undefined ||
                policy.suspensionApplied === false) {
                policy.suspensionApplied = true;
                policy.notes = policy.notes
                    ? `${policy.notes}; Auto-suspended for legal hold`
                    : 'Auto-suspended for legal hold';
            }
        }
        // Add synthetic policy entries for connectors without explicit policy
        for (const connectorId of scope.connectors) {
            const syntheticPolicyId = `connector:${connectorId}`;
            if (!policies.has(syntheticPolicyId)) {
                policies.set(syntheticPolicyId, {
                    policyId: syntheticPolicyId,
                    policyName: `Connector ${connectorId} retention`,
                    retentionDays: scope.retentionOverrideDays ?? 0,
                    suspensionApplied: true,
                    notes: 'Auto-generated connector policy override',
                });
            }
        }
        return Array.from(policies.values());
    }
    async recordComplianceCheckpoint(holdId, checkpoint) {
        await this.repository.recordCompliance(holdId, checkpoint);
    }
    async appendAudit(entry) {
        await this.repository.appendAudit(entry);
        await this.auditWriter(entry);
    }
    async defaultAuditWriter(entry) {
        await (0, audit_js_1.writeAudit)({
            userId: entry.actorId,
            action: entry.action,
            resourceType: 'legal_hold',
            resourceId: entry.holdId,
            details: {
                ...entry.details,
                caseId: entry.caseId,
            },
            actorRole: entry.actorRole,
        });
    }
    async ensureHold(holdId) {
        const hold = await this.repository.getById(holdId);
        if (!hold) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        return hold;
    }
}
exports.LegalHoldOrchestrator = LegalHoldOrchestrator;
class InMemoryLegalHoldRepository {
    records = new Map();
    verifications = new Map();
    compliance = new Map();
    notifications = new Map();
    audit = new Map();
    async create(record) {
        this.records.set(record.holdId, cloneDeep(record));
        this.verifications.set(record.holdId, []);
        this.compliance.set(record.holdId, []);
        this.notifications.set(record.holdId, []);
        this.audit.set(record.holdId, []);
    }
    async update(holdId, update) {
        const existing = this.records.get(holdId);
        if (!existing) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        const updated = {
            ...existing,
            ...cloneDeep(update),
            updatedAt: update.updatedAt ?? now(),
        };
        this.records.set(holdId, updated);
    }
    async getById(holdId) {
        const record = this.records.get(holdId);
        return record ? cloneDeep(record) : undefined;
    }
    async recordCustodianStatus(holdId, custodianId, status, metadata) {
        const existing = this.records.get(holdId);
        if (!existing) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        existing.custodians = existing.custodians.map((custodian) => custodian.id === custodianId
            ? {
                ...custodian,
                status,
                ...cloneDeep(metadata),
            }
            : custodian);
        existing.updatedAt = now();
        this.records.set(holdId, existing);
    }
    async recordConnectorAction(holdId, result) {
        const existing = this.records.get(holdId);
        if (!existing) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        const connectors = existing.connectors.filter((connector) => connector.connectorId !== result.connectorId);
        connectors.push(cloneDeep(result));
        existing.connectors = connectors;
        existing.updatedAt = now();
        this.records.set(holdId, existing);
    }
    async recordVerification(holdId, verification) {
        const list = this.verifications.get(holdId);
        if (!list) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        list.push(cloneDeep(verification));
    }
    async recordCompliance(holdId, checkpoint) {
        const list = this.compliance.get(holdId);
        if (!list) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        list.push(cloneDeep(checkpoint));
        const existing = this.records.get(holdId);
        if (existing) {
            existing.compliance = [...list];
            existing.updatedAt = now();
            this.records.set(holdId, existing);
        }
    }
    async recordNotification(holdId, notification) {
        const list = this.notifications.get(holdId);
        if (!list) {
            throw new Error(`Legal hold ${holdId} not found`);
        }
        list.push(cloneDeep(notification));
        const existing = this.records.get(holdId);
        if (existing) {
            existing.notifications = [...list];
            existing.updatedAt = now();
            this.records.set(holdId, existing);
        }
    }
    async appendAudit(entry) {
        const list = this.audit.get(entry.holdId);
        if (!list) {
            throw new Error(`Legal hold ${entry.holdId} not found`);
        }
        list.push(cloneDeep(entry));
    }
    async listAudit(holdId) {
        const list = this.audit.get(holdId) ?? [];
        return cloneDeep(list);
    }
}
exports.InMemoryLegalHoldRepository = InMemoryLegalHoldRepository;
