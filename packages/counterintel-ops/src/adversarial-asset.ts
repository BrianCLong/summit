import { z } from 'zod';

/**
 * EngagementState defines the current defensive posture and relationship
 * with an adversarial asset.
 */
export enum EngagementState {
  /** Initial discovery, adversarial nature not yet assessed. */
  UNKNOWN = 'UNKNOWN',
  /** Preliminary indicators suggest adversarial intent. */
  SUSPECTED = 'SUSPECTED',
  /** Attributed as an adversarial asset with high confidence. */
  CONFIRMED_ADVERSARIAL = 'CONFIRMED_ADVERSARIAL',
  /** Active surveillance enabled for pattern analysis. */
  MONITORED = 'MONITORED',
  /** Asset has been defensively co-opted or redirected to serve as a sensor. */
  TURNED_SENSOR = 'TURNED_SENSOR',
  /** Asset identity/capability has been exposed and neutralized. */
  BURNED = 'BURNED',
}

/**
 * InteractionEventCategory classifies the type of activity observed.
 */
export const InteractionEventCategory = z.enum([
  'NARRATIVE_DROP',
  'AMPLIFICATION_SPIKE',
  'PROBING_ACTIVITY',
  'BEHAVIORAL_ANOMALY',
  'COORDINATED_ACTION',
  'SENSOR_TELEMETRY',
]);

/**
 * InteractionEvent records a specific occurrence associated with an asset.
 */
export const interactionEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  category: InteractionEventCategory,
  description: z.string(),
  contentIds: z.array(z.string()).default([]),
  narrativeIds: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type InteractionEvent = z.infer<typeof interactionEventSchema>;

/**
 * AdversarialAsset represents a tracked entity with suspected or confirmed
 * adversarial intent within the narrative intelligence landscape.
 */
export const adversarialAssetSchema = z.object({
  id: z.string().uuid(),
  /** Primary identifier (e.g., account handle, source ID). */
  handle: z.string(),
  /** Original source platform or system identifier. */
  sourceId: z.string(),
  /** Associated campaign identifier, if attributed. */
  campaignId: z.string().optional(),
  /** Asset classification (e.g., bot, influencer, outlet). */
  type: z.enum(['ACCOUNT', 'OUTLET', 'CAMPAIGN_CLUSTER', 'AUTOMATED_BOT', 'HUMAN_INFLUENCER']),

  /** Current defensive engagement posture. */
  engagementState: z.nativeEnum(EngagementState).default(EngagementState.UNKNOWN),

  /** Metadata placeholders. */
  labels: z.array(z.string()).default([]),
  origin: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0),

  /** Activity history. */
  interactions: z.array(interactionEventSchema).default([]),

  /** Governance & Audit. */
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type AdversarialAsset = z.infer<typeof adversarialAssetSchema>;

/**
 * State Transition Guardrails
 */
const VALID_TRANSITIONS: Record<EngagementState, EngagementState[]> = {
  [EngagementState.UNKNOWN]: [EngagementState.SUSPECTED, EngagementState.BURNED],
  [EngagementState.SUSPECTED]: [EngagementState.CONFIRMED_ADVERSARIAL, EngagementState.UNKNOWN, EngagementState.BURNED],
  [EngagementState.CONFIRMED_ADVERSARIAL]: [EngagementState.MONITORED, EngagementState.BURNED],
  [EngagementState.MONITORED]: [EngagementState.TURNED_SENSOR, EngagementState.BURNED, EngagementState.CONFIRMED_ADVERSARIAL],
  [EngagementState.TURNED_SENSOR]: [EngagementState.BURNED, EngagementState.MONITORED],
  [EngagementState.BURNED]: [], // Terminal state
};

/**
 * Validates whether a state transition is permitted.
 */
export function isValidTransition(from: EngagementState, to: EngagementState): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
