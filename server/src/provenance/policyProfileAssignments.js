"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayPolicyProfileAssignments = exports.recordPolicyProfileAssignment = void 0;
const ledger_js_1 = require("./ledger.js");
const recordPolicyProfileAssignment = async (params) => {
    const { tenantId, profileId, bundlePointer, manifest, actorId, actorType, source } = params;
    return ledger_js_1.provenanceLedger.appendEntry({
        tenantId,
        timestamp: new Date(),
        actionType: 'POLICY_PROFILE_ASSIGNED',
        resourceType: 'PolicyProfile',
        resourceId: profileId,
        actorId,
        actorType,
        payload: {
            mutationType: 'CREATE',
            entityId: profileId,
            entityType: 'PolicyProfile',
            profileId,
            bundlePointer,
            manifestVersion: manifest.version,
            manifestChecksum: manifest.checksum,
            source,
        },
        metadata: {
            bundleId: bundlePointer.id,
            bundleVersion: bundlePointer.version,
            bundleChecksum: bundlePointer.checksum,
        },
    });
};
exports.recordPolicyProfileAssignment = recordPolicyProfileAssignment;
const replayPolicyProfileAssignments = async (tenantId) => {
    const entries = await ledger_js_1.provenanceLedger.getEntries(tenantId, {
        actionType: 'POLICY_PROFILE_ASSIGNED',
        resourceType: 'PolicyProfile',
        order: 'ASC',
    });
    return entries.map((entry) => ({
        tenantId,
        profileId: entry.resourceId,
        bundlePointer: entry.payload.bundlePointer,
        manifestVersion: entry.payload.manifestVersion,
        manifestChecksum: entry.payload.manifestChecksum,
        assignedAt: entry.timestamp,
        actorId: entry.actorId,
        actorType: entry.actorType,
        source: entry.payload.source,
        ledgerEntryId: entry.id,
    }));
};
exports.replayPolicyProfileAssignments = replayPolicyProfileAssignments;
