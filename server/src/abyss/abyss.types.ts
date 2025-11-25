// server/src/abyss/abyss.types.ts

/**
 * Represents the state of the 12-of-15 dead-man switch required
 * to awaken the mirrored system.
 */
export interface DeadManSwitch {
  // A list of anonymized identifiers for the 15 key holders.
  keyHolderIds: string[];

  // The number of keys required to trigger the awakening (e.g., 12).
  requiredKeyCount: number;

  // A list of the keys that have been submitted. In a real system,
  // these would be cryptographic signatures.
  submittedKeys: { keyHolderId: string; submissionTimestamp: Date; }[];

  // The current status of the switch.
  status: 'dormant' | 'partially_activated' | 'awakened';
}

/**
 * Represents the perfect synthetic mirror of the entire system,
 * uploaded to thousands of anonymous nodes.
 */
export interface SystemStateSnapshot {
  snapshotId: string;
  creationTimestamp: Date;

  // The number of anonymous nodes the mirror was distributed to.
  distributedNodeCount: number;

  // A cryptographic hash of the entire system state to ensure integrity upon awakening.
  integrityChecksum: string;
}

/**
 * Represents the overall state of the Abyss Final Protocol.
 */
export interface AbyssProtocolState {
  protocolId: string;
  // 'dormant': Normal operations.
  // 'armed': Ready to be triggered by a compromise event.
  // 'triggered': The self-destruct and mirroring process has begun.
  // 'complete': The original system is destroyed, and the mirror is awaiting the dead-man switch.
  status: 'dormant' | 'armed' | 'triggered' | 'complete';

  armedTimestamp?: Date;
  triggeredTimestamp?: Date;

  // The state of the dead-man switch for the mirrored system.
  deadManSwitch: DeadManSwitch;

  // Details of the system snapshot that was created and distributed.
  systemSnapshot?: SystemStateSnapshot;
}
