/**
 * Entity confidence scoring
 */

import type { Entity } from '../types';

export class ConfidenceScorer {
  /**
   * Calculate confidence score for an entity
   */
  score(entity: Entity, context: string): number {
    let score = entity.confidence;

    // Adjust based on entity characteristics
    score *= this.contextScore(entity, context);
    score *= this.frequencyScore(entity, context);
    score *= this.lengthScore(entity);

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Score based on context
   */
  private contextScore(entity: Entity, context: string): number {
    // Check if entity appears in a strong context
    const strongIndicators = ['said', 'announced', 'reported', 'CEO', 'President'];
    const hasStrongContext = strongIndicators.some((indicator) =>
      context.toLowerCase().includes(indicator.toLowerCase())
    );

    return hasStrongContext ? 1.2 : 1.0;
  }

  /**
   * Score based on frequency
   */
  private frequencyScore(entity: Entity, context: string): number {
    const pattern = new RegExp(entity.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = context.match(pattern);
    const frequency = matches ? matches.length : 0;

    if (frequency >= 3) return 1.2;
    if (frequency === 2) return 1.1;
    return 1.0;
  }

  /**
   * Score based on entity length
   */
  private lengthScore(entity: Entity): number {
    const words = entity.text.split(/\s+/).length;

    if (words >= 3) return 1.1;
    if (words === 1) return 0.9;
    return 1.0;
  }
}
