/**
 * IoC Repository
 * Manages storage and retrieval of Indicators of Compromise
 */

import { IOC, IOCFilter, IOCSearchResult } from '@intelgraph/threat-intelligence';

export class IOCRepository {
  private iocs: Map<string, IOC> = new Map();

  /**
   * Upsert an IoC
   */
  async upsertIoC(ioc: IOC): Promise<IOC> {
    // Check if IoC already exists
    const existing = await this.findByValue(ioc.value, ioc.type);

    if (existing) {
      // Merge with existing IoC
      const merged = this.mergeIoCs(existing, ioc);
      this.iocs.set(merged.id, merged);
      return merged;
    } else {
      // Insert new IoC
      this.iocs.set(ioc.id, ioc);
      return ioc;
    }
  }

  /**
   * Find IoC by value and type
   */
  async findByValue(value: string, type: string): Promise<IOC | null> {
    for (const ioc of this.iocs.values()) {
      if (ioc.value === value && ioc.type === type) {
        return ioc;
      }
    }
    return null;
  }

  /**
   * Find IoC by ID
   */
  async findById(id: string): Promise<IOC | null> {
    return this.iocs.get(id) || null;
  }

  /**
   * Search IoCs
   */
  async searchIoCs(filter: IOCFilter): Promise<IOCSearchResult> {
    let results = Array.from(this.iocs.values());

    // Apply filters
    if (filter.types && filter.types.length > 0) {
      results = results.filter(ioc => filter.types!.includes(ioc.type));
    }

    if (filter.threatTypes && filter.threatTypes.length > 0) {
      results = results.filter(ioc =>
        ioc.threatType.some(tt => filter.threatTypes!.includes(tt))
      );
    }

    if (filter.severities && filter.severities.length > 0) {
      results = results.filter(ioc => filter.severities!.includes(ioc.severity));
    }

    if (filter.sources && filter.sources.length > 0) {
      results = results.filter(ioc => filter.sources!.includes(ioc.source));
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(ioc =>
        ioc.tags.some(tag => filter.tags!.includes(tag))
      );
    }

    if (filter.isActive !== undefined) {
      results = results.filter(ioc => ioc.isActive === filter.isActive);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(ioc =>
        ioc.value.toLowerCase().includes(search) ||
        ioc.description?.toLowerCase().includes(search) ||
        ioc.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Sort by last seen (most recent first)
    results.sort((a, b) =>
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    return {
      iocs: results.slice(0, 100), // Limit to 100 results
      total: results.length,
      page: 1,
      pageSize: 100,
      hasMore: results.length > 100,
    };
  }

  /**
   * Get IoC statistics
   */
  async getStatistics(): Promise<any> {
    const iocs = Array.from(this.iocs.values());

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const ioc of iocs) {
      byType[ioc.type] = (byType[ioc.type] || 0) + 1;
      bySeverity[ioc.severity] = (bySeverity[ioc.severity] || 0) + 1;
      bySource[ioc.source] = (bySource[ioc.source] || 0) + 1;
    }

    return {
      total: iocs.length,
      active: iocs.filter(ioc => ioc.isActive).length,
      byType,
      bySeverity,
      bySource,
      recentlyAdded: iocs.filter(ioc =>
        new Date(ioc.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length,
    };
  }

  /**
   * Merge two IoCs
   */
  private mergeIoCs(existing: IOC, incoming: IOC): IOC {
    return {
      ...existing,
      // Update last seen
      lastSeen: incoming.lastSeen > existing.lastSeen ? incoming.lastSeen : existing.lastSeen,

      // Merge tags
      tags: Array.from(new Set([...existing.tags, ...incoming.tags])),

      // Merge sources
      sources: [...existing.sources, ...incoming.sources],

      // Keep highest severity
      severity: this.compareSevirty(existing.severity, incoming.severity) > 0
        ? existing.severity
        : incoming.severity,

      // Merge threat types
      threatType: Array.from(new Set([...existing.threatType, ...incoming.threatType])),

      // Update enrichment if newer
      enrichment: incoming.enrichment.lastEnriched &&
        (!existing.enrichment.lastEnriched ||
          incoming.enrichment.lastEnriched > existing.enrichment.lastEnriched)
        ? incoming.enrichment
        : existing.enrichment,

      // Merge attribution if confidence is higher
      attribution: incoming.attribution.confidenceScore > existing.attribution.confidenceScore
        ? incoming.attribution
        : existing.attribution,

      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Compare severity levels
   */
  private compareSevirty(s1: string, s2: string): number {
    const levels: Record<string, number> = {
      'INFO': 1,
      'LOW': 2,
      'MEDIUM': 3,
      'HIGH': 4,
      'CRITICAL': 5,
    };
    return levels[s1] - levels[s2];
  }
}
