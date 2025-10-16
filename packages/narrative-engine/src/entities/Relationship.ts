import type { RelationshipType } from '../core/types.js';

export interface RelationshipSnapshot {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  intensity: number;
  trust: number;
}

export class Relationship {
  readonly sourceId: string;
  readonly targetId: string;
  type: RelationshipType;
  intensity: number;
  trust: number;

  constructor(options: {
    sourceId: string;
    targetId: string;
    type?: RelationshipType;
    intensity?: number;
    trust?: number;
  }) {
    this.sourceId = options.sourceId;
    this.targetId = options.targetId;
    this.type = options.type ?? 'neutral';
    this.intensity = Math.max(0, Math.min(1, options.intensity ?? 0.5));
    this.trust = Math.max(0, Math.min(1, options.trust ?? 0.5));
  }

  adjustTrust(delta: number): number {
    this.trust = Math.max(0, Math.min(1, this.trust + delta));
    return this.trust;
  }

  adjustIntensity(delta: number): number {
    this.intensity = Math.max(0, Math.min(1, this.intensity + delta));
    return this.intensity;
  }

  influenceFromMood(mood: number): number {
    const direction =
      this.type === 'ally' || this.type === 'family'
        ? 1
        : this.type === 'rival'
          ? -1
          : 0.25;
    const scaled = mood * this.intensity * this.trust * direction;
    return Math.max(-5, Math.min(5, scaled));
  }

  clone(): Relationship {
    return new Relationship({
      sourceId: this.sourceId,
      targetId: this.targetId,
      type: this.type,
      intensity: this.intensity,
      trust: this.trust,
    });
  }

  snapshot(): RelationshipSnapshot {
    return {
      sourceId: this.sourceId,
      targetId: this.targetId,
      type: this.type,
      intensity: this.intensity,
      trust: this.trust,
    };
  }
}
