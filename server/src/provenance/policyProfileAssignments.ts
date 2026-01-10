import { provenanceLedger } from './ledger.js';
import type {
  PolicyBundlePointer,
  PolicyProfileManifest,
} from '../policies/profile-manifests.js';

export interface PolicyProfileAssignmentRecord {
  tenantId: string;
  profileId: string;
  bundlePointer: PolicyBundlePointer;
  manifestVersion: string;
  manifestChecksum: string;
  assignedAt: Date;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'job';
  source: string;
  ledgerEntryId: string;
}

export const recordPolicyProfileAssignment = async (params: {
  tenantId: string;
  profileId: string;
  bundlePointer: PolicyBundlePointer;
  manifest: PolicyProfileManifest;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'job';
  source: string;
}) => {
  const { tenantId, profileId, bundlePointer, manifest, actorId, actorType, source } = params;

  return provenanceLedger.appendEntry({
    tenantId,
    timestamp: new Date(),
    actionType: 'POLICY_PROFILE_ASSIGNED',
    resourceType: 'PolicyProfile',
    resourceId: profileId,
    actorId,
    actorType,
    payload: {
      mutationType: 'CREATE' as const,
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

export const replayPolicyProfileAssignments = async (
  tenantId: string,
): Promise<PolicyProfileAssignmentRecord[]> => {
  const entries = await provenanceLedger.getEntries(tenantId, {
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
