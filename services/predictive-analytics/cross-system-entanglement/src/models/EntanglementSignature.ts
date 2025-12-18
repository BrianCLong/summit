export type SignatureType = 'TEMPORAL' | 'CAUSAL' | 'RESOURCE' | 'DATA_LINEAGE';

export interface EntanglementMetadata {
  correlationCoefficient: number;
  lagTime: number;
  observationWindow: number;
  sampleCount: number;
}

export interface EntanglementSignature {
  id: string;
  systems: string[];
  couplingStrength: number;
  synchronizationDepth: number;
  signatureType: SignatureType;
  confidence: number;
  detectedAt: Date;
  lastObserved: Date;
  metadata: EntanglementMetadata;
}

export class EntanglementSignatureBuilder {
  private signature: Partial<EntanglementSignature> = {};

  withSystems(systems: string[]): this {
    this.signature.systems = systems;
    return this;
  }

  withCouplingStrength(strength: number): this {
    if (strength < 0 || strength > 1) {
      throw new Error('Coupling strength must be between 0 and 1');
    }
    this.signature.couplingStrength = strength;
    return this;
  }

  withSynchronizationDepth(depth: number): this {
    if (depth < 0) {
      throw new Error('Synchronization depth must be non-negative');
    }
    this.signature.synchronizationDepth = depth;
    return this;
  }

  withType(type: SignatureType): this {
    this.signature.signatureType = type;
    return this;
  }

  withConfidence(confidence: number): this {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
    this.signature.confidence = confidence;
    return this;
  }

  withMetadata(metadata: EntanglementMetadata): this {
    this.signature.metadata = metadata;
    return this;
  }

  build(): EntanglementSignature {
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

  private generateId(): string {
    const systemsHash = this.signature.systems!.sort().join('-');
    const timestamp = Date.now();
    return `entanglement-${systemsHash}-${timestamp}`;
  }
}

export function createEntanglementSignature(
  systems: string[],
  couplingStrength: number,
  synchronizationDepth: number,
  type: SignatureType,
  confidence: number,
  metadata: EntanglementMetadata,
): EntanglementSignature {
  return new EntanglementSignatureBuilder()
    .withSystems(systems)
    .withCouplingStrength(couplingStrength)
    .withSynchronizationDepth(synchronizationDepth)
    .withType(type)
    .withConfidence(confidence)
    .withMetadata(metadata)
    .build();
}

export function isExpired(signature: EntanglementSignature, ttlMs: number): boolean {
  const now = Date.now();
  const lastObservedTime = signature.lastObserved.getTime();
  return now - lastObservedTime > ttlMs;
}

export function updateLastObserved(signature: EntanglementSignature): EntanglementSignature {
  return {
    ...signature,
    lastObserved: new Date(),
  };
}
