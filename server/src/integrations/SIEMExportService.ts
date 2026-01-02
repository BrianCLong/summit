/**
 * SIEM Export Service
 *
 * Exports explainability data to SIEM systems (Splunk, Datadog, Elastic, etc.)
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { ExplainableRun } from '../explainability/types';

export type SIEMProvider = 'splunk' | 'datadog' | 'elastic' | 'sumologic' | 'custom';

export interface SIEMConfig {
  provider: SIEMProvider;
  endpoint: string;
  apiKey: string;
  sourceType?: string;
  index?: string;
  tags?: string[];
}

export interface SIEMExportResult {
  success: boolean;
  exported_count: number;
  provider: SIEMProvider;
  export_id: string;
  timestamp: string;
  errors?: string[];
}

/**
 * Service for exporting explainability data to SIEM systems.
 */
export class SIEMExportService {
  private static instance: SIEMExportService;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): SIEMExportService {
    if (!SIEMExportService.instance) {
      SIEMExportService.instance = new SIEMExportService();
    }
    return SIEMExportService.instance;
  }

  /**
   * Export runs to SIEM system.
   */
  async exportToSIEM(
    runs: ExplainableRun[],
    config: SIEMConfig
  ): Promise<SIEMExportResult> {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      switch (config.provider) {
        case 'splunk':
          return await this.exportToSplunk(runs, config, exportId, timestamp);
        case 'datadog':
          return await this.exportToDatadog(runs, config, exportId, timestamp);
        case 'elastic':
          return await this.exportToElastic(runs, config, exportId, timestamp);
        case 'sumologic':
          return await this.exportToSumoLogic(runs, config, exportId, timestamp);
        case 'custom':
          return await this.exportToCustom(runs, config, exportId, timestamp);
        default:
          throw new Error(`Unsupported SIEM provider: ${config.provider}`);
      }
    } catch (error: any) {
      logger.error({
        message: 'SIEM export failed',
        provider: config.provider,
        export_id: exportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        exported_count: 0,
        provider: config.provider,
        export_id: exportId,
        timestamp,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Export to Splunk HTTP Event Collector (HEC).
   */
  private async exportToSplunk(
    runs: ExplainableRun[],
    config: SIEMConfig,
    exportId: string,
    timestamp: string
  ): Promise<SIEMExportResult> {
    const events = runs.map((run) => ({
      time: new Date(run.started_at).getTime() / 1000, // Unix epoch
      source: config.sourceType || 'summit:explainability',
      sourcetype: '_json',
      index: config.index || 'main',
      event: this.transformRunForSIEM(run, config),
    }));

    try {
      const response = await fetch(`${config.endpoint}/services/collector/event`, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      });

      if (!response.ok) {
        throw new Error(`Splunk export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to Splunk',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'splunk',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`Splunk export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Export to Datadog Logs API.
   */
  private async exportToDatadog(
    runs: ExplainableRun[],
    config: SIEMConfig,
    exportId: string,
    timestamp: string
  ): Promise<SIEMExportResult> {
    const logs = runs.map((run) => ({
      ddsource: 'summit',
      ddtags: config.tags?.join(',') || 'explainability,audit',
      hostname: process.env.HOSTNAME || 'summit-server',
      service: 'summit-explainability',
      message: run.explanation.summary,
      ...this.transformRunForSIEM(run, config),
    }));

    try {
      const response = await fetch(`${config.endpoint}/api/v2/logs`, {
        method: 'POST',
        headers: {
          'DD-API-KEY': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });

      if (!response.ok) {
        throw new Error(`Datadog export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to Datadog',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'datadog',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`Datadog export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Export to Elasticsearch.
   */
  private async exportToElastic(
    runs: ExplainableRun[],
    config: SIEMConfig,
    exportId: string,
    timestamp: string
  ): Promise<SIEMExportResult> {
    const bulkBody: string[] = [];

    for (const run of runs) {
      // Index metadata
      bulkBody.push(
        JSON.stringify({
          index: {
            _index: config.index || 'summit-explainability',
            _id: run.run_id,
          },
        })
      );

      // Document
      bulkBody.push(JSON.stringify(this.transformRunForSIEM(run, config)));
    }

    const body = bulkBody.join('\n') + '\n';

    try {
      const response = await fetch(`${config.endpoint}/_bulk`, {
        method: 'POST',
        headers: {
          Authorization: `ApiKey ${config.apiKey}`,
          'Content-Type': 'application/x-ndjson',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Elasticsearch export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to Elasticsearch',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'elastic',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`Elasticsearch export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Export to Sumo Logic.
   */
  private async exportToSumoLogic(
    runs: ExplainableRun[],
    config: SIEMConfig,
    exportId: string,
    timestamp: string
  ): Promise<SIEMExportResult> {
    const logs = runs.map((run) => this.transformRunForSIEM(run, config));

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });

      if (!response.ok) {
        throw new Error(`Sumo Logic export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to Sumo Logic',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'sumologic',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`Sumo Logic export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Export to custom webhook endpoint.
   */
  private async exportToCustom(
    runs: ExplainableRun[],
    config: SIEMConfig,
    exportId: string,
    timestamp: string
  ): Promise<SIEMExportResult> {
    const payload = {
      export_id: exportId,
      timestamp,
      count: runs.length,
      runs: runs.map((run) => this.transformRunForSIEM(run, config)),
    };

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Custom export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to custom endpoint',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'custom',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`Custom export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Transform ExplainableRun to SIEM-friendly format.
   * Flattens nested structures for better indexing and search.
   */
  private transformRunForSIEM(run: ExplainableRun, config: SIEMConfig): any {
    return {
      // Identity
      run_id: run.run_id,
      run_type: run.run_type,
      tenant_id: run.tenant_id,

      // Actor
      actor_type: run.actor.actor_type,
      actor_id: run.actor.actor_id,
      actor_name: run.actor.actor_name,
      actor_role: run.actor.actor_role,

      // Temporal
      started_at: run.started_at,
      completed_at: run.completed_at,
      duration_ms: run.duration_ms,

      // Explanation
      explanation_summary: run.explanation.summary,
      explanation_why_triggered: run.explanation.why_triggered,
      explanation_why_this_approach: run.explanation.why_this_approach,

      // Confidence
      confidence_overall: run.confidence.overall_confidence,
      confidence_evidence_count: run.confidence.evidence_count,
      confidence_evidence_quality: run.confidence.evidence_quality,
      confidence_source_count: run.confidence.source_count,
      confidence_source_reliability: run.confidence.source_reliability,

      // Policy & Governance
      policy_decisions_count: run.policy_decisions.length,
      policy_decisions: run.policy_decisions.map((pd) => ({
        policy: pd.policy_name,
        decision: pd.decision,
        risk: pd.risk_level,
      })),
      capabilities_used: run.capabilities_used,

      // Provenance
      provenance_chain_id: run.provenance_links.provenance_chain_id,
      claims_count: run.provenance_links.claims.length,
      evidence_count: run.provenance_links.evidence.length,
      sources_count: run.provenance_links.sources.length,

      // Audit
      audit_events_count: run.audit_event_ids.length,

      // Redaction
      redacted_fields_count: run.redacted_fields.length,

      // Tags
      tags: config.tags || [],

      // Metadata
      version: run.version,
      export_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Batch export with automatic chunking.
   */
  async batchExport(
    runs: ExplainableRun[],
    config: SIEMConfig,
    chunkSize: number = 100
  ): Promise<SIEMExportResult> {
    const chunks: ExplainableRun[][] = [];
    for (let i = 0; i < runs.length; i += chunkSize) {
      chunks.push(runs.slice(i, i + chunkSize));
    }

    const results: SIEMExportResult[] = [];
    for (const chunk of chunks) {
      const result = await this.exportToSIEM(chunk, config);
      results.push(result);

      if (!result.success) {
        logger.warn({
          message: 'Chunk export failed, stopping batch',
          failed_chunk_size: chunk.length,
        });
        break;
      }

      // Rate limiting: wait between chunks
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const totalExported = results.reduce((sum, r) => sum + r.exported_count, 0);
    const allSuccess = results.every((r: any) => r.success);

    return {
      success: allSuccess,
      exported_count: totalExported,
      provider: config.provider,
      export_id: uuidv4(),
      timestamp: new Date().toISOString(),
      errors: results.flatMap((r: any) => r.errors || []),
    };
  }
}
