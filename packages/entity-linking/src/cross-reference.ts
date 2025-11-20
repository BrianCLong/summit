/**
 * Cross-reference database for entity linking
 */

import type { CrossReferenceResult, Reference } from './types.js';

export class CrossReferenceDatabase {
  private references: Map<string, Reference[]>;

  constructor() {
    this.references = new Map();
  }

  /**
   * Add a reference to an entity
   */
  addReference(
    entity: string,
    source: string,
    entityId: string,
    attributes: Record<string, any>,
    confidence: number = 1.0
  ): void {
    const reference: Reference = {
      source,
      entityId,
      attributes,
      lastSeen: new Date(),
      confidence
    };

    const refs = this.references.get(entity) || [];
    refs.push(reference);
    this.references.set(entity, refs);
  }

  /**
   * Get all references for an entity
   */
  getReferences(entity: string): Reference[] {
    return this.references.get(entity) || [];
  }

  /**
   * Get cross-reference result for an entity
   */
  getCrossReference(entity: string): CrossReferenceResult | null {
    const references = this.getReferences(entity);

    if (references.length === 0) return null;

    const sources = new Set(references.map(r => r.source));
    const avgConfidence =
      references.reduce((sum, r) => sum + r.confidence, 0) / references.length;

    return {
      entity,
      references,
      totalSources: sources.size,
      confidence: avgConfidence
    };
  }

  /**
   * Find entities with references from multiple sources
   */
  findMultiSourceEntities(minSources: number = 2): CrossReferenceResult[] {
    const results: CrossReferenceResult[] = [];

    for (const entity of this.references.keys()) {
      const result = this.getCrossReference(entity);

      if (result && result.totalSources >= minSources) {
        results.push(result);
      }
    }

    return results.sort((a, b) => b.totalSources - a.totalSources);
  }

  /**
   * Find entities by attribute value
   */
  findByAttribute(
    attributeName: string,
    attributeValue: any
  ): CrossReferenceResult[] {
    const results: CrossReferenceResult[] = [];

    for (const entity of this.references.keys()) {
      const refs = this.getReferences(entity);
      const matching = refs.filter(
        r =>
          r.attributes[attributeName] &&
          this.matchesValue(r.attributes[attributeName], attributeValue)
      );

      if (matching.length > 0) {
        const result = this.getCrossReference(entity);
        if (result) results.push(result);
      }
    }

    return results;
  }

  /**
   * Check if value matches
   */
  private matchesValue(value1: any, value2: any): boolean {
    if (value1 === value2) return true;

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    return false;
  }

  /**
   * Merge references from two entities
   */
  mergeEntities(entity1: string, entity2: string): void {
    const refs1 = this.getReferences(entity1);
    const refs2 = this.getReferences(entity2);

    const merged = [...refs1, ...refs2];
    this.references.set(entity1, merged);
    this.references.delete(entity2);
  }

  /**
   * Update reference last seen timestamp
   */
  updateLastSeen(entity: string, source: string): void {
    const refs = this.getReferences(entity);

    for (const ref of refs) {
      if (ref.source === source) {
        ref.lastSeen = new Date();
      }
    }
  }

  /**
   * Get stale references (not seen in X days)
   */
  getStaleReferences(days: number = 90): Map<string, Reference[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const stale = new Map<string, Reference[]>();

    for (const [entity, refs] of this.references) {
      const staleRefs = refs.filter(r => r.lastSeen < cutoff);

      if (staleRefs.length > 0) {
        stale.set(entity, staleRefs);
      }
    }

    return stale;
  }

  /**
   * Remove stale references
   */
  removeStaleReferences(days: number = 90): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    let removedCount = 0;

    for (const [entity, refs] of this.references) {
      const fresh = refs.filter(r => r.lastSeen >= cutoff);
      removedCount += refs.length - fresh.length;

      if (fresh.length === 0) {
        this.references.delete(entity);
      } else {
        this.references.set(entity, fresh);
      }
    }

    return removedCount;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEntities: number;
    totalReferences: number;
    averageReferencesPerEntity: number;
    topSources: Array<{ source: string; count: number }>;
  } {
    let totalReferences = 0;
    const sourceCounts = new Map<string, number>();

    for (const refs of this.references.values()) {
      totalReferences += refs.length;

      for (const ref of refs) {
        sourceCounts.set(ref.source, (sourceCounts.get(ref.source) || 0) + 1);
      }
    }

    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntities: this.references.size,
      totalReferences,
      averageReferencesPerEntity: totalReferences / this.references.size || 0,
      topSources
    };
  }

  /**
   * Clear all references
   */
  clear(): void {
    this.references.clear();
  }
}
