import type { CogWriteOp, CogRejectionError } from "../types";
import type { EntitySnapshot, ReconcileResult } from "./types";
import { extractTrustVector } from "../trust/extractTrustVector";
import { defaultPromotionPolicy, evaluateTrustForPromotion } from "../trust/policy";
import type { PromotionPolicy } from "../trust/types";

function err(code: string, message: string, details?: Record<string, unknown>): CogRejectionError {
  return { code, message, details };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function mergeUnique<T>(a: T[] = [], b: T[] = []): T[] {
  return Array.from(new Set([...a, ...b]));
}

function reconcileNarrative(
  incoming: Record<string, unknown>,
  current: Record<string, unknown>
): ReconcileResult {
  const incomingLastSeen = String(incoming.lastSeen ?? "");
  const currentLastSeen = String(current.lastSeen ?? "");

  const incomingSummary = String(incoming.summary ?? "");
  const currentSummary = String(current.summary ?? "");

  const incomingMetrics = isObject(incoming.metrics) ? incoming.metrics : {};
  const currentMetrics = isObject(current.metrics) ? current.metrics : {};

  const incomingVelocity = Number(incomingMetrics.velocity ?? 0);
  const currentVelocity = Number(currentMetrics.velocity ?? 0);
  const incomingReach = Number(incomingMetrics.reach ?? 0);
  const currentReach = Number(currentMetrics.reach ?? 0);

  const incomingVariants = Array.isArray(incoming.variants) ? incoming.variants : [];
  const currentVariants = Array.isArray(current.variants) ? current.variants : [];

  const materiallyConflictingLabel =
    current.label && incoming.label && String(current.label) !== String(incoming.label);

  if (materiallyConflictingLabel && incomingSummary !== currentSummary) {
    return {
      decision: "QUARANTINE",
      reasons: [
        err(
          "CONFLICT_NARRATIVE_IDENTITY",
          "Incoming narrative conflicts materially with current narrative identity.",
          { currentLabel: current.label, incomingLabel: incoming.label }
        )
      ],
      comparedFields: ["label", "summary"],
      isConflict: true,
      isOverwrite: true
    };
  }

  const isNewer = incomingLastSeen > currentLastSeen;
  const isRicher =
    incomingVariants.length > currentVariants.length ||
    incomingReach > currentReach ||
    incomingVelocity > currentVelocity;

  if (isNewer || isRicher) {
    return {
      decision: "MERGE",
      mergedPayload: {
        ...current,
        ...incoming,
        firstSeen: current.firstSeen ?? incoming.firstSeen,
        lastSeen: isNewer ? incoming.lastSeen : current.lastSeen,
        variants: mergeUnique(currentVariants, incomingVariants),
        frames: mergeUnique(
          Array.isArray(current.frames) ? current.frames : [],
          Array.isArray(incoming.frames) ? incoming.frames : []
        ),
        rhetoricalMoves: mergeUnique(
          Array.isArray(current.rhetoricalMoves) ? current.rhetoricalMoves : [],
          Array.isArray(incoming.rhetoricalMoves) ? incoming.rhetoricalMoves : []
        ),
        metrics: {
          velocity: Math.max(currentVelocity, incomingVelocity),
          reach: Math.max(currentReach, incomingReach),
          channels: mergeUnique(
            Array.isArray(currentMetrics.channels) ? currentMetrics.channels : [],
            Array.isArray(incomingMetrics.channels) ? incomingMetrics.channels : []
          )
        }
      },
      reasons: [
        err("MERGE_RICHER_OR_NEWER", "Incoming narrative is newer or richer than current state.")
      ],
      comparedFields: ["lastSeen", "variants", "metrics.reach", "metrics.velocity"],
      isConflict: false,
      isOverwrite: true
    };
  }

  return {
    decision: "NOOP",
    reasons: [err("NOOP_STALE_OR_WEAKER", "Incoming narrative is not materially newer or richer.")],
    comparedFields: ["lastSeen", "variants", "metrics"],
    isConflict: false,
    isOverwrite: false
  };
}

function reconcileBelief(
  incoming: Record<string, unknown>,
  current: Record<string, unknown>
): ReconcileResult {
  const incomingProp = String(incoming.proposition ?? "");
  const currentProp = String(current.proposition ?? "");

  const incomingPolarity = String(incoming.polarity ?? "");
  const currentPolarity = String(current.polarity ?? "");

  if (incomingProp !== currentProp) {
    return {
      decision: "QUARANTINE",
      reasons: [err("CONFLICT_PROPOSITION", "Belief proposition conflicts materially with current state.")],
      comparedFields: ["proposition"],
      isConflict: true,
      isOverwrite: true
    };
  }

  if (incomingPolarity !== currentPolarity) {
    return {
      decision: "REVIEW",
      reasons: [err("POLARITY_DIVERGENCE", "Belief polarity diverges and requires analyst review.")],
      comparedFields: ["polarity"],
      isConflict: true,
      isOverwrite: true
    };
  }

  const incomingConfidence = Number(incoming.confidence ?? 0);
  const currentConfidence = Number(current.confidence ?? 0);

  const incomingTs = Array.isArray(incoming.timeSeries) ? incoming.timeSeries : [];
  const currentTs = Array.isArray(current.timeSeries) ? current.timeSeries : [];

  const richer = incomingTs.length > currentTs.length || incomingConfidence > currentConfidence;

  if (richer) {
    return {
      decision: "MERGE",
      mergedPayload: {
        ...current,
        ...incoming,
        confidence: Math.max(currentConfidence, incomingConfidence),
        timeSeries: mergeUnique(currentTs, incomingTs)
      },
      reasons: [err("MERGE_HIGHER_CONFIDENCE", "Incoming belief is richer or higher-confidence.")],
      comparedFields: ["confidence", "timeSeries"],
      isConflict: false,
      isOverwrite: true
    };
  }

  return {
    decision: "NOOP",
    reasons: [err("NOOP_STALE_OR_WEAKER", "Incoming belief is not materially better than current state.")],
    comparedFields: ["confidence", "timeSeries"],
    isConflict: false,
    isOverwrite: false
  };
}

export function reconcileEntityTrustAware(input: {
  op: CogWriteOp;
  current: EntitySnapshot | null;
  policy?: PromotionPolicy;
}): ReconcileResult {
  if (!input.current) {
    const incomingTrust = extractTrustVector(input.op.payload);
    const trust = evaluateTrustForPromotion({
      incoming: incomingTrust,
      current: null,
      policy: input.policy ?? defaultPromotionPolicy,
      isOverwrite: false,
      isConflict: false
    });

    if (trust.decision === "REVIEW") {
      return {
        decision: "REVIEW",
        reasons: trust.reasons.map((r) => ({ ...r }))
      };
    }

    if (trust.decision === "QUARANTINE") {
      return {
        decision: "QUARANTINE",
        reasons: trust.reasons.map((r) => ({ ...r }))
      };
    }

    return {
      decision: "APPLY",
      reasons: [
        { code: "NEW_ENTITY", message: "No current entity state exists." },
        ...trust.reasons.map((r) => ({ ...r }))
      ]
    };
  }

  const structural =
    input.op.entityType === "Narrative"
      ? reconcileNarrative(input.op.payload, input.current.payload)
      : input.op.entityType === "Belief"
      ? reconcileBelief(input.op.payload, input.current.payload)
      : {
          decision: "NOOP" as const,
          reasons: [
            {
              code: "NO_RECONCILER",
              message: `No entity-aware reconciler is registered for ${input.op.entityType}; defaulting to NOOP.`
            }
          ],
          isConflict: false,
          isOverwrite: false
        };

  if (structural.decision === "NOOP" || structural.decision === "QUARANTINE" || structural.decision === "REVIEW") {
    if (structural.decision === "NOOP") return structural;

    const incomingTrust = extractTrustVector(input.op.payload);
    const currentTrust = input.current.trust ?? extractTrustVector(input.current.payload);
    const trust = evaluateTrustForPromotion({
      incoming: incomingTrust,
      current: currentTrust,
      policy: input.policy ?? defaultPromotionPolicy,
      isOverwrite: Boolean(structural.isOverwrite),
      isConflict: Boolean(structural.isConflict)
    });

    if (trust.decision === "QUARANTINE") {
      return {
        decision: "QUARANTINE",
        reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
      };
    }

    return {
      decision: "REVIEW",
      reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
    };
  }

  const incomingTrust = extractTrustVector(input.op.payload);
  const currentTrust = input.current.trust ?? extractTrustVector(input.current.payload);
  const trust = evaluateTrustForPromotion({
    incoming: incomingTrust,
    current: currentTrust,
    policy: input.policy ?? defaultPromotionPolicy,
    isOverwrite: Boolean(structural.isOverwrite),
    isConflict: Boolean(structural.isConflict)
  });

  if (trust.decision === "ALLOW_MERGE") {
    return {
      ...structural,
      decision: "MERGE",
      reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
    };
  }

  if (trust.decision === "ALLOW_APPLY") {
    return {
      ...structural,
      decision: "APPLY",
      reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
    };
  }

  if (trust.decision === "NOOP") {
    return {
      decision: "NOOP",
      reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
    };
  }

  if (trust.decision === "QUARANTINE") {
    return {
      decision: "QUARANTINE",
      reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
    };
  }

  return {
    decision: "REVIEW",
    reasons: [...structural.reasons, ...trust.reasons.map((r) => ({ ...r }))]
  };
}
