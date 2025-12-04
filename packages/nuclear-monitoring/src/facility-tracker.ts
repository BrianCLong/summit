/**
 * Nuclear Facility Tracking System
 *
 * Tracks and monitors nuclear facilities worldwide including enrichment plants,
 * reactors, reprocessing facilities, and other nuclear infrastructure.
 */

import {
  type NuclearFacility,
  FacilityType,
  FacilityStatus,
  ConfidenceLevel,
  type GeoLocation,
  type MonitoringAlert
} from './types.js';

export class NuclearFacilityTracker {
  private facilities: Map<string, NuclearFacility>;
  private alertThresholds: Map<string, number>;

  constructor() {
    this.facilities = new Map();
    this.alertThresholds = new Map();
    this.initializeAlertThresholds();
  }

  private initializeAlertThresholds(): void {
    this.alertThresholds.set('undeclared_facility', 0.8);
    this.alertThresholds.set('safeguards_violation', 0.7);
    this.alertThresholds.set('construction_activity', 0.6);
  }

  /**
   * Register a new nuclear facility
   */
  registerFacility(facility: NuclearFacility): void {
    this.facilities.set(facility.id, facility);

    // Check for alerts
    if (!facility.declared && facility.confidence_level !== ConfidenceLevel.LOW) {
      this.generateAlert(facility, 'undeclared_facility');
    }

    if (!facility.iaea_safeguards && this.isSafeguardsRequired(facility)) {
      this.generateAlert(facility, 'no_safeguards');
    }
  }

  /**
   * Update facility information
   */
  updateFacility(facilityId: string, updates: Partial<NuclearFacility>): void {
    const facility = this.facilities.get(facilityId);
    if (!facility) {
      throw new Error(`Facility ${facilityId} not found`);
    }

    const updated = {
      ...facility,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.facilities.set(facilityId, updated);

    // Check for status changes that require alerts
    if (updates.status === FacilityStatus.OPERATIONAL &&
        facility.status !== FacilityStatus.OPERATIONAL) {
      this.generateAlert(updated, 'facility_operational');
    }
  }

  /**
   * Get facility by ID
   */
  getFacility(facilityId: string): NuclearFacility | undefined {
    return this.facilities.get(facilityId);
  }

  /**
   * Get all facilities by country
   */
  getFacilitiesByCountry(country: string): NuclearFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => f.country === country);
  }

  /**
   * Get facilities by type
   */
  getFacilitiesByType(type: FacilityType): NuclearFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => f.type === type);
  }

  /**
   * Search facilities by location radius
   */
  getFacilitiesNearLocation(
    location: GeoLocation,
    radiusKm: number
  ): NuclearFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => this.calculateDistance(location, f.location) <= radiusKm);
  }

  /**
   * Get undeclared facilities
   */
  getUndeclaredFacilities(): NuclearFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => !f.declared);
  }

  /**
   * Get facilities without IAEA safeguards
   */
  getFacilitiesWithoutSafeguards(): NuclearFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => !f.iaea_safeguards && this.isSafeguardsRequired(f));
  }

  /**
   * Get facilities by status
   */
  getFacilitiesByStatus(status: FacilityStatus): NuclearFacility[] {
    return Array.from(this.facilities.values())
      .filter(f => f.status === status);
  }

  /**
   * Get construction activity (new facilities under construction)
   */
  getConstructionActivity(): NuclearFacility[] {
    return this.getFacilitiesByStatus(FacilityStatus.UNDER_CONSTRUCTION);
  }

  /**
   * Calculate distance between two geolocations (Haversine formula)
   */
  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(loc1.latitude)) *
              Math.cos(this.toRad(loc2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if IAEA safeguards are required for facility type
   */
  private isSafeguardsRequired(facility: NuclearFacility): boolean {
    const safeguardsTypes = [
      FacilityType.ENRICHMENT_PLANT,
      FacilityType.CENTRIFUGE_FACILITY,
      FacilityType.REPROCESSING_PLANT,
      FacilityType.POWER_REACTOR,
      FacilityType.RESEARCH_REACTOR,
      FacilityType.FUEL_FABRICATION
    ];
    return safeguardsTypes.includes(facility.type);
  }

  /**
   * Generate monitoring alert
   */
  private generateAlert(facility: NuclearFacility, alertType: string): MonitoringAlert {
    const alert: MonitoringAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: this.determineAlertSeverity(alertType),
      alert_type: alertType,
      facility_id: facility.id,
      country: facility.country,
      description: this.getAlertDescription(facility, alertType),
      indicators: this.getAlertIndicators(facility, alertType),
      timestamp: new Date().toISOString(),
      requires_action: alertType === 'undeclared_facility' || alertType === 'safeguards_violation',
      recommended_actions: this.getRecommendedActions(alertType)
    };

    return alert;
  }

  private determineAlertSeverity(alertType: string): 'critical' | 'high' | 'medium' | 'low' {
    const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'undeclared_facility': 'critical',
      'safeguards_violation': 'critical',
      'no_safeguards': 'high',
      'facility_operational': 'medium',
      'construction_activity': 'medium'
    };
    return severityMap[alertType] || 'low';
  }

  private getAlertDescription(facility: NuclearFacility, alertType: string): string {
    const descriptions: Record<string, string> = {
      'undeclared_facility': `Undeclared ${facility.type} facility detected in ${facility.country}`,
      'safeguards_violation': `IAEA safeguards violation at ${facility.name}`,
      'no_safeguards': `Facility ${facility.name} lacks required IAEA safeguards`,
      'facility_operational': `Facility ${facility.name} became operational`,
      'construction_activity': `Construction activity detected at ${facility.name}`
    };
    return descriptions[alertType] || 'Unknown alert';
  }

  private getAlertIndicators(facility: NuclearFacility, alertType: string): string[] {
    return [
      `Facility: ${facility.name}`,
      `Type: ${facility.type}`,
      `Location: ${facility.location.latitude}, ${facility.location.longitude}`,
      `Status: ${facility.status}`,
      `Confidence: ${facility.confidence_level}`
    ];
  }

  private getRecommendedActions(alertType: string): string[] {
    const actions: Record<string, string[]> = {
      'undeclared_facility': [
        'Conduct satellite imagery analysis',
        'Request IAEA inspection',
        'Diplomatic engagement',
        'Enhanced monitoring'
      ],
      'safeguards_violation': [
        'Immediate IAEA notification',
        'Request emergency inspection',
        'Escalate to UN Security Council',
        'Increase surveillance'
      ],
      'no_safeguards': [
        'Engage with country authorities',
        'Encourage Additional Protocol adoption',
        'Technical assistance offer'
      ]
    };
    return actions[alertType] || [];
  }

  /**
   * Get statistics by country
   */
  getCountryStatistics(country: string): {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    safeguarded: number;
    declared: number;
  } {
    const facilities = this.getFacilitiesByCountry(country);

    const by_type: Record<string, number> = {};
    const by_status: Record<string, number> = {};

    facilities.forEach(f => {
      by_type[f.type] = (by_type[f.type] || 0) + 1;
      by_status[f.status] = (by_status[f.status] || 0) + 1;
    });

    return {
      total: facilities.length,
      by_type,
      by_status,
      safeguarded: facilities.filter(f => f.iaea_safeguards).length,
      declared: facilities.filter(f => f.declared).length
    };
  }
}
