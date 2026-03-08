/**
 * GRC Integration Service
 *
 * Integrates explainability data with GRC (Governance, Risk, Compliance) tools
 * such as ServiceNow, RSA Archer, LogicGate, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { ExplainableRun } from '../explainability/types.js';

export type GRCProvider = 'servicenow' | 'archer' | 'logicgate' | 'onspring' | 'custom';

export interface GRCConfig {
  provider: GRCProvider;
  endpoint: string;
  apiKey: string;
  username?: string;
  password?: string;
  instance?: string;
}

export interface GRCExportResult {
  success: boolean;
  exported_count: number;
  provider: GRCProvider;
  export_id: string;
  timestamp: string;
  ticket_ids?: string[];
  errors?: string[];
}

/**
 * Service for integrating explainability data with GRC systems.
 */
export class GRCIntegrationService {
  private static instance: GRCIntegrationService;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): GRCIntegrationService {
    if (!GRCIntegrationService.instance) {
      GRCIntegrationService.instance = new GRCIntegrationService();
    }
    return GRCIntegrationService.instance;
  }

  /**
   * Export runs to GRC system.
   */
  async exportToGRC(
    runs: ExplainableRun[],
    config: GRCConfig
  ): Promise<GRCExportResult> {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      switch (config.provider) {
        case 'servicenow':
          return await this.exportToServiceNow(runs, config, exportId, timestamp);
        case 'archer':
          return await this.exportToArcher(runs, config, exportId, timestamp);
        case 'logicgate':
          return await this.exportToLogicGate(runs, config, exportId, timestamp);
        case 'onspring':
          return await this.exportToOnspring(runs, config, exportId, timestamp);
        case 'custom':
          return await this.exportToCustomGRC(runs, config, exportId, timestamp);
        default:
          throw new Error(`Unsupported GRC provider: ${config.provider}`);
      }
    } catch (error: any) {
      logger.error({
        message: 'GRC export failed',
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
   * Export to ServiceNow as Incidents or Change Requests.
   */
  private async exportToServiceNow(
    runs: ExplainableRun[],
    config: GRCConfig,
    exportId: string,
    timestamp: string
  ): Promise<GRCExportResult> {
    const ticketIds: string[] = [];

    for (const run of runs) {
      const incident = {
        short_description: `Explainability Record: ${run.run_type} - ${run.run_id}`,
        description: this.buildServiceNowDescription(run),
        category: 'inquiry',
        subcategory: 'audit',
        impact: this.mapRiskToImpact(run),
        urgency: this.mapConfidenceToUrgency(run),
        assignment_group: 'compliance-team',
        caller_id: run.actor.actor_id,
        work_notes: JSON.stringify({
          run_id: run.run_id,
          confidence: run.confidence.overall_confidence,
          capabilities: run.capabilities_used,
          export_id: exportId,
        }),
      };

      try {
        const response = await fetch(
          `${config.endpoint}/api/now/table/incident`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${config.username}:${config.password}`
              ).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(incident),
          }
        );

        if (!response.ok) {
          throw new Error(`ServiceNow export failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.result?.sys_id) {
          ticketIds.push(result.result.sys_id);
        }
      } catch (error: any) {
        logger.warn({
          message: 'Failed to export run to ServiceNow',
          run_id: run.run_id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    logger.info({
      message: 'Exported to ServiceNow',
      export_id: exportId,
      ticket_count: ticketIds.length,
    });

    return {
      success: ticketIds.length > 0,
      exported_count: ticketIds.length,
      provider: 'servicenow',
      export_id: exportId,
      timestamp,
      ticket_ids: ticketIds,
    };
  }

  /**
   * Export to RSA Archer.
   */
  private async exportToArcher(
    runs: ExplainableRun[],
    config: GRCConfig,
    exportId: string,
    timestamp: string
  ): Promise<GRCExportResult> {
    // Archer uses SOAP/REST API for content creation
    const records = runs.map((run) => ({
      applicationId: config.instance, // Archer application ID
      content: {
        RunID: run.run_id,
        RunType: run.run_type,
        Actor: run.actor.actor_name,
        StartTime: run.started_at,
        Summary: run.explanation.summary,
        Confidence: run.confidence.overall_confidence,
        RiskLevel: this.determineRiskLevel(run),
        PolicyDecisions: JSON.stringify(run.policy_decisions),
        Capabilities: run.capabilities_used.join(', '),
        AuditEvents: run.audit_event_ids.length,
      },
    }));

    try {
      const response = await fetch(`${config.endpoint}/api/v2/content`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        throw new Error(`Archer export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to Archer',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'archer',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`Archer export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Export to LogicGate.
   */
  private async exportToLogicGate(
    runs: ExplainableRun[],
    config: GRCConfig,
    exportId: string,
    timestamp: string
  ): Promise<GRCExportResult> {
    const records = runs.map((run) => ({
      fields: {
        run_id: run.run_id,
        run_type: run.run_type,
        actor: run.actor.actor_name,
        started_at: run.started_at,
        explanation: run.explanation.summary,
        confidence: run.confidence.overall_confidence,
        risk_level: this.determineRiskLevel(run),
      },
    }));

    try {
      const response = await fetch(`${config.endpoint}/api/v1/records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        throw new Error(`LogicGate export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to LogicGate',
        export_id: exportId,
        count: runs.length,
      });

      return {
        success: true,
        exported_count: runs.length,
        provider: 'logicgate',
        export_id: exportId,
        timestamp,
      };
    } catch (error: any) {
      throw new Error(`LogicGate export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Export to Onspring.
   */
  private async exportToOnspring(
    runs: ExplainableRun[],
    config: GRCConfig,
    exportId: string,
    timestamp: string
  ): Promise<GRCExportResult> {
    const appId = config.instance; // Onspring app ID

    for (const run of runs) {
      const record = {
        appId,
        fields: [
          { fieldId: 1, value: run.run_id },
          { fieldId: 2, value: run.run_type },
          { fieldId: 3, value: run.actor.actor_name },
          { fieldId: 4, value: run.started_at },
          { fieldId: 5, value: run.explanation.summary },
          { fieldId: 6, value: run.confidence.overall_confidence },
        ],
      };

      try {
        await fetch(`${config.endpoint}/Records`, {
          method: 'POST',
          headers: {
            'X-ApiKey': config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });
      } catch (error: any) {
        logger.warn({
          message: 'Failed to export run to Onspring',
          run_id: run.run_id,
        });
      }
    }

    logger.info({
      message: 'Exported to Onspring',
      export_id: exportId,
      count: runs.length,
    });

    return {
      success: true,
      exported_count: runs.length,
      provider: 'onspring',
      export_id: exportId,
      timestamp,
    };
  }

  /**
   * Export to custom GRC endpoint.
   */
  private async exportToCustomGRC(
    runs: ExplainableRun[],
    config: GRCConfig,
    exportId: string,
    timestamp: string
  ): Promise<GRCExportResult> {
    const payload = {
      export_id: exportId,
      timestamp,
      count: runs.length,
      runs: runs.map((run) => ({
        run_id: run.run_id,
        run_type: run.run_type,
        actor: run.actor.actor_name,
        confidence: run.confidence.overall_confidence,
        risk_level: this.determineRiskLevel(run),
        summary: run.explanation.summary,
      })),
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
        throw new Error(`Custom GRC export failed: ${response.statusText}`);
      }

      logger.info({
        message: 'Exported to custom GRC endpoint',
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
      throw new Error(`Custom GRC export error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Build ServiceNow incident description.
   */
  private buildServiceNowDescription(run: ExplainableRun): string {
    return `
Explainability Record

Run ID: ${run.run_id}
Type: ${run.run_type}
Actor: ${run.actor.actor_name} (${run.actor.actor_type})
Started: ${run.started_at}
Duration: ${run.duration_ms ? `${run.duration_ms}ms` : 'N/A'}

Explanation:
${run.explanation.summary}

Why Triggered: ${run.explanation.why_triggered}
Approach: ${run.explanation.why_this_approach}

Confidence: ${(run.confidence.overall_confidence * 100).toFixed(0)}%
Evidence Count: ${run.confidence.evidence_count}
Source Reliability: ${run.confidence.source_reliability}

Capabilities Used: ${run.capabilities_used.join(', ')}

Policy Decisions:
${run.policy_decisions
  .map(
    (pd) =>
      `- ${pd.policy_name}: ${pd.decision} (Risk: ${pd.risk_level})\n  Rationale: ${pd.rationale}`
  )
  .join('\n')}

Audit Events: ${run.audit_event_ids.length}
Provenance Chain: ${run.provenance_links.provenance_chain_id || 'N/A'}
    `.trim();
  }

  /**
   * Map run risk to ServiceNow impact.
   */
  private mapRiskToImpact(run: ExplainableRun): number {
    const maxRisk = Math.max(
      ...run.policy_decisions.map((pd) => this.riskLevelToNumber(pd.risk_level)),
      ...run.assumptions.map((a) => this.riskLevelToNumber(a.risk_if_false))
    );

    if (maxRisk >= 4) return 1; // Critical
    if (maxRisk >= 3) return 2; // High
    if (maxRisk >= 2) return 3; // Medium
    return 4; // Low
  }

  /**
   * Map confidence to ServiceNow urgency.
   */
  private mapConfidenceToUrgency(run: ExplainableRun): number {
    if (run.confidence.overall_confidence < 0.5) return 1; // Urgent
    if (run.confidence.overall_confidence < 0.8) return 2; // Medium
    return 3; // Low
  }

  /**
   * Determine overall risk level for run.
   */
  private determineRiskLevel(run: ExplainableRun): string {
    const maxRisk = Math.max(
      ...run.policy_decisions.map((pd) => this.riskLevelToNumber(pd.risk_level)),
      ...run.assumptions.map((a) => this.riskLevelToNumber(a.risk_if_false)),
      0
    );

    if (maxRisk >= 4) return 'Critical';
    if (maxRisk >= 3) return 'High';
    if (maxRisk >= 2) return 'Medium';
    return 'Low';
  }

  /**
   * Convert risk level string to number.
   */
  private riskLevelToNumber(risk: string): number {
    const riskMap: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return riskMap[risk.toLowerCase()] || 0;
  }
}
