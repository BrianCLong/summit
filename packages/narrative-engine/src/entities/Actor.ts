import { Relationship } from './Relationship.js';

export interface ActorSnapshot {
  id: string;
  name: string;
  traits: string[];
  mood: number;
  resilience: number;
  influence: number;
  relationships: ReturnType<Actor['getRelationships']>;
}

export class Actor {
  readonly id: string;
  name: string;
  traits: string[];
  private mood: number;
  private resilience: number;
  private influence: number;
  private readonly relationships: Map<string, Relationship> = new Map();

  constructor(options: {
    id: string;
    name: string;
    traits?: string[];
    mood?: number;
    resilience?: number;
    influence?: number;
  }) {
    this.id = options.id;
    this.name = options.name;
    this.traits = options.traits ?? [];
    this.mood = options.mood ?? 0;
    this.resilience = Math.min(Math.max(options.resilience ?? 0.3, 0), 1);
    this.influence = Math.min(Math.max(options.influence ?? 1, 0), 10);
  }

  getMood(): number {
    return this.mood;
  }

  getResilience(): number {
    return this.resilience;
  }

  getInfluence(): number {
    return this.influence;
  }

  adjustMood(delta: number): number {
    const moderated = delta * (1 - this.resilience * 0.5);
    this.mood = Math.max(-10, Math.min(10, this.mood + moderated));
    return this.mood;
  }

  adjustResilience(delta: number): number {
    this.resilience = Math.max(0, Math.min(1, this.resilience + delta));
    return this.resilience;
  }

  adjustInfluence(delta: number): number {
    this.influence = Math.max(0, Math.min(10, this.influence + delta));
    return this.influence;
  }

  addRelationship(relationship: Relationship): void {
    this.relationships.set(relationship.targetId, relationship);
  }

  getRelationship(targetId: string): Relationship | undefined {
    return this.relationships.get(targetId);
  }

  getRelationships(): Relationship[] {
    return Array.from(this.relationships.values()).map((relationship) =>
      relationship.clone(),
    );
  }

  snapshot(): ActorSnapshot {
    return {
      id: this.id,
      name: this.name,
      traits: [...this.traits],
      mood: this.mood,
      resilience: this.resilience,
      influence: this.influence,
      relationships: this.getRelationships(),
    };
  }
}
