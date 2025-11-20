import { v4 as uuidv4 } from 'uuid';
import {
  SourceProfile,
  SourceProfileSchema,
  SourceContact,
  SourceContactSchema,
  SourceNetwork,
  SourceNetworkSchema,
  CompensationRecord,
  CompensationRecordSchema,
  VettingRecord,
  VettingRecordSchema,
  SourceStatus,
  SourceReliability,
  VettingStatus
} from './types.js';

/**
 * Comprehensive HUMINT Source Database
 * Manages all source profiles, contacts, networks, and related data
 */
export class SourceDatabase {
  private sources: Map<string, SourceProfile> = new Map();
  private contacts: Map<string, SourceContact[]> = new Map();
  private networks: Map<string, SourceNetwork[]> = new Map();
  private compensation: Map<string, CompensationRecord[]> = new Map();
  private vetting: Map<string, VettingRecord[]> = new Map();

  /**
   * Create a new source profile
   */
  createSource(data: Omit<SourceProfile, 'id' | 'created' | 'updated'>): SourceProfile {
    const source: SourceProfile = {
      ...data,
      id: uuidv4(),
      created: new Date(),
      updated: new Date()
    };

    const validated = SourceProfileSchema.parse(source);
    this.sources.set(validated.id, validated);

    return validated;
  }

  /**
   * Update an existing source
   */
  updateSource(id: string, updates: Partial<SourceProfile>): SourceProfile {
    const source = this.sources.get(id);
    if (!source) {
      throw new Error(`Source not found: ${id}`);
    }

    const updated = {
      ...source,
      ...updates,
      id,
      updated: new Date()
    };

    const validated = SourceProfileSchema.parse(updated);
    this.sources.set(id, validated);

    return validated;
  }

  /**
   * Get source by ID
   */
  getSource(id: string): SourceProfile | undefined {
    return this.sources.get(id);
  }

  /**
   * Get source by codename
   */
  getSourceByCodename(codename: string): SourceProfile | undefined {
    return Array.from(this.sources.values()).find(s => s.codename === codename);
  }

  /**
   * Search sources by criteria
   */
  searchSources(criteria: Partial<SourceProfile>): SourceProfile[] {
    return Array.from(this.sources.values()).filter(source => {
      return Object.entries(criteria).every(([key, value]) => {
        return source[key as keyof SourceProfile] === value;
      });
    });
  }

  /**
   * Get sources by handler
   */
  getSourcesByHandler(handlerId: string): SourceProfile[] {
    return Array.from(this.sources.values()).filter(
      s => s.primaryHandler === handlerId || s.backupHandler === handlerId
    );
  }

  /**
   * Get sources by status
   */
  getSourcesByStatus(status: SourceStatus): SourceProfile[] {
    return Array.from(this.sources.values()).filter(s => s.status === status);
  }

  /**
   * Log a source contact
   */
  logContact(contact: Omit<SourceContact, 'id'>): SourceContact {
    const newContact: SourceContact = {
      ...contact,
      id: uuidv4()
    };

    const validated = SourceContactSchema.parse(newContact);

    const sourceContacts = this.contacts.get(contact.sourceId) || [];
    sourceContacts.push(validated);
    this.contacts.set(contact.sourceId, sourceContacts);

    // Update source last contact date and count
    const source = this.sources.get(contact.sourceId);
    if (source) {
      this.updateSource(contact.sourceId, {
        lastContactDate: contact.contactDate,
        totalContacts: (source.totalContacts || 0) + 1
      });
    }

    return validated;
  }

  /**
   * Get all contacts for a source
   */
  getSourceContacts(sourceId: string): SourceContact[] {
    return this.contacts.get(sourceId) || [];
  }

  /**
   * Get recent contacts across all sources
   */
  getRecentContacts(limit: number = 50): SourceContact[] {
    const allContacts = Array.from(this.contacts.values()).flat();
    return allContacts
      .sort((a, b) => b.contactDate.getTime() - a.contactDate.getTime())
      .slice(0, limit);
  }

  /**
   * Add source network relationship
   */
  addNetworkRelationship(network: Omit<SourceNetwork, 'id'>): SourceNetwork {
    const newNetwork: SourceNetwork = {
      ...network,
      id: uuidv4()
    };

    const validated = SourceNetworkSchema.parse(newNetwork);

    const sourceNetworks = this.networks.get(network.sourceId) || [];
    sourceNetworks.push(validated);
    this.networks.set(network.sourceId, sourceNetworks);

    // If bidirectional, add reverse relationship
    if (validated.bidirectional) {
      const reverseNetwork = {
        ...validated,
        id: uuidv4(),
        sourceId: validated.relatedSourceId,
        relatedSourceId: validated.sourceId
      };
      const relatedNetworks = this.networks.get(validated.relatedSourceId) || [];
      relatedNetworks.push(reverseNetwork);
      this.networks.set(validated.relatedSourceId, relatedNetworks);
    }

    return validated;
  }

  /**
   * Get source network
   */
  getSourceNetwork(sourceId: string): SourceNetwork[] {
    return this.networks.get(sourceId) || [];
  }

  /**
   * Record compensation payment
   */
  recordCompensation(record: Omit<CompensationRecord, 'id'>): CompensationRecord {
    const newRecord: CompensationRecord = {
      ...record,
      id: uuidv4()
    };

    const validated = CompensationRecordSchema.parse(newRecord);

    const sourceCompensation = this.compensation.get(record.sourceId) || [];
    sourceCompensation.push(validated);
    this.compensation.set(record.sourceId, sourceCompensation);

    // Update source total compensation
    const source = this.sources.get(record.sourceId);
    if (source) {
      this.updateSource(record.sourceId, {
        totalCompensation: source.totalCompensation + record.amount
      });
    }

    return validated;
  }

  /**
   * Get compensation records for a source
   */
  getSourceCompensation(sourceId: string): CompensationRecord[] {
    return this.compensation.get(sourceId) || [];
  }

  /**
   * Get total compensation for a source
   */
  getTotalCompensation(sourceId: string): number {
    const records = this.getSourceCompensation(sourceId);
    return records.reduce((sum, record) => sum + record.amount, 0);
  }

  /**
   * Add vetting record
   */
  addVettingRecord(record: Omit<VettingRecord, 'id'>): VettingRecord {
    const newRecord: VettingRecord = {
      ...record,
      id: uuidv4()
    };

    const validated = VettingRecordSchema.parse(newRecord);

    const sourceVetting = this.vetting.get(record.sourceId) || [];
    sourceVetting.push(validated);
    this.vetting.set(record.sourceId, sourceVetting);

    // Update source vetting status if it's a polygraph
    if (record.vettingType === 'POLYGRAPH') {
      const source = this.sources.get(record.sourceId);
      if (source) {
        this.updateSource(record.sourceId, {
          vettingStatus: record.result,
          vettingDate: record.date,
          polygraphDate: record.date,
          polygraphResult: record.result === VettingStatus.PASSED ? 'PASSED' :
                         record.result === VettingStatus.FAILED ? 'FAILED' : 'INCONCLUSIVE'
        });
      }
    }

    return validated;
  }

  /**
   * Get vetting records for a source
   */
  getSourceVetting(sourceId: string): VettingRecord[] {
    return this.vetting.get(sourceId) || [];
  }

  /**
   * Calculate source productivity score
   */
  calculateProductivityScore(sourceId: string): number {
    const source = this.sources.get(sourceId);
    if (!source) return 0;

    const contacts = this.getSourceContacts(sourceId);
    const avgIntelValue = contacts.length > 0
      ? contacts.reduce((sum, c) => sum + c.intelligenceValue, 0) / contacts.length
      : 0;

    const recentContacts = contacts.filter(
      c => c.contactDate.getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
    ).length;

    const reliabilityScore = this.getReliabilityScore(source.reliability);

    return Math.min(100, Math.round(
      (avgIntelValue * 10) +
      (recentContacts * 5) +
      (reliabilityScore * 2)
    ));
  }

  /**
   * Get numeric reliability score
   */
  private getReliabilityScore(reliability: SourceReliability): number {
    const scores: Record<SourceReliability, number> = {
      [SourceReliability.A]: 10,
      [SourceReliability.B]: 8,
      [SourceReliability.C]: 6,
      [SourceReliability.D]: 4,
      [SourceReliability.E]: 2,
      [SourceReliability.F]: 0
    };
    return scores[reliability];
  }

  /**
   * Get all sources
   */
  getAllSources(): SourceProfile[] {
    return Array.from(this.sources.values());
  }

  /**
   * Delete a source (soft delete by setting status)
   */
  terminateSource(id: string, reason: string): SourceProfile {
    return this.updateSource(id, {
      status: SourceStatus.TERMINATED,
      notes: `${this.sources.get(id)?.notes || ''}\nTerminated: ${reason}`
    });
  }

  /**
   * Mark source as compromised
   */
  markCompromised(id: string, details: string): SourceProfile {
    return this.updateSource(id, {
      status: SourceStatus.COMPROMISED,
      notes: `${this.sources.get(id)?.notes || ''}\nCOMPROMISED: ${details}`
    });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const sources = this.getAllSources();
    return {
      totalSources: sources.length,
      activeSource: sources.filter(s => s.status === SourceStatus.ACTIVE).length,
      inactiveSources: sources.filter(s => s.status === SourceStatus.INACTIVE).length,
      prospectSources: sources.filter(s => s.status === SourceStatus.PROSPECT).length,
      compromisedSources: sources.filter(s => s.status === SourceStatus.COMPROMISED).length,
      totalContacts: Array.from(this.contacts.values()).flat().length,
      totalCompensation: sources.reduce((sum, s) => sum + s.totalCompensation, 0),
      averageProductivity: sources.length > 0
        ? sources.reduce((sum, s) => sum + (s.productivityScore || 0), 0) / sources.length
        : 0
    };
  }
}
