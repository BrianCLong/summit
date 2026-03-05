/**
 * Representation Layer — Self-Flow latent embeddings → UnifiedStateVector
 *
 * Implements the Self-Flow dual-timestep self-distillation strategy:
 * observations are encoded into a unified latent space without requiring
 * external representation encoders.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

import type { Observation } from "../../connectors/observation_pipeline.js"

/**
 * A fixed-dimension latent vector representing the current enterprise state.
 * Dimension is kept opaque here; the dynamics model operates on it as-is.
 */
export type UnifiedStateVector = number[]

/**
 * Minimal Self-Flow encoder interface.
 * Production implementations back this with an actual flow-matching model;
 * the scaffold provides a deterministic stub for testing.
 */
export interface SelfFlowEncoder {
  /**
   * Encode a batch of observations into a single unified latent vector.
   * Uses dual-timestep scheduling internally.
   */
  encode(observations: Observation[]): Promise<UnifiedStateVector>
}

/**
 * Stub encoder — deterministic, zero-dependency, safe for unit tests.
 * Replace with a real model-backed implementation before enabling in prod.
 */
export class StubSelfFlowEncoder implements SelfFlowEncoder {
  private readonly dim: number

  constructor(dim = 128) {
    this.dim = dim
  }

  async encode(observations: Observation[]): Promise<UnifiedStateVector> {
    // Deterministic hash-mix over observation ids — stable across runs
    let seed = observations.length
    for (const obs of observations) {
      for (let i = 0; i < obs.id.length; i++) {
        seed = (seed * 31 + obs.id.charCodeAt(i)) >>> 0
      }
    }
    return Array.from({ length: this.dim }, (_, i) => {
      const v = Math.sin(seed + i) * 0.5 + 0.5
      return Math.round(v * 1e6) / 1e6
    })
  }
}
