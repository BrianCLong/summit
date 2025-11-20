/**
 * Sanctions Service
 * Real-time sanctions screening and monitoring service
 */

import { SanctionsScreener, PEPScreener, Entity, SanctionsMatch } from '@intelgraph/sanctions-screening';

export class SanctionsService {
  private screener: SanctionsScreener;
  private pepScreener: PEPScreener;
  private monitoredEntities: Map<string, Entity> = new Map();

  constructor() {
    this.screener = new SanctionsScreener();
    this.pepScreener = new PEPScreener();
    this.loadSanctionsLists();
  }

  /**
   * Screen an entity against all sanctions lists
   */
  async screenEntity(entity: Entity): Promise<SanctionsMatch[]> {
    return await this.screener.screenEntity(entity);
  }

  /**
   * Batch screen multiple entities
   */
  async screenBatch(entities: Entity[]): Promise<Map<string, SanctionsMatch[]>> {
    return await this.screener.screenBatch(entities);
  }

  /**
   * Check if entity is a PEP
   */
  async checkPEP(entity: Entity): Promise<boolean> {
    return await this.pepScreener.screenForPEP(entity);
  }

  /**
   * Add entity to ongoing monitoring
   */
  async addToMonitoring(entity: Entity): Promise<void> {
    this.monitoredEntities.set(entity.id, entity);
  }

  /**
   * Remove entity from monitoring
   */
  async removeFromMonitoring(entityId: string): Promise<void> {
    this.monitoredEntities.delete(entityId);
  }

  /**
   * Check all monitored entities against latest lists
   */
  async rescreenMonitoredEntities(): Promise<Map<string, SanctionsMatch[]>> {
    const entities = Array.from(this.monitoredEntities.values());
    return await this.screener.screenBatch(entities);
  }

  /**
   * Load sanctions lists from various sources
   */
  private loadSanctionsLists(): void {
    // Load OFAC SDN list
    this.screener.loadSanctionsList('OFAC_SDN', [
      {
        name: 'Example Sanctioned Entity',
        list: 'OFAC_SDN',
        program: 'IRAN',
        addedDate: new Date('2020-01-01'),
        identifiers: { id: '12345' },
      },
    ]);

    // Load UN Sanctions
    this.screener.loadSanctionsList('UN_SANCTIONS', []);

    // Load EU Sanctions
    this.screener.loadSanctionsList('EU_SANCTIONS', []);
  }

  /**
   * Update sanctions lists (should be called periodically)
   */
  async updateSanctionsLists(): Promise<void> {
    // Fetch latest lists from OFAC, UN, EU APIs
    // Update local cache
    this.loadSanctionsLists();
  }

  /**
   * Get statistics on screening activity
   */
  async getScreeningStats(): Promise<ScreeningStats> {
    return {
      totalScreenings: 0,
      matchesFound: 0,
      monitoredEntities: this.monitoredEntities.size,
      lastUpdate: new Date(),
    };
  }
}

export interface ScreeningStats {
  totalScreenings: number;
  matchesFound: number;
  monitoredEntities: number;
  lastUpdate: Date;
}

export default SanctionsService;
