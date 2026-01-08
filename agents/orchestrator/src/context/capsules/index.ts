/**
 * Invariant-Carrying Context Capsules (IC³) Module
 *
 * Implements ADR-010: Embedding machine-verifiable invariants directly
 * into model context, making rule violations structurally impossible.
 *
 * @module context/capsules
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
 */

export * from "./types.js";
export * from "./ContextCapsule.js";
export * from "./InvariantValidator.js";
export * from "./CapsulePolicy.js";

export {
  forbidTopicsInvariant,
  requireClearanceInvariant,
  noExternalCallsInvariant,
  dataRetentionInvariant,
  outputSchemaInvariant,
} from "./ContextCapsule.js";

export { createAgent, DEFAULT_TRUST_TIERS } from "./CapsulePolicy.js";
