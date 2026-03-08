"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntanglementSignatureBuilder = void 0;
exports.createEntanglementSignature = createEntanglementSignature;
exports.isExpired = isExpired;
exports.updateLastObserved = updateLastObserved;
class EntanglementSignatureBuilder {
    signature = {};
    withSystems(systems) {
        this.signature.systems = systems;
        return this;
    }
    withCouplingStrength(strength) {
        if (strength < 0 || strength > 1) {
            throw new Error('Coupling strength must be between 0 and 1');
        }
        this.signature.couplingStrength = strength;
        return this;
    }
    withSynchronizationDepth(depth) {
        if (depth < 0) {
            throw new Error('Synchronization depth must be non-negative');
        }
        this.signature.synchronizationDepth = depth;
        return this;
    }
    withType(type) {
        this.signature.signatureType = type;
        return this;
    }
    withConfidence(confidence) {
        if (confidence < 0 || confidence > 1) {
            throw new Error('Confidence must be between 0 and 1');
        }
        this.signature.confidence = confidence;
        return this;
    }
    withMetadata(metadata) {
        this.signature.metadata = metadata;
        return this;
    }
    build() {
        const now = new Date();
        if (!this.signature.systems || this.signature.systems.length < 2) {
            throw new Error('At least 2 systems required for entanglement signature');
        }
        if (this.signature.couplingStrength === undefined) {
            throw new Error('Coupling strength is required');
        }
        if (this.signature.synchronizationDepth === undefined) {
            throw new Error('Synchronization depth is required');
        }
        if (!this.signature.signatureType) {
            throw new Error('Signature type is required');
        }
        if (this.signature.confidence === undefined) {
            throw new Error('Confidence is required');
        }
        if (!this.signature.metadata) {
            throw new Error('Metadata is required');
        }
        return {
            id: this.generateId(),
            systems: this.signature.systems,
            couplingStrength: this.signature.couplingStrength,
            synchronizationDepth: this.signature.synchronizationDepth,
            signatureType: this.signature.signatureType,
            confidence: this.signature.confidence,
            detectedAt: now,
            lastObserved: now,
            metadata: this.signature.metadata,
        };
    }
    generateId() {
        const systemsHash = this.signature.systems.sort().join('-');
        const timestamp = Date.now();
        return `entanglement-${systemsHash}-${timestamp}`;
    }
}
exports.EntanglementSignatureBuilder = EntanglementSignatureBuilder;
function createEntanglementSignature(systems, couplingStrength, synchronizationDepth, type, confidence, metadata) {
    return new EntanglementSignatureBuilder()
        .withSystems(systems)
        .withCouplingStrength(couplingStrength)
        .withSynchronizationDepth(synchronizationDepth)
        .withType(type)
        .withConfidence(confidence)
        .withMetadata(metadata)
        .build();
}
function isExpired(signature, ttlMs) {
    const now = Date.now();
    const lastObservedTime = signature.lastObserved.getTime();
    return now - lastObservedTime > ttlMs;
}
function updateLastObserved(signature) {
    return {
        ...signature,
        lastObserved: new Date(),
    };
}
