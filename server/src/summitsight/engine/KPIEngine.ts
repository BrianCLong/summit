import { SummitsightDataService } from '../SummitsightDataService';
import { KPIDefinition, KPIValue } from '../types';

export class KPIEngine {
  private dataService: SummitsightDataService;
  private static instance: KPIEngine;

  private constructor() {
    this.dataService = new SummitsightDataService();
  }

  public static getInstance(): KPIEngine {
    if (!KPIEngine.instance) {
      KPIEngine.instance = new KPIEngine();
    }
    return KPIEngine.instance;
  }

  /**
   * Retrieves the definition and latest value for a KPI.
   */
  async getKPIStatus(kpiId: string, tenantId?: string) {
    const defs = await this.dataService.getKPIDefinitions();
    const def = defs.find(d => d.kpi_id === kpiId);
    if (!def) throw new Error(`KPI ${kpiId} not found`);

    const values = await this.dataService.getKPIValues(kpiId, tenantId, 'daily', 1);
    const latest = values[0];

    return {
      definition: def,
      currentValue: latest ? Number(latest.value) : null,
      status: this.evaluateThreshold(def, latest ? Number(latest.value) : null),
      lastUpdated: latest ? latest.time_bucket : null
    };
  }

  private evaluateThreshold(def: KPIDefinition, value: number | null): 'green' | 'yellow' | 'red' | 'unknown' {
    if (value === null) return 'unknown';

    // Logic depends on direction
    const higherBetter = def.direction === 'higher_is_better';

    // Simple logic for now: if threshold exists
    if (def.threshold_red !== undefined && def.threshold_yellow !== undefined) {
        if (higherBetter) {
            if (value < def.threshold_red) return 'red';
            if (value < def.threshold_yellow) return 'yellow';
            return 'green';
        } else {
            if (value > def.threshold_red) return 'red';
            if (value > def.threshold_yellow) return 'yellow';
            return 'green';
        }
    }

    return 'green'; // Default
  }

  /**
   * Refreshes a specific KPI for a tenant for a specific day.
   * In a real system, this would be complex dynamic SQL generation or calling specific calculator functions.
   */
  async computeAndStoreKPI(kpiId: string, tenantId: string, date: string): Promise<void> {
    let value = 0;

    // ROUTING LOGIC for KPI Calculation
    switch (kpiId) {
        case 'eng.deployment_freq':
            value = await this.calculateDeploymentFreq(tenantId, date);
            break;
        case 'eng.change_fail_rate':
            value = await this.calculateChangeFailRate(tenantId, date);
            break;
        case 'sec.incident_rate':
            value = await this.calculateIncidentRate(tenantId, date);
            break;
        default:
            // For now, simulate random variation for demo purposes if not implemented
            value = Math.random() * 100;
    }

    const kpiValue: KPIValue = {
        kpi_id: kpiId,
        tenant_id: tenantId,
        time_bucket: date, // ISO Date string
        period: 'daily',
        value: value,
        dimension_filters: {}
    };

    await this.dataService.saveKPIValue(kpiValue);
  }

  // --- Specific Calculators ---

  private async calculateDeploymentFreq(tenantId: string, date: string): Promise<number> {
      return await this.dataService.aggregateDeploymentStats(tenantId, date);
  }

  private async calculateChangeFailRate(tenantId: string, date: string): Promise<number> {
      return await this.dataService.aggregateChangeFailStats(tenantId, date);
  }

  private async calculateIncidentRate(tenantId: string, date: string): Promise<number> {
      return await this.dataService.aggregateIncidentStats(tenantId, date);
  }
}
