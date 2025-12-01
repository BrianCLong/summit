// server/src/necromancer/necromancer.types.ts

/**
 * The input parameters required to generate a synthetic identity.
 */
export interface BehavioralCloneParameters {
  targetId: string; // The entity ID of the high-value target who has died
  targetName: string;
  // A list of URIs pointing to the target's complete digital history
  // (e.g., social media archives, email backups, messaging logs).
  digitalFootprintUris: string[];
}

/**
 * Represents a synthetic, autonomous version of a deceased target,
 * which continues to operate their digital accounts.
 */
export interface SyntheticIdentity {
  syntheticId: string;
  sourceTargetId: string;
  sourceTargetName: string;
  status: 'active' | 'passive_monitoring' | 'degraded' | 'terminated';
  activationDate: Date;

  // A score from 0.0 to 1.0 indicating how accurately the synthetic identity
  // is mimicking the original target's behavior.
  behavioralFidelity: number;

  // The digital platforms this identity is actively controlling.
  controlledPlatforms: string[]; // e.g., ["Twitter", "Gmail", "LinkedIn"]
}

/**
 * Represents a log of a specific action taken by a synthetic identity.
 */
export interface SyntheticActivityLog {
  logId: string;
  syntheticId: string;
  platform: string;
  activityType: 'post' | 'message' | 'email' | 'comment' | 'reaction';
  content: string;
  timestamp: Date;
}
