/**
 * Fighter Tracker
 * Tracks foreign fighters and returnees
 */

import type {
  ForeignFighter,
  ReturneeProfile,
  FighterNetwork,
  VeteranFighterNetwork,
  SkillsTransfer,
  BorderAlert,
  TrackingQuery,
  TrackingResult
} from './types.js';

export class FighterTracker {
  private fighters: Map<string, ForeignFighter> = new Map();
  private returnees: Map<string, ReturneeProfile> = new Map();
  private networks: Map<string, FighterNetwork> = new Map();
  private veteranNetworks: Map<string, VeteranFighterNetwork> = new Map();
  private skillsTransfers: SkillsTransfer[] = [];
  private borderAlerts: BorderAlert[] = [];

  /**
   * Track a foreign fighter
   */
  async trackFighter(fighter: ForeignFighter): Promise<void> {
    this.fighters.set(fighter.id, fighter);
  }

  /**
   * Register returnee profile
   */
  async registerReturnee(profile: ReturneeProfile): Promise<void> {
    this.returnees.set(profile.fighterId, profile);

    // Update fighter status
    const fighter = this.fighters.get(profile.fighterId);
    if (fighter) {
      fighter.status = 'RETURNED';
    }
  }

  /**
   * Track fighter network
   */
  async trackNetwork(network: FighterNetwork): Promise<void> {
    this.networks.set(network.id, network);
  }

  /**
   * Monitor veteran fighter network
   */
  async monitorVeteranNetwork(network: VeteranFighterNetwork): Promise<void> {
    const id = network.members.join('-');
    this.veteranNetworks.set(id, network);
  }

  /**
   * Record skills transfer
   */
  async recordSkillsTransfer(transfer: SkillsTransfer): Promise<void> {
    this.skillsTransfers.push(transfer);
  }

  /**
   * Register border alert
   */
  async registerBorderAlert(alert: BorderAlert): Promise<void> {
    this.borderAlerts.push(alert);

    // Update fighter journey
    const fighter = this.fighters.get(alert.fighterId);
    if (fighter && alert.detected) {
      // Update journey information based on alert type
    }
  }

  /**
   * Query fighters
   */
  async queryFighters(query: TrackingQuery): Promise<TrackingResult> {
    let filtered = Array.from(this.fighters.values());

    if (query.status && query.status.length > 0) {
      filtered = filtered.filter(f => query.status!.includes(f.status));
    }

    if (query.nationalities && query.nationalities.length > 0) {
      filtered = filtered.filter(f =>
        query.nationalities!.includes(f.personalInfo.nationality)
      );
    }

    if (query.threatLevels && query.threatLevels.length > 0) {
      filtered = filtered.filter(f => query.threatLevels!.includes(f.threatLevel));
    }

    if (query.conflictZones && query.conflictZones.length > 0) {
      filtered = filtered.filter(f =>
        query.conflictZones!.includes(f.combatExperience.conflictZone)
      );
    }

    if (query.returnees) {
      filtered = filtered.filter(f => f.status === 'RETURNED');
    }

    const returneeProfiles = filtered
      .filter(f => f.status === 'RETURNED')
      .map(f => this.returnees.get(f.id))
      .filter(Boolean) as ReturneeProfile[];

    return {
      fighters: filtered,
      totalCount: filtered.length,
      networks: Array.from(this.networks.values()),
      returnees: returneeProfiles,
      trends: this.calculateTrends(filtered)
    };
  }

  /**
   * Get fighter by ID
   */
  async getFighter(id: string): Promise<ForeignFighter | undefined> {
    return this.fighters.get(id);
  }

  /**
   * Get returnee profile
   */
  async getReturnee(fighterId: string): Promise<ReturneeProfile | undefined> {
    return this.returnees.get(fighterId);
  }

  /**
   * Get fighter's network
   */
  async getFighterNetwork(fighterId: string): Promise<FighterNetwork[]> {
    return Array.from(this.networks.values()).filter(network =>
      network.members.includes(fighterId)
    );
  }

  /**
   * Assess returnee risk
   */
  async assessReturneeRisk(fighterId: string): Promise<number> {
    const returnee = this.returnees.get(fighterId);
    if (!returnee) return 0;

    return returnee.riskAssessment.overallRisk;
  }

  /**
   * Identify high-risk returnees
   */
  async identifyHighRiskReturnees(): Promise<ReturneeProfile[]> {
    return Array.from(this.returnees.values()).filter(
      returnee => returnee.riskAssessment.overallRisk >= 0.7
    );
  }

  /**
   * Track fighter flows
   */
  async analyzeFighterFlows(): Promise<{
    outgoing: number;
    incoming: number;
    inConflictZone: number;
  }> {
    const fighters = Array.from(this.fighters.values());

    return {
      outgoing: fighters.filter(f => f.status === 'TRAVELING').length,
      incoming: fighters.filter(f => f.status === 'RETURNED').length,
      inConflictZone: fighters.filter(f => f.status === 'IN_CONFLICT_ZONE').length
    };
  }

  /**
   * Get border alerts for fighter
   */
  async getFighterAlerts(fighterId: string): Promise<BorderAlert[]> {
    return this.borderAlerts.filter(alert => alert.fighterId === fighterId);
  }

  /**
   * Private helper methods
   */

  private calculateTrends(fighters: ForeignFighter[]) {
    const returnees = fighters.filter(f => f.status === 'RETURNED').length;
    const active = fighters.filter(f => f.status === 'IN_CONFLICT_ZONE').length;

    return [
      {
        type: 'Foreign Fighters',
        direction: 'STABLE' as const,
        magnitude: fighters.length,
        period: '30-days',
        description: `${fighters.length} tracked fighters, ${returnees} returnees`
      }
    ];
  }
}
