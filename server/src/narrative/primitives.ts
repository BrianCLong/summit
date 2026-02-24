
import { NarrativeEvent } from './types';

/**
 * NARRATIVE_OPS PRIMITIVES
 *
 * Canonical definitions for the Summit Narrative Intelligence & Information Operations platform.
 * These primitives map research concepts (Nature, Guardian 2026) to graph schema objects.
 */

// --- 1. Narrative Unit ---
// The atomic unit of influence.
export interface NarrativeUnit {
  id: string;
  semanticFrame: string; // The "framing" of the narrative (e.g., "Victimhood", "Aggression")
  intent: NarrativeIntent; // The goal of the narrative
  stance: 'support' | 'oppose' | 'neutral' | 'undermine';
  themes: string[]; // Associated semantic themes
  keywords: string[]; // Markers for detection
  contentSignature: string; // Hash or vector ID of the core message
}

export interface NarrativeIntent {
  goal: 'discredit' | 'distract' | 'demoralize' | 'radicalize' | 'legitimize';
  targetAudience: string[];
  successCriteria: string[]; // e.g., "viral_spread", "mainstream_media_pickup"
}

// --- 2. Propagation Path ---
// How the narrative moves through the network.
export interface PropagationPath {
  id: string;
  narrativeId: string;
  originNodeId: string;
  pathTopology: 'broadcast' | 'viral_tree' | 'bridge_crossing' | 'mesh_flood';
  hopCount: number;
  velocity: number; // Nodes reached per minute
  temporalCoordinationScore: number; // 0.0 - 1.0 (1.0 = perfect synchronization/bot-like)
  communitiesBreached: string[]; // IDs of distinct communities entered
}

// --- 3. Actor Class ---
// Classification of the entity propagating the narrative.
export enum ActorClass {
  HUMAN = 'HUMAN',
  BOT_SIMPLE = 'BOT_SIMPLE',
  BOT_SOPHISTICATED = 'BOT_SOPHISTICATED',
  SWARM_NODE = 'SWARM_NODE', // Part of a coordinated AI swarm
  CYBORG = 'CYBORG', // Human-assisted automation
  STATE_ACTOR = 'STATE_ACTOR', // High-confidence attribution
  USEFUL_IDIOT = 'USEFUL_IDIOT', // Unwitting amplifier
}

export interface ActorProfile {
  id: string;
  classification: ActorClass;
  confidence: number;
  swarmId?: string; // If part of a swarm
  behavioralSignature: string; // Fingerprint ID
}

// --- 4. Amplification Signature ---
// Patterns indicating artificial boosting.
export interface AmplificationSignature {
  id: string;
  type: 'astroturf' | 'brigading' | 'echo_chamber' | 'algorithmic_gaming';
  synchronicityScore: number; // Measure of time-aligned actions
  semanticDivergence: number; // Low divergence = copy/paste; High = AI rewriting
  volume: number;
  platformDistribution: Record<string, number>; // e.g., { twitter: 0.8, telegram: 0.2 }
}

// --- 5. Censorship x Influence Interaction ---
// Modeling the interaction between suppression and amplification.
export interface SuppressionInteraction {
  id: string;
  narrativeId: string;
  suppressionEvent: NarrativeEvent; // The moderation action
  preSuppressionVelocity: number;
  postSuppressionVelocity: number;
  pressureBuildup: number; // Estimated "latent" demand/energy
  reboundFactor: number; // Ratio of post/pre velocity (Streisand effect metric)
  isReinforcing: boolean; // True if censorship fueled the narrative
}

/**
 * Helper to determine if an Actor is likely part of a Swarm based on primitives.
 */
export function isSwarmCandidate(
  actor: ActorProfile,
  path: PropagationPath,
  amp: AmplificationSignature
): boolean {
  if (actor.classification === ActorClass.SWARM_NODE) return true;

  // Heuristic: High coordination + High semantic divergence (AI) + Fast velocity
  if (path.temporalCoordinationScore > 0.85 && amp.semanticDivergence > 0.6) {
    return true;
  }

  return false;
}
