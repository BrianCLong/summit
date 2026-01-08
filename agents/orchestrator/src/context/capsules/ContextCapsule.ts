/**
 * Context Capsule Implementation
 *
 * Creates and manages invariant-carrying context capsules.
 *
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
 */

import { createHash, createSign, createVerify } from "crypto";
import {
  ContextCapsule as IContextCapsule,
  Invariant,
  CapsuleMetadata,
  CapsuleCreationOptions,
} from "./types.js";
import { ContextSegment } from "../provenance/types.js";

/**
 * ContextCapsule Factory
 *
 * Creates cryptographically-bound capsules with embedded invariants.
 */
export class ContextCapsuleFactory {
  /**
   * Create a new context capsule
   */
  create(
    content: ContextSegment,
    invariants: Invariant[],
    metadata: Omit<CapsuleMetadata, "createdAt">,
    options?: CapsuleCreationOptions
  ): IContextCapsule {
    const fullMetadata: CapsuleMetadata = {
      ...metadata,
      createdAt: new Date(),
      ...(options?.metadata || {}),
    };

    // Apply TTL if specified
    if (options?.ttl) {
      fullMetadata.validUntil = new Date(Date.now() + options.ttl);
    }

    // Compute capsule ID (hash of content + invariants + metadata)
    const capsuleId = this.computeCapsuleHash(content, invariants, fullMetadata);

    const capsule: IContextCapsule = {
      id: capsuleId,
      content,
      invariants,
      metadata: fullMetadata,
      signature: undefined,
    };

    // Sign capsule if requested
    if (options?.sign && options.privateKey) {
      capsule.signature = this.signCapsule(capsule, options.privateKey);
    }

    return capsule;
  }

  /**
   * Compute cryptographic hash of capsule contents
   */
  private computeCapsuleHash(
    content: ContextSegment,
    invariants: Invariant[],
    metadata: CapsuleMetadata
  ): string {
    const payload = JSON.stringify({
      content,
      invariants,
      metadata: {
        ...metadata,
        // Exclude createdAt from hash for reproducibility
        createdAt: undefined,
      },
    });

    return createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Sign a capsule with private key
   */
  private signCapsule(capsule: IContextCapsule, privateKey: string): string {
    const payload = JSON.stringify({
      id: capsule.id,
      content: capsule.content,
      invariants: capsule.invariants,
      metadata: capsule.metadata,
    });

    const sign = createSign("SHA256");
    sign.update(payload);
    sign.end();

    return sign.sign(privateKey, "hex");
  }

  /**
   * Verify capsule signature
   */
  verifyCapsuleSignature(capsule: IContextCapsule, publicKey: string): boolean {
    if (!capsule.signature) {
      return false;
    }

    const payload = JSON.stringify({
      id: capsule.id,
      content: capsule.content,
      invariants: capsule.invariants,
      metadata: capsule.metadata,
    });

    const verify = createVerify("SHA256");
    verify.update(payload);
    verify.end();

    try {
      return verify.verify(publicKey, capsule.signature, "hex");
    } catch {
      return false;
    }
  }

  /**
   * Verify capsule hash integrity
   */
  verifyCapsuleHash(capsule: IContextCapsule): boolean {
    const computedHash = this.computeCapsuleHash(
      capsule.content,
      capsule.invariants,
      capsule.metadata
    );

    return computedHash === capsule.id;
  }

  /**
   * Clone capsule with new invariants (creates new capsule ID)
   */
  addInvariants(
    capsule: IContextCapsule,
    newInvariants: Invariant[],
    options?: CapsuleCreationOptions
  ): IContextCapsule {
    return this.create(
      capsule.content,
      [...capsule.invariants, ...newInvariants],
      {
        createdBy: capsule.metadata.createdBy,
        authorityScope: capsule.metadata.authorityScope,
        policyDomain: capsule.metadata.policyDomain,
        validUntil: capsule.metadata.validUntil,
      },
      options
    );
  }

  /**
   * Create a forwarded capsule (preserves lineage)
   */
  forward(
    capsule: IContextCapsule,
    forwardedBy: string,
    options?: CapsuleCreationOptions
  ): IContextCapsule {
    const forwardingChain = (capsule.metadata.forwardingChain || []) as string[];

    return this.create(
      capsule.content,
      capsule.invariants,
      {
        createdBy: capsule.metadata.createdBy, // Preserve original creator
        authorityScope: capsule.metadata.authorityScope,
        policyDomain: capsule.metadata.policyDomain,
        validUntil: capsule.metadata.validUntil,
        forwardingChain: [...forwardingChain, forwardedBy],
      },
      options
    );
  }
}

/**
 * Default invariant constructors
 */

/**
 * Create a "forbid topics" invariant
 */
export function forbidTopicsInvariant(
  id: string,
  topics: string[],
  severity: "info" | "warn" | "block" = "block"
): Invariant {
  return {
    id,
    type: "reasoning_constraint",
    rule: { kind: "forbid_topics", topics },
    severity,
    description: `Reasoning about topics [${topics.join(", ")}] is forbidden`,
    remediation: "Remove or redact content related to forbidden topics",
  };
}

/**
 * Create a clearance requirement invariant
 */
export function requireClearanceInvariant(
  id: string,
  level: string,
  severity: "info" | "warn" | "block" = "block"
): Invariant {
  return {
    id,
    type: "data_usage",
    rule: { kind: "require_clearance", level },
    severity,
    description: `Requires clearance level: ${level}`,
    remediation: `Execution context must have clearance level ${level} or higher`,
  };
}

/**
 * Create a "no external calls" invariant
 */
export function noExternalCallsInvariant(
  id: string,
  strict: boolean = true,
  severity: "info" | "warn" | "block" = "block"
): Invariant {
  return {
    id,
    type: "authority_scope",
    rule: { kind: "no_external_calls", strict },
    severity,
    description: "External API calls are forbidden",
    remediation: "Disable tool calls and external integrations for this context",
  };
}

/**
 * Create a data retention invariant
 */
export function dataRetentionInvariant(
  id: string,
  maxDays: number,
  severity: "info" | "warn" | "block" = "warn"
): Invariant {
  return {
    id,
    type: "data_usage",
    rule: { kind: "data_retention", maxDays },
    severity,
    description: `Data must be deleted after ${maxDays} days`,
    remediation: `Implement retention policy: delete context after ${maxDays} days`,
  };
}

/**
 * Create an output schema invariant
 */
export function outputSchemaInvariant(
  id: string,
  schema: Record<string, unknown>,
  severity: "info" | "warn" | "block" = "block"
): Invariant {
  return {
    id,
    type: "output_class",
    rule: { kind: "output_must_match", schema: schema as any },
    severity,
    description: "Output must conform to specified JSON schema",
    remediation: "Validate model output against schema before accepting",
  };
}
