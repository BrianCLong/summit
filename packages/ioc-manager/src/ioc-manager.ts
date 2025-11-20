import { IOC, IOCType, IOCStatus, IOCSearchQuery, IOCDeduplicationResult } from './types.js';

/**
 * IOC Manager
 * Manages indicators of compromise with deduplication and enrichment
 */
export class IOCManager {
  private iocs: Map<string, IOC> = new Map();
  private valueIndex: Map<string, Set<string>> = new Map(); // value -> IOC IDs

  /**
   * Add a new IOC
   */
  async addIOC(ioc: IOC): Promise<IOC> {
    // Check for duplicates
    const existing = this.findByValue(ioc.value, ioc.type);
    if (existing.length > 0) {
      // Merge with existing
      return this.mergeIOC(existing[0], ioc);
    }

    // Add to storage
    this.iocs.set(ioc.id, ioc);

    // Update index
    const key = this.getIndexKey(ioc.value, ioc.type);
    if (!this.valueIndex.has(key)) {
      this.valueIndex.set(key, new Set());
    }
    this.valueIndex.get(key)!.add(ioc.id);

    return ioc;
  }

  /**
   * Add multiple IOCs
   */
  async addBulk(iocs: IOC[]): Promise<{ added: number; merged: number; errors: number }> {
    let added = 0;
    let merged = 0;
    let errors = 0;

    for (const ioc of iocs) {
      try {
        const existing = this.findByValue(ioc.value, ioc.type);
        if (existing.length > 0) {
          await this.mergeIOC(existing[0], ioc);
          merged++;
        } else {
          await this.addIOC(ioc);
          added++;
        }
      } catch (error) {
        console.error(`Error adding IOC ${ioc.id}:`, error);
        errors++;
      }
    }

    return { added, merged, errors };
  }

  /**
   * Get IOC by ID
   */
  getIOC(id: string): IOC | undefined {
    return this.iocs.get(id);
  }

  /**
   * Update IOC
   */
  async updateIOC(id: string, updates: Partial<IOC>): Promise<IOC | undefined> {
    const ioc = this.iocs.get(id);
    if (!ioc) {
      return undefined;
    }

    const updated = {
      ...ioc,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.iocs.set(id, updated);
    return updated;
  }

  /**
   * Delete IOC
   */
  async deleteIOC(id: string): Promise<boolean> {
    const ioc = this.iocs.get(id);
    if (!ioc) {
      return false;
    }

    // Remove from index
    const key = this.getIndexKey(ioc.value, ioc.type);
    const ids = this.valueIndex.get(key);
    if (ids) {
      ids.delete(id);
      if (ids.size === 0) {
        this.valueIndex.delete(key);
      }
    }

    // Remove from storage
    return this.iocs.delete(id);
  }

  /**
   * Find IOCs by value
   */
  findByValue(value: string, type?: IOCType): IOC[] {
    if (type) {
      const key = this.getIndexKey(value, type);
      const ids = this.valueIndex.get(key);
      if (!ids) return [];

      return Array.from(ids)
        .map(id => this.iocs.get(id))
        .filter((ioc): ioc is IOC => ioc !== undefined);
    }

    // Search across all types
    const results: IOC[] = [];
    for (const ioc of this.iocs.values()) {
      if (ioc.value === value) {
        results.push(ioc);
      }
    }
    return results;
  }

  /**
   * Search IOCs
   */
  async search(query: IOCSearchQuery): Promise<{ iocs: IOC[]; total: number }> {
    let results = Array.from(this.iocs.values());

    // Apply filters
    if (query.query) {
      const q = query.query.toLowerCase();
      results = results.filter(ioc =>
        ioc.value.toLowerCase().includes(q) ||
        ioc.description?.toLowerCase().includes(q) ||
        ioc.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (query.types && query.types.length > 0) {
      results = results.filter(ioc => query.types!.includes(ioc.type));
    }

    if (query.statuses && query.statuses.length > 0) {
      results = results.filter(ioc => query.statuses!.includes(ioc.status));
    }

    if (query.severities && query.severities.length > 0) {
      results = results.filter(ioc => query.severities!.includes(ioc.severity));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(ioc =>
        query.tags!.some(tag => ioc.tags.includes(tag))
      );
    }

    if (query.minConfidence !== undefined) {
      results = results.filter(ioc => ioc.confidence >= query.minConfidence!);
    }

    if (query.startDate) {
      results = results.filter(ioc => ioc.firstSeen >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(ioc => ioc.lastSeen <= query.endDate!);
    }

    if (query.sources && query.sources.length > 0) {
      results = results.filter(ioc =>
        ioc.sources.some(source => query.sources!.includes(source.name))
      );
    }

    if (query.relatedThreats && query.relatedThreats.length > 0) {
      results = results.filter(ioc =>
        ioc.relatedThreats.some(threat => query.relatedThreats!.includes(threat))
      );
    }

    const total = results.length;

    // Apply pagination
    results = results.slice(query.offset, query.offset + query.limit);

    return { iocs: results, total };
  }

  /**
   * Merge two IOCs
   */
  private async mergeIOC(existing: IOC, newIoc: IOC): Promise<IOC> {
    // Merge sources
    const sources = [...existing.sources];
    for (const source of newIoc.sources) {
      if (!sources.some(s => s.name === source.name && s.url === source.url)) {
        sources.push(source);
      }
    }

    // Update confidence (weighted average)
    const totalConfidence = existing.confidence * existing.sources.length +
                          newIoc.confidence * newIoc.sources.length;
    const confidence = totalConfidence / sources.length;

    // Merge tags
    const tags = Array.from(new Set([...existing.tags, ...newIoc.tags]));

    // Merge categories
    const categories = Array.from(new Set([...existing.categories, ...newIoc.categories]));

    // Merge related entities
    const relatedIocs = Array.from(new Set([...existing.relatedIocs, ...newIoc.relatedIocs]));
    const relatedThreats = Array.from(new Set([...existing.relatedThreats, ...newIoc.relatedThreats]));
    const relatedCampaigns = Array.from(new Set([...existing.relatedCampaigns, ...newIoc.relatedCampaigns]));

    // Merge MITRE data
    const mitreTactics = Array.from(new Set([...existing.mitreTactics, ...newIoc.mitreTactics]));
    const mitreTechniques = Array.from(new Set([...existing.mitreTechniques, ...newIoc.mitreTechniques]));

    // Use higher severity
    const severityOrder = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const severity = severityOrder[newIoc.severity] > severityOrder[existing.severity]
      ? newIoc.severity
      : existing.severity;

    // Update enrichment
    const enrichment = {
      ...existing.enrichment,
      ...newIoc.enrichment,
    };

    const merged: IOC = {
      ...existing,
      severity,
      confidence,
      tags,
      categories,
      sources,
      relatedIocs,
      relatedThreats,
      relatedCampaigns,
      mitreTactics,
      mitreTechniques,
      enrichment,
      lastSeen: newIoc.lastSeen > existing.lastSeen ? newIoc.lastSeen : existing.lastSeen,
      updatedAt: new Date().toISOString(),
    };

    this.iocs.set(existing.id, merged);
    return merged;
  }

  /**
   * Deduplicate IOCs
   */
  async deduplicate(): Promise<IOCDeduplicationResult> {
    const totalProcessed = this.iocs.size;
    let duplicatesFound = 0;
    let merged = 0;

    const seen = new Map<string, IOC>();

    for (const ioc of this.iocs.values()) {
      const key = this.getIndexKey(ioc.value, ioc.type);
      const existing = seen.get(key);

      if (existing) {
        duplicatesFound++;
        await this.mergeIOC(existing, ioc);
        await this.deleteIOC(ioc.id);
        merged++;
      } else {
        seen.set(key, ioc);
      }
    }

    return {
      totalProcessed,
      duplicatesFound,
      uniqueIocs: this.iocs.size,
      merged,
      deduplicationMethod: 'EXACT',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mark IOC as false positive
   */
  async markFalsePositive(id: string, reason: string): Promise<IOC | undefined> {
    const ioc = this.iocs.get(id);
    if (!ioc) {
      return undefined;
    }

    const updated: IOC = {
      ...ioc,
      status: 'FALSE_POSITIVE',
      falsePositiveReports: ioc.falsePositiveReports + 1,
      falsePositiveReason: reason,
      updatedAt: new Date().toISOString(),
    };

    this.iocs.set(id, updated);
    return updated;
  }

  /**
   * Whitelist IOC
   */
  async whitelistIOC(id: string): Promise<IOC | undefined> {
    return this.updateIOC(id, {
      status: 'WHITELISTED',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Expire old IOCs
   */
  async expireOldIOCs(): Promise<number> {
    const now = new Date().toISOString();
    let expired = 0;

    for (const ioc of this.iocs.values()) {
      if (ioc.expiresAt && ioc.expiresAt < now && ioc.status === 'ACTIVE') {
        await this.updateIOC(ioc.id, {
          status: 'EXPIRED',
          updatedAt: now,
        });
        expired++;
      }
    }

    return expired;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      total: this.iocs.size,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };

    for (const ioc of this.iocs.values()) {
      // By type
      stats.byType[ioc.type] = (stats.byType[ioc.type] || 0) + 1;

      // By status
      stats.byStatus[ioc.status] = (stats.byStatus[ioc.status] || 0) + 1;

      // By severity
      stats.bySeverity[ioc.severity] = (stats.bySeverity[ioc.severity] || 0) + 1;
    }

    return stats;
  }

  /**
   * Helper: Get index key
   */
  private getIndexKey(value: string, type: IOCType): string {
    return `${type}:${this.normalizeValue(value, type)}`;
  }

  /**
   * Helper: Normalize IOC value
   */
  private normalizeValue(value: string, type: IOCType): string {
    switch (type) {
      case 'DOMAIN':
      case 'EMAIL_ADDRESS':
        return value.toLowerCase();

      case 'FILE_HASH_MD5':
      case 'FILE_HASH_SHA1':
      case 'FILE_HASH_SHA256':
        return value.toLowerCase();

      case 'URL':
        // Remove trailing slash
        return value.replace(/\/$/, '').toLowerCase();

      case 'IP_ADDRESS':
        // Already normalized
        return value;

      default:
        return value;
    }
  }

  /**
   * Export IOCs
   */
  async exportIOCs(format: 'JSON' | 'CSV' | 'STIX'): Promise<string> {
    const iocs = Array.from(this.iocs.values());

    switch (format) {
      case 'JSON':
        return JSON.stringify(iocs, null, 2);

      case 'CSV':
        return this.exportToCSV(iocs);

      case 'STIX':
        return this.exportToSTIX(iocs);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private exportToCSV(iocs: IOC[]): string {
    const headers = ['ID', 'Type', 'Value', 'Severity', 'Confidence', 'Status', 'First Seen', 'Last Seen', 'Tags'];
    const rows = iocs.map(ioc => [
      ioc.id,
      ioc.type,
      ioc.value,
      ioc.severity,
      ioc.confidence.toString(),
      ioc.status,
      ioc.firstSeen,
      ioc.lastSeen,
      ioc.tags.join(';'),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToSTIX(iocs: IOC[]): string {
    const stixBundle = {
      type: 'bundle',
      id: `bundle--${Date.now()}`,
      objects: iocs.map(ioc => ({
        type: 'indicator',
        spec_version: '2.1',
        id: ioc.id,
        created: ioc.createdAt,
        modified: ioc.updatedAt,
        name: ioc.value,
        description: ioc.description,
        pattern: `[${this.getStixPatternType(ioc.type)}:value = '${ioc.value}']`,
        pattern_type: 'stix',
        valid_from: ioc.firstSeen,
        valid_until: ioc.expiresAt,
        labels: ioc.tags,
        confidence: ioc.confidence,
      })),
    };

    return JSON.stringify(stixBundle, null, 2);
  }

  private getStixPatternType(type: IOCType): string {
    const mapping: Record<string, string> = {
      IP_ADDRESS: 'ipv4-addr',
      DOMAIN: 'domain-name',
      URL: 'url',
      FILE_HASH_MD5: 'file:hashes.MD5',
      FILE_HASH_SHA1: 'file:hashes.SHA-1',
      FILE_HASH_SHA256: 'file:hashes.SHA-256',
      EMAIL_ADDRESS: 'email-addr',
    };

    return mapping[type] || 'unknown';
  }

  /**
   * Get all IOCs
   */
  getAllIOCs(): IOC[] {
    return Array.from(this.iocs.values());
  }

  /**
   * Clear all IOCs
   */
  clear(): void {
    this.iocs.clear();
    this.valueIndex.clear();
  }
}
