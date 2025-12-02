import { SummitsightDataService } from '../SummitsightDataService';
import { FactRun, FactTask, FactSecurity, FactOps } from '../types';

export class SummitsightETLService {
  private dataService: SummitsightDataService;
  private static instance: SummitsightETLService;

  private constructor() {
    this.dataService = new SummitsightDataService();
  }

  public static getInstance(): SummitsightETLService {
    if (!SummitsightETLService.instance) {
      SummitsightETLService.instance = new SummitsightETLService();
    }
    return SummitsightETLService.instance;
  }

  /**
   * Ingests a run event (streaming or batch).
   */
  async ingestRun(data: FactRun): Promise<void> {
    try {
      // Basic normalization or validation could happen here
      if (!data.tenant_id) throw new Error("Tenant ID required for ingestion");
      await this.dataService.recordRun(data);
    } catch (error) {
      console.error('Failed to ingest run:', error);
      // In prod, send to DLQ
    }
  }

  /**
   * Ingests a task event.
   */
  async ingestTask(data: FactTask): Promise<void> {
    try {
      await this.dataService.recordTask(data);
    } catch (error) {
      console.error('Failed to ingest task:', error);
    }
  }

  /**
   * Ingests a security event.
   */
  async ingestSecurityEvent(data: FactSecurity): Promise<void> {
    try {
      // Enrich with risk score if missing (simple heuristic)
      if (data.risk_score === undefined) {
        data.risk_score = this.calculateRiskScore(data.severity);
      }
      await this.dataService.recordSecurityEvent(data);
    } catch (error) {
      console.error('Failed to ingest security event:', error);
    }
  }

  /**
   * Ingests operational metrics (CI/CD, System).
   */
  async ingestOpsMetric(data: FactOps): Promise<void> {
    try {
      await this.dataService.recordOpsMetric(data);
    } catch (error) {
      console.error('Failed to ingest ops metric:', error);
    }
  }

  // --- Helpers ---

  private calculateRiskScore(severity: string): number {
    switch (severity) {
      case 'critical': return 100;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 10;
    }
  }

  /**
   * Batch job to aggregate daily stats (Simulated ETL Job).
   * In a real system, this would be triggered by pg-boss or cron.
   */
  async runDailyAggregation(tenantId: string, date: string): Promise<any> {
      // This is a placeholder for where we would call logic to roll up
      // 5-minute buckets into hourly/daily Facts if we had high-volume data.
      // For now, we rely on on-demand aggregation in the Metrics Engine.
      return { status: 'skipped', reason: 'using_on_demand_agg' };
  }
}
