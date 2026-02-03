
import { NarrativeEvent } from './types.js';
import { SuppressionInteraction } from './primitives.js';

/**
 * CENSORSHIP X INFLUENCE INTERACTION MODEL
 *
 * Operationalizes the interaction between platform governance (censorship) and
 * influence operations. Based on arXiv 2025 research on "Informational Cocoons".
 */

export class CensorshipInteractionModel {

  /**
   * Calculates the impact of a suppression event on narrative propagation.
   * Detects "Streisand Effect" (Rebound Amplification).
   */
  public calculateInteraction(
    narrativeId: string,
    suppressionEvent: NarrativeEvent,
    preVelocity: number, // nodes/min before event
    postVelocity: number // nodes/min after event (e.g. 1 hour later)
  ): SuppressionInteraction {

    // 1. Calculate Rebound Factor
    // If post > pre, the suppression backfired.
    let reboundFactor = 0;
    if (preVelocity > 0) {
      reboundFactor = postVelocity / preVelocity;
    } else if (postVelocity > 0) {
      reboundFactor = 999; // Infinite growth from zero
    }

    // 2. Estimate Pressure Buildup (Latent Energy)
    // Modeled as a function of intensity * time_suppressed (mocked here as simple intensity factor)
    // In a real system, this would integrate "blocked attempts" over time.
    const pressureBuildup = suppressionEvent.intensity * 1.5;

    // 3. Determine if Reinforcing
    // If velocity increased OR pressure is critical despite drop.
    const isReinforcing = reboundFactor > 1.1 || pressureBuildup > 8.0;

    return {
      id: `supp_int_${Date.now()}`,
      narrativeId,
      suppressionEvent,
      preSuppressionVelocity: preVelocity,
      postSuppressionVelocity: postVelocity,
      pressureBuildup,
      reboundFactor,
      isReinforcing
    };
  }

  /**
   * Predicts if a planned suppression action will backfire.
   * Uses historical "Martyrdom" scores of the actor.
   */
  public predictBackfireRisk(actorId: string, suppressionType: string): number {
    // Mock logic
    if (suppressionType === 'account_ban') return 0.8; // High risk of martyrdom
    if (suppressionType === 'labeling') return 0.3; // Low risk
    return 0.5;
  }
}
