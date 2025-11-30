/**
 * Missile System Tracking
 */

import {
  type MissileSystem,
  MissileType,
  type LaunchFacility,
  type ReentryVehicle,
  OperationalStatus
} from './types.js';

export class MissileTracker {
  private missiles: Map<string, MissileSystem>;
  private facilities: Map<string, LaunchFacility>;
  private reentryVehicles: Map<string, ReentryVehicle>;

  constructor() {
    this.missiles = new Map();
    this.facilities = new Map();
    this.reentryVehicles = new Map();
  }

  registerMissile(missile: MissileSystem): void {
    this.missiles.set(missile.id, missile);

    if (missile.missile_type === MissileType.BALLISTIC_ICBM) {
      console.warn(`ICBM system registered: ${missile.name} (${missile.country})`);
    }

    if (missile.range_km > 5500 && missile.mirv_capable) {
      console.warn(`MIRV-capable strategic missile: ${missile.name}`);
    }
  }

  registerFacility(facility: LaunchFacility): void {
    this.facilities.set(facility.id, facility);
  }

  registerReentryVehicle(rv: ReentryVehicle): void {
    this.reentryVehicles.set(rv.missile_system_id, rv);
  }

  getMissilesByCountry(country: string): MissileSystem[] {
    return Array.from(this.missiles.values()).filter(m => m.country === country);
  }

  getStrategicMissiles(country: string): MissileSystem[] {
    return this.getMissilesByCountry(country)
      .filter(m => m.classification === 'strategic' || m.range_km > 5500);
  }

  getMissilesByType(type: MissileType): MissileSystem[] {
    return Array.from(this.missiles.values()).filter(m => m.missile_type === type);
  }

  calculateStrikeRange(missileId: string, launchSiteId: string): {
    max_range_km: number;
    targets_in_range: string[];
  } {
    const missile = this.missiles.get(missileId);
    const facility = this.facilities.get(launchSiteId);

    if (!missile || !facility) {
      return { max_range_km: 0, targets_in_range: [] };
    }

    // In a real implementation, this would calculate actual geographic coverage
    return {
      max_range_km: missile.range_km,
      targets_in_range: []
    };
  }

  assessMIRVThreat(missileId: string): {
    is_mirv: boolean;
    warhead_count?: number;
    targets_per_launch: number;
  } {
    const missile = this.missiles.get(missileId);
    const rv = this.reentryVehicles.get(missileId);

    if (!missile) {
      return { is_mirv: false, targets_per_launch: 0 };
    }

    return {
      is_mirv: missile.mirv_capable,
      warhead_count: rv?.number_of_rvs,
      targets_per_launch: rv?.number_of_rvs || 1
    };
  }

  getMobileLaunchers(country: string): { mobile_systems: number; system_names: string[] } {
    const missiles = this.getMissilesByCountry(country).filter(m => m.mobile);

    return {
      mobile_systems: missiles.reduce((sum, m) => sum + m.estimated_inventory, 0),
      system_names: missiles.map(m => m.name)
    };
  }

  assessHypersonicCapability(country: string): {
    has_capability: boolean;
    systems: string[];
    threat_level: 'high' | 'medium' | 'low' | 'none';
  } {
    const hypersonics = this.getMissilesByCountry(country)
      .filter(m => m.missile_type === MissileType.HYPERSONIC_GLIDE ||
                   m.missile_type === MissileType.HYPERSONIC_CRUISE);

    const operational = hypersonics.filter(m =>
      m.operational_status === OperationalStatus.OPERATIONAL ||
      m.operational_status === OperationalStatus.DEPLOYED
    );

    let threat_level: 'high' | 'medium' | 'low' | 'none';
    if (operational.length > 5) {
      threat_level = 'high';
    } else if (operational.length > 0) {
      threat_level = 'medium';
    } else if (hypersonics.length > 0) {
      threat_level = 'low';
    } else {
      threat_level = 'none';
    }

    return {
      has_capability: hypersonics.length > 0,
      systems: hypersonics.map(m => m.name),
      threat_level
    };
  }
}
