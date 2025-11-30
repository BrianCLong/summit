export type CouplingType = 'BIDIRECTIONAL' | 'UNIDIRECTIONAL' | 'CASCADE';
export type CouplingDirection = 'FORWARD' | 'REVERSE' | 'MUTUAL';

export interface CouplingMetadata {
  failureCorrelation: number;
  latencyCorrelation: number;
  throughputCorrelation: number;
}

export interface SystemCoupling {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  couplingType: CouplingType;
  strength: number;
  direction: CouplingDirection;
  detectionMethod: string;
  evidenceCount: number;
  riskScore: number;
  metadata: CouplingMetadata;
}

export class SystemCouplingBuilder {
  private coupling: Partial<SystemCoupling> = {};

  withSourceSystem(systemId: string): this {
    this.coupling.sourceSystem = systemId;
    return this;
  }

  withTargetSystem(systemId: string): this {
    this.coupling.targetSystem = systemId;
    return this;
  }

  withType(type: CouplingType): this {
    this.coupling.couplingType = type;
    return this;
  }

  withStrength(strength: number): this {
    if (strength < 0 || strength > 1) {
      throw new Error('Coupling strength must be between 0 and 1');
    }
    this.coupling.strength = strength;
    return this;
  }

  withDirection(direction: CouplingDirection): this {
    this.coupling.direction = direction;
    return this;
  }

  withDetectionMethod(method: string): this {
    this.coupling.detectionMethod = method;
    return this;
  }

  withEvidenceCount(count: number): this {
    if (count < 0) {
      throw new Error('Evidence count must be non-negative');
    }
    this.coupling.evidenceCount = count;
    return this;
  }

  withRiskScore(score: number): this {
    if (score < 0 || score > 1) {
      throw new Error('Risk score must be between 0 and 1');
    }
    this.coupling.riskScore = score;
    return this;
  }

  withMetadata(metadata: CouplingMetadata): this {
    this.coupling.metadata = metadata;
    return this;
  }

  build(): SystemCoupling {
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

  private generateId(): string {
    const { sourceSystem, targetSystem } = this.coupling;
    return `coupling-${sourceSystem}-${targetSystem}-${Date.now()}`;
  }
}

export function createSystemCoupling(
  sourceSystem: string,
  targetSystem: string,
  type: CouplingType,
  strength: number,
  direction: CouplingDirection,
  detectionMethod: string,
  metadata: CouplingMetadata,
): SystemCoupling {
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

export function calculateCouplingStrength(metadata: CouplingMetadata): number {
  const { failureCorrelation, latencyCorrelation, throughputCorrelation } = metadata;

  // Weighted average with failure correlation having highest weight
  const weights = {
    failure: 0.5,
    latency: 0.3,
    throughput: 0.2,
  };

  return (
    failureCorrelation * weights.failure +
    latencyCorrelation * weights.latency +
    throughputCorrelation * weights.throughput
  );
}

export function determineCouplingType(
  forwardStrength: number,
  reverseStrength: number,
): CouplingType {
  const bidirectionalThreshold = 0.6;

  if (
    forwardStrength >= bidirectionalThreshold &&
    reverseStrength >= bidirectionalThreshold
  ) {
    return 'BIDIRECTIONAL';
  }

  if (forwardStrength > reverseStrength * 2) {
    return 'CASCADE';
  }

  return 'UNIDIRECTIONAL';
}

export function determineCouplingDirection(
  forwardStrength: number,
  reverseStrength: number,
): CouplingDirection {
  const mutualThreshold = 0.6;

  if (
    forwardStrength >= mutualThreshold &&
    reverseStrength >= mutualThreshold
  ) {
    return 'MUTUAL';
  }

  return forwardStrength > reverseStrength ? 'FORWARD' : 'REVERSE';
}
