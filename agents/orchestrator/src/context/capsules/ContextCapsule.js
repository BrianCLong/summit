"use strict";
/**
 * Context Capsule Implementation
 *
 * Creates and manages invariant-carrying context capsules.
 *
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCapsuleFactory = void 0;
exports.forbidTopicsInvariant = forbidTopicsInvariant;
exports.requireClearanceInvariant = requireClearanceInvariant;
exports.noExternalCallsInvariant = noExternalCallsInvariant;
exports.dataRetentionInvariant = dataRetentionInvariant;
exports.outputSchemaInvariant = outputSchemaInvariant;
const crypto_1 = require("crypto");
/**
 * ContextCapsule Factory
 *
 * Creates cryptographically-bound capsules with embedded invariants.
 */
class ContextCapsuleFactory {
    /**
     * Create a new context capsule
     */
    create(content, invariants, metadata, options) {
        const fullMetadata = {
            ...metadata,
            createdAt: new Date(),
            ...(options?.metadata || {})
        };
        // Apply TTL if specified
        if (options?.ttl) {
            fullMetadata.validUntil = new Date(Date.now() + options.ttl);
        }
        // Compute capsule ID (hash of content + invariants + metadata)
        const capsuleId = this.computeCapsuleHash(content, invariants, fullMetadata);
        const capsule = {
            id: capsuleId,
            content,
            invariants,
            metadata: fullMetadata,
            signature: undefined
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
    computeCapsuleHash(content, invariants, metadata) {
        const payload = JSON.stringify({
            content,
            invariants,
            metadata: {
                ...metadata,
                // Exclude createdAt from hash for reproducibility
                createdAt: undefined
            }
        });
        return (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
    }
    /**
     * Sign a capsule with private key
     */
    signCapsule(capsule, privateKey) {
        const payload = JSON.stringify({
            id: capsule.id,
            content: capsule.content,
            invariants: capsule.invariants,
            metadata: capsule.metadata
        });
        const sign = (0, crypto_1.createSign)('SHA256');
        sign.update(payload);
        sign.end();
        return sign.sign(privateKey, 'hex');
    }
    /**
     * Verify capsule signature
     */
    verifyCapsuleSignature(capsule, publicKey) {
        if (!capsule.signature) {
            return false;
        }
        const payload = JSON.stringify({
            id: capsule.id,
            content: capsule.content,
            invariants: capsule.invariants,
            metadata: capsule.metadata
        });
        const verify = (0, crypto_1.createVerify)('SHA256');
        verify.update(payload);
        verify.end();
        try {
            return verify.verify(publicKey, capsule.signature, 'hex');
        }
        catch {
            return false;
        }
    }
    /**
     * Verify capsule hash integrity
     */
    verifyCapsuleHash(capsule) {
        const computedHash = this.computeCapsuleHash(capsule.content, capsule.invariants, capsule.metadata);
        return computedHash === capsule.id;
    }
    /**
     * Clone capsule with new invariants (creates new capsule ID)
     */
    addInvariants(capsule, newInvariants, options) {
        return this.create(capsule.content, [...capsule.invariants, ...newInvariants], {
            createdBy: capsule.metadata.createdBy,
            authorityScope: capsule.metadata.authorityScope,
            policyDomain: capsule.metadata.policyDomain,
            validUntil: capsule.metadata.validUntil
        }, options);
    }
    /**
     * Create a forwarded capsule (preserves lineage)
     */
    forward(capsule, forwardedBy, options) {
        const forwardingChain = (capsule.metadata.forwardingChain || []);
        return this.create(capsule.content, capsule.invariants, {
            createdBy: capsule.metadata.createdBy, // Preserve original creator
            authorityScope: capsule.metadata.authorityScope,
            policyDomain: capsule.metadata.policyDomain,
            validUntil: capsule.metadata.validUntil,
            forwardingChain: [...forwardingChain, forwardedBy]
        }, options);
    }
}
exports.ContextCapsuleFactory = ContextCapsuleFactory;
/**
 * Default invariant constructors
 */
/**
 * Create a "forbid topics" invariant
 */
function forbidTopicsInvariant(id, topics, severity = 'block') {
    return {
        id,
        type: 'reasoning_constraint',
        rule: { kind: 'forbid_topics', topics },
        severity,
        description: `Reasoning about topics [${topics.join(', ')}] is forbidden`,
        remediation: 'Remove or redact content related to forbidden topics'
    };
}
/**
 * Create a clearance requirement invariant
 */
function requireClearanceInvariant(id, level, severity = 'block') {
    return {
        id,
        type: 'data_usage',
        rule: { kind: 'require_clearance', level },
        severity,
        description: `Requires clearance level: ${level}`,
        remediation: `Execution context must have clearance level ${level} or higher`
    };
}
/**
 * Create a "no external calls" invariant
 */
function noExternalCallsInvariant(id, strict = true, severity = 'block') {
    return {
        id,
        type: 'authority_scope',
        rule: { kind: 'no_external_calls', strict },
        severity,
        description: 'External API calls are forbidden',
        remediation: 'Disable tool calls and external integrations for this context'
    };
}
/**
 * Create a data retention invariant
 */
function dataRetentionInvariant(id, maxDays, severity = 'warn') {
    return {
        id,
        type: 'data_usage',
        rule: { kind: 'data_retention', maxDays },
        severity,
        description: `Data must be deleted after ${maxDays} days`,
        remediation: `Implement retention policy: delete context after ${maxDays} days`
    };
}
/**
 * Create an output schema invariant
 */
function outputSchemaInvariant(id, schema, severity = 'block') {
    return {
        id,
        type: 'output_class',
        rule: { kind: 'output_must_match', schema: schema },
        severity,
        description: 'Output must conform to specified JSON schema',
        remediation: 'Validate model output against schema before accepting'
    };
}
