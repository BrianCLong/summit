/**
 * Fuel Cycle Activity Tracking
 *
 * Tracks uranium mining, milling, conversion, and fuel fabrication activities.
 */

import type { FuelCycleActivity, TransportActivity } from './types.js';

export class FuelCycleTracker {
  private activities: Map<string, FuelCycleActivity[]>;
  private transports: TransportActivity[];

  constructor() {
    this.activities = new Map();
    this.transports = [];
  }

  recordActivity(activity: FuelCycleActivity): void {
    const existing = this.activities.get(activity.facility_id) || [];
    existing.push(activity);
    this.activities.set(activity.facility_id, existing);

    if (activity.transport_activity) {
      this.transports.push(...activity.transport_activity);
    }
  }

  getActivities(facilityId: string): FuelCycleActivity[] {
    return this.activities.get(facilityId) || [];
  }

  trackMaterialFlow(materialType: string): TransportActivity[] {
    return this.transports.filter(t => t.material_type === materialType);
  }

  estimateFuelCycleCapacity(country: string): {
    mining_capacity: number;
    conversion_capacity: number;
    fabrication_capacity: number;
    self_sufficient: boolean;
  } {
    // This would aggregate across facilities
    return {
      mining_capacity: 0,
      conversion_capacity: 0,
      fabrication_capacity: 0,
      self_sufficient: false
    };
  }
}
