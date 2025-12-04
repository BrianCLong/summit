/**
 * DampingCalculator - Calculate effect dampening across propagation orders
 */

import type { CausalLink } from './PropagationEngine.js';

export interface DampeningConfig {
  baseDecay: number;
  evidenceWeight: number;
  orderPenalty: number;
  minimumDampening: number;
}

export class DampingCalculator {
  private config: DampeningConfig;

  constructor(config?: Partial<DampeningConfig>) {
    this.config = {
      baseDecay: 0.7, // 30% reduction per order
      evidenceWeight: 0.3, // 30% influence from evidence quality
      orderPenalty: 0.1, // 10% additional penalty per order
      minimumDampening: 0.1, // Never dampen below 10%
      ...config,
    };
  }

  /**
   * Calculate dampening factor for a causal link at given order
   */
  calculateDampening(order: number, link: CausalLink): number {
    // Base exponential decay
    const baseDecay = Math.pow(this.config.baseDecay, order - 1);

    // Evidence quality modifier (stronger evidence = less dampening)
    const evidenceModifier =
      1 -
      this.config.evidenceWeight * (1 - link.evidenceQuality || link.strength);

    // Order penalty (higher orders decay faster)
    const orderPenalty = 1 - this.config.orderPenalty * (order - 1);

    // Combined dampening
    let dampening = baseDecay * evidenceModifier * orderPenalty;

    // Apply minimum floor
    dampening = Math.max(dampening, this.config.minimumDampening);

    // Ensure 0-1 range
    return Math.max(0, Math.min(1, dampening));
  }

  /**
   * Calculate magnitude-specific dampening (can differ from probability dampening)
   */
  calculateMagnitudeDampening(order: number, link: CausalLink): number {
    // Magnitude may decay differently than probability
    const baseDampening = this.calculateDampening(order, link);

    // Magnitude-specific factors
    const strengthFactor = link.strength || 0.5;

    return baseDampening * strengthFactor;
  }

  /**
   * Calculate time-based dampening for delayed effects
   */
  calculateTimeDampening(timeElapsed: number, halfLife: number): number {
    // Exponential decay based on half-life
    return Math.pow(0.5, timeElapsed / halfLife);
  }

  /**
   * Calculate confidence decay across propagation
   */
  calculateConfidenceDampening(order: number, baseConfidence: number): number {
    // Confidence decays with uncertainty accumulation
    const uncertaintyGrowth = 1 - Math.pow(0.95, order - 1);
    return baseConfidence * (1 - uncertaintyGrowth);
  }

  /**
   * Calculate domain-specific dampening
   */
  calculateDomainDampening(
    sourceDomain: string,
    targetDomain: string,
  ): number {
    // Cross-domain transitions have additional dampening
    if (sourceDomain === targetDomain) {
      return 1.0; // No additional dampening
    }

    // Domain affinity matrix
    const affinities: Record<string, Record<string, number>> = {
      ECONOMIC: { SOCIAL: 0.8, POLITICAL: 0.9, TECHNOLOGY: 0.85 },
      POLITICAL: { POLICY: 0.95, SOCIAL: 0.8, ECONOMIC: 0.85 },
      GEOPOLITICAL: { MILITARY: 0.9, ECONOMIC: 0.7, DIPLOMATIC: 0.95 },
      TECHNOLOGY: { ECONOMIC: 0.8, SOCIAL: 0.7, SECURITY: 0.85 },
      SOCIAL: { POLITICAL: 0.75, ECONOMIC: 0.7, CULTURAL: 0.9 },
    };

    const sourceAffinities = affinities[sourceDomain] || {};
    return sourceAffinities[targetDomain] || 0.5; // Low affinity for unknown transitions
  }

  /**
   * Calculate combined dampening with all factors
   */
  calculateCombinedDampening(
    order: number,
    link: CausalLink,
    options: {
      timeElapsed?: number;
      timeHalfLife?: number;
      sourceDomain?: string;
    } = {},
  ): number {
    let dampening = this.calculateDampening(order, link);

    // Apply time dampening if specified
    if (options.timeElapsed !== undefined && options.timeHalfLife) {
      const timeDampening = this.calculateTimeDampening(
        options.timeElapsed,
        options.timeHalfLife,
      );
      dampening *= timeDampening;
    }

    // Apply domain dampening if specified
    if (options.sourceDomain && link.domain) {
      const domainDampening = this.calculateDomainDampening(
        options.sourceDomain,
        link.domain,
      );
      dampening *= domainDampening;
    }

    return Math.max(0, Math.min(1, dampening));
  }
}

/**
 * Calculate average dampening across multiple links
 */
export function calculateAverageDampening(
  links: Array<{ order: number; link: CausalLink }>,
  calculator?: DampingCalculator,
): number {
  if (links.length === 0) return 0;

  const calc = calculator || new DampingCalculator();
  const total = links.reduce(
    (sum, { order, link }) => sum + calc.calculateDampening(order, link),
    0,
  );

  return total / links.length;
}

/**
 * Find optimal intervention order (where dampening is most effective)
 */
export function findOptimalInterventionOrder(
  maxOrder: number,
  sampleLink: CausalLink,
  calculator?: DampingCalculator,
): number {
  const calc = calculator || new DampingCalculator();

  let maxImpact = 0;
  let optimalOrder = 1;

  for (let order = 1; order <= maxOrder; order++) {
    const dampening = calc.calculateDampening(order, sampleLink);
    const remainingImpact = 1 - dampening;

    // Impact of intervention = remaining impact at this order
    if (remainingImpact > maxImpact) {
      maxImpact = remainingImpact;
      optimalOrder = order;
    }
  }

  return optimalOrder;
}
