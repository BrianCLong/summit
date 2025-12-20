/**
 * Reprocessing Plant Surveillance
 *
 * Monitors spent fuel reprocessing operations and plutonium production.
 */

import type { ReprocessingOperation, ConfidenceLevel } from './types.js';

export class ReprocessingSurveillance {
  private operations: Map<string, ReprocessingOperation[]>;
  private readonly SIGNIFICANT_QUANTITY_PU = 8; // kg of plutonium

  constructor() {
    this.operations = new Map();
  }

  recordOperation(operation: ReprocessingOperation): void {
    const existing = this.operations.get(operation.facility_id) || [];
    existing.push(operation);
    this.operations.set(operation.facility_id, existing);

    if (operation.plutonium_production &&
        operation.plutonium_production >= this.SIGNIFICANT_QUANTITY_PU) {
      console.warn(`Significant plutonium production at ${operation.facility_id}`);
    }
  }

  getOperations(facilityId: string): ReprocessingOperation[] {
    return this.operations.get(facilityId) || [];
  }

  estimateAnnualPlutoniumProduction(facilityId: string): number {
    const ops = this.getOperations(facilityId);
    if (ops.length === 0) return 0;

    const withProduction = ops.filter(o => o.plutonium_production);
    if (withProduction.length === 0) return 0;

    const avg = withProduction.reduce((sum, o) => sum + (o.plutonium_production || 0), 0) /
                withProduction.length;
    return avg;
  }

  assessReprocessingCapability(facilityId: string): {
    capability_level: 'advanced' | 'intermediate' | 'basic' | 'none';
    plutonium_per_year: number;
    hot_cell_operational: boolean;
  } {
    const ops = this.getOperations(facilityId);
    if (ops.length === 0) {
      return { capability_level: 'none', plutonium_per_year: 0, hot_cell_operational: false };
    }

    const latest = ops[ops.length - 1];
    const annualPu = this.estimateAnnualPlutoniumProduction(facilityId);

    let capability_level: 'advanced' | 'intermediate' | 'basic' | 'none';
    if (annualPu > 50) {
      capability_level = 'advanced';
    } else if (annualPu > 10) {
      capability_level = 'intermediate';
    } else if (annualPu > 0) {
      capability_level = 'basic';
    } else {
      capability_level = 'none';
    }

    return {
      capability_level,
      plutonium_per_year: annualPu,
      hot_cell_operational: latest.hot_cell_activity
    };
  }

  detectSuspiciousActivity(facilityId: string): string[] {
    const ops = this.getOperations(facilityId);
    const suspicious: string[] = [];

    ops.forEach(op => {
      if (op.hot_cell_activity && !op.chemical_processing) {
        suspicious.push('Hot cell active without declared chemical processing');
      }

      if (op.plutonium_production && op.plutonium_production > 100) {
        suspicious.push('Excessive plutonium production rate');
      }

      if (op.spent_fuel_inventory && op.throughput &&
          op.spent_fuel_inventory > op.throughput * 10) {
        suspicious.push('Large spent fuel inventory accumulation');
      }
    });

    return suspicious;
  }
}
