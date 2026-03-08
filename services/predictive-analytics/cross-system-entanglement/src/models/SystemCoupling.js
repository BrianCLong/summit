"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemCouplingBuilder = void 0;
exports.createSystemCoupling = createSystemCoupling;
exports.calculateCouplingStrength = calculateCouplingStrength;
exports.determineCouplingType = determineCouplingType;
exports.determineCouplingDirection = determineCouplingDirection;
class SystemCouplingBuilder {
    coupling = {};
    withSourceSystem(systemId) {
        this.coupling.sourceSystem = systemId;
        return this;
    }
    withTargetSystem(systemId) {
        this.coupling.targetSystem = systemId;
        return this;
    }
    withType(type) {
        this.coupling.couplingType = type;
        return this;
    }
    withStrength(strength) {
        if (strength < 0 || strength > 1) {
            throw new Error('Coupling strength must be between 0 and 1');
        }
        this.coupling.strength = strength;
        return this;
    }
    withDirection(direction) {
        this.coupling.direction = direction;
        return this;
    }
    withDetectionMethod(method) {
        this.coupling.detectionMethod = method;
        return this;
    }
    withEvidenceCount(count) {
        if (count < 0) {
            throw new Error('Evidence count must be non-negative');
        }
        this.coupling.evidenceCount = count;
        return this;
    }
    withRiskScore(score) {
        if (score < 0 || score > 1) {
            throw new Error('Risk score must be between 0 and 1');
        }
        this.coupling.riskScore = score;
        return this;
    }
    withMetadata(metadata) {
        this.coupling.metadata = metadata;
        return this;
    }
    build() {
        if (!this.coupling.sourceSystem) {
            throw new Error('Source system is required');
        }
        if (!this.coupling.targetSystem) {
            throw new Error('Target system is required');
        }
        if (this.coupling.sourceSystem === this.coupling.targetSystem) {
            throw new Error('Source and target systems must be different');
        }
        if (!this.coupling.couplingType) {
            throw new Error('Coupling type is required');
        }
        if (this.coupling.strength === undefined) {
            throw new Error('Strength is required');
        }
        if (!this.coupling.direction) {
            throw new Error('Direction is required');
        }
        if (!this.coupling.detectionMethod) {
            throw new Error('Detection method is required');
        }
        if (this.coupling.evidenceCount === undefined) {
            this.coupling.evidenceCount = 1;
        }
        if (this.coupling.riskScore === undefined) {
            this.coupling.riskScore = this.coupling.strength;
        }
        if (!this.coupling.metadata) {
            throw new Error('Metadata is required');
        }
        return {
            id: this.generateId(),
            sourceSystem: this.coupling.sourceSystem,
            targetSystem: this.coupling.targetSystem,
            couplingType: this.coupling.couplingType,
            strength: this.coupling.strength,
            direction: this.coupling.direction,
            detectionMethod: this.coupling.detectionMethod,
            evidenceCount: this.coupling.evidenceCount,
            riskScore: this.coupling.riskScore,
            metadata: this.coupling.metadata,
        };
    }
    generateId() {
        const { sourceSystem, targetSystem } = this.coupling;
        return `coupling-${sourceSystem}-${targetSystem}-${Date.now()}`;
    }
}
exports.SystemCouplingBuilder = SystemCouplingBuilder;
function createSystemCoupling(sourceSystem, targetSystem, type, strength, direction, detectionMethod, metadata) {
    return new SystemCouplingBuilder()
        .withSourceSystem(sourceSystem)
        .withTargetSystem(targetSystem)
        .withType(type)
        .withStrength(strength)
        .withDirection(direction)
        .withDetectionMethod(detectionMethod)
        .withMetadata(metadata)
        .build();
}
function calculateCouplingStrength(metadata) {
    const { failureCorrelation, latencyCorrelation, throughputCorrelation } = metadata;
    // Weighted average with failure correlation having highest weight
    const weights = {
        failure: 0.5,
        latency: 0.3,
        throughput: 0.2,
    };
    return (failureCorrelation * weights.failure +
        latencyCorrelation * weights.latency +
        throughputCorrelation * weights.throughput);
}
function determineCouplingType(forwardStrength, reverseStrength) {
    const bidirectionalThreshold = 0.6;
    if (forwardStrength >= bidirectionalThreshold &&
        reverseStrength >= bidirectionalThreshold) {
        return 'BIDIRECTIONAL';
    }
    if (forwardStrength > reverseStrength * 2) {
        return 'CASCADE';
    }
    return 'UNIDIRECTIONAL';
}
function determineCouplingDirection(forwardStrength, reverseStrength) {
    const mutualThreshold = 0.6;
    if (forwardStrength >= mutualThreshold &&
        reverseStrength >= mutualThreshold) {
        return 'MUTUAL';
    }
    return forwardStrength > reverseStrength ? 'FORWARD' : 'REVERSE';
}
