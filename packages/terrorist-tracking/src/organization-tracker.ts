/**
 * Organization Tracker
 * Core functionality for tracking terrorist organizations
 */

import type {
  TerroristOrganization,
  OrganizationLeadership,
  OrganizationFinancing,
  RecruitmentNetwork,
  TrainingFacility,
  SupplyNetwork,
  OrganizationTimeline,
  TrackingQuery,
  TrackingResult,
  ThreatIndicator
} from './types.js';

export class OrganizationTracker {
  private organizations: Map<string, TerroristOrganization> = new Map();
  private leadership: Map<string, OrganizationLeadership> = new Map();
  private financing: Map<string, OrganizationFinancing> = new Map();
  private recruitment: Map<string, RecruitmentNetwork> = new Map();
  private facilities: Map<string, TrainingFacility[]> = new Map();
  private supplies: Map<string, SupplyNetwork> = new Map();
  private timelines: Map<string, OrganizationTimeline> = new Map();

  /**
   * Track a new terrorist organization
   */
  async trackOrganization(organization: TerroristOrganization): Promise<void> {
    this.organizations.set(organization.id, organization);
  }

  /**
   * Update organization leadership structure
   */
  async updateLeadership(leadership: OrganizationLeadership): Promise<void> {
    this.leadership.set(leadership.organizationId, leadership);
  }

  /**
   * Track organization financing
   */
  async trackFinancing(financing: OrganizationFinancing): Promise<void> {
    this.financing.set(financing.organizationId, financing);
  }

  /**
   * Monitor recruitment networks
   */
  async monitorRecruitment(recruitment: RecruitmentNetwork): Promise<void> {
    this.recruitment.set(recruitment.organizationId, recruitment);
  }

  /**
   * Identify training facilities and safe houses
   */
  async identifyFacility(facility: TrainingFacility): Promise<void> {
    const existing = this.facilities.get(facility.organizationId) || [];
    existing.push(facility);
    this.facilities.set(facility.organizationId, existing);
  }

  /**
   * Track supply networks
   */
  async trackSupplyNetwork(supplyNetwork: SupplyNetwork): Promise<void> {
    this.supplies.set(supplyNetwork.organizationId, supplyNetwork);
  }

  /**
   * Update organization timeline
   */
  async updateTimeline(timeline: OrganizationTimeline): Promise<void> {
    this.timelines.set(timeline.organizationId, timeline);
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<TerroristOrganization | undefined> {
    return this.organizations.get(id);
  }

  /**
   * Query organizations based on criteria
   */
  async queryOrganizations(query: TrackingQuery): Promise<TrackingResult> {
    let filtered = Array.from(this.organizations.values());

    // Apply filters
    if (query.organizationIds && query.organizationIds.length > 0) {
      filtered = filtered.filter(org => query.organizationIds!.includes(org.id));
    }

    if (query.regions && query.regions.length > 0) {
      filtered = filtered.filter(org =>
        org.operatingRegions.some(region => query.regions!.includes(region))
      );
    }

    if (query.ideologies && query.ideologies.length > 0) {
      filtered = filtered.filter(org =>
        org.ideology.some(ideology => query.ideologies!.includes(ideology))
      );
    }

    if (query.status && query.status.length > 0) {
      filtered = filtered.filter(org => query.status!.includes(org.status));
    }

    // Generate threat indicators
    const threats = this.generateThreatIndicators(filtered);

    return {
      organizations: filtered,
      totalCount: filtered.length,
      threats,
      networkAnalysis: await this.analyzeNetwork(filtered)
    };
  }

  /**
   * Get organization affiliates and franchises
   */
  async getAffiliates(organizationId: string): Promise<TerroristOrganization[]> {
    const org = this.organizations.get(organizationId);
    if (!org) return [];

    return org.affiliates
      .map(id => this.organizations.get(id))
      .filter(Boolean) as TerroristOrganization[];
  }

  /**
   * Get organization hierarchy (parent and children)
   */
  async getHierarchy(organizationId: string): Promise<{
    parent?: TerroristOrganization;
    children: TerroristOrganization[];
    splinters: TerroristOrganization[];
  }> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      return { children: [], splinters: [] };
    }

    const parent = org.parentOrganization
      ? this.organizations.get(org.parentOrganization)
      : undefined;

    const children = Array.from(this.organizations.values()).filter(
      o => o.parentOrganization === organizationId && o.type !== 'SPLINTER'
    );

    const splinters = Array.from(this.organizations.values()).filter(
      o => o.parentOrganization === organizationId && o.type === 'SPLINTER'
    );

    return { parent, children, splinters };
  }

  /**
   * Get leadership structure for organization
   */
  async getLeadership(organizationId: string): Promise<OrganizationLeadership | undefined> {
    return this.leadership.get(organizationId);
  }

  /**
   * Get financing information
   */
  async getFinancing(organizationId: string): Promise<OrganizationFinancing | undefined> {
    return this.financing.get(organizationId);
  }

  /**
   * Get recruitment network
   */
  async getRecruitment(organizationId: string): Promise<RecruitmentNetwork | undefined> {
    return this.recruitment.get(organizationId);
  }

  /**
   * Get training facilities
   */
  async getFacilities(organizationId: string): Promise<TrainingFacility[]> {
    return this.facilities.get(organizationId) || [];
  }

  /**
   * Get supply network
   */
  async getSupplyNetwork(organizationId: string): Promise<SupplyNetwork | undefined> {
    return this.supplies.get(organizationId);
  }

  /**
   * Get organization timeline
   */
  async getTimeline(organizationId: string): Promise<OrganizationTimeline | undefined> {
    return this.timelines.get(organizationId);
  }

  /**
   * Generate threat indicators for organizations
   */
  private generateThreatIndicators(organizations: TerroristOrganization[]): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];

    for (const org of organizations) {
      // Active organization with recent activity
      if (org.status === 'ACTIVE') {
        indicators.push({
          organizationId: org.id,
          type: 'ACTIVE_ORGANIZATION',
          severity: 'HIGH',
          description: `${org.name} is actively operating`,
          detected: new Date(),
          confidence: 0.9
        });
      }

      // Growing organization
      if (org.affiliates.length > 5) {
        indicators.push({
          organizationId: org.id,
          type: 'EXPANDING_NETWORK',
          severity: 'HIGH',
          description: `${org.name} has extensive affiliate network`,
          detected: new Date(),
          confidence: 0.85
        });
      }

      // Multi-region operations
      if (org.operatingRegions.length > 3) {
        indicators.push({
          organizationId: org.id,
          type: 'TRANSNATIONAL_OPERATIONS',
          severity: 'CRITICAL',
          description: `${org.name} operates across multiple regions`,
          detected: new Date(),
          confidence: 0.95
        });
      }
    }

    return indicators;
  }

  /**
   * Analyze network connections between organizations
   */
  private async analyzeNetwork(organizations: TerroristOrganization[]) {
    // Network analysis would be implemented here
    // This is a placeholder for the actual implementation
    return undefined;
  }

  /**
   * Get comprehensive organization profile
   */
  async getOrganizationProfile(organizationId: string) {
    const [
      organization,
      leadership,
      financing,
      recruitment,
      facilities,
      supplies,
      timeline,
      hierarchy
    ] = await Promise.all([
      this.getOrganization(organizationId),
      this.getLeadership(organizationId),
      this.getFinancing(organizationId),
      this.getRecruitment(organizationId),
      this.getFacilities(organizationId),
      this.getSupplyNetwork(organizationId),
      this.getTimeline(organizationId),
      this.getHierarchy(organizationId)
    ]);

    return {
      organization,
      leadership,
      financing,
      recruitment,
      facilities,
      supplies,
      timeline,
      hierarchy
    };
  }
}
