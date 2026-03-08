"use strict";
/**
 * GRC Integration Service
 *
 * Integrates explainability data with GRC (Governance, Risk, Compliance) tools
 * such as ServiceNow, RSA Archer, LogicGate, etc.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRCIntegrationService = void 0;
const uuid_1 = require("uuid");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Service for integrating explainability data with GRC systems.
 */
class GRCIntegrationService {
    static instance;
    constructor() {
        // Private constructor for singleton
    }
    static getInstance() {
        if (!GRCIntegrationService.instance) {
            GRCIntegrationService.instance = new GRCIntegrationService();
        }
        return GRCIntegrationService.instance;
    }
    /**
     * Export runs to GRC system.
     */
    async exportToGRC(runs, config) {
        const exportId = (0, uuid_1.v4)();
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
        }
        catch (error) {
            logger_js_1.default.error({
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
    async exportToServiceNow(runs, config, exportId, timestamp) {
        const ticketIds = [];
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
                const response = await fetch(`${config.endpoint}/api/now/table/incident`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(incident),
                });
                if (!response.ok) {
                    throw new Error(`ServiceNow export failed: ${response.statusText}`);
                }
                const result = await response.json();
                if (result.result?.sys_id) {
                    ticketIds.push(result.result.sys_id);
                }
            }
            catch (error) {
                logger_js_1.default.warn({
                    message: 'Failed to export run to ServiceNow',
                    run_id: run.run_id,
                    error: error instanceof Error ? error.message : 'Unknown',
                });
            }
        }
        logger_js_1.default.info({
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
    async exportToArcher(runs, config, exportId, timestamp) {
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
            logger_js_1.default.info({
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
        }
        catch (error) {
            throw new Error(`Archer export error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    /**
     * Export to LogicGate.
     */
    async exportToLogicGate(runs, config, exportId, timestamp) {
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
            logger_js_1.default.info({
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
        }
        catch (error) {
            throw new Error(`LogicGate export error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    /**
     * Export to Onspring.
     */
    async exportToOnspring(runs, config, exportId, timestamp) {
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
            }
            catch (error) {
                logger_js_1.default.warn({
                    message: 'Failed to export run to Onspring',
                    run_id: run.run_id,
                });
            }
        }
        logger_js_1.default.info({
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
    async exportToCustomGRC(runs, config, exportId, timestamp) {
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
            logger_js_1.default.info({
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
        }
        catch (error) {
            throw new Error(`Custom GRC export error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    /**
     * Build ServiceNow incident description.
     */
    buildServiceNowDescription(run) {
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
            .map((pd) => `- ${pd.policy_name}: ${pd.decision} (Risk: ${pd.risk_level})\n  Rationale: ${pd.rationale}`)
            .join('\n')}

Audit Events: ${run.audit_event_ids.length}
Provenance Chain: ${run.provenance_links.provenance_chain_id || 'N/A'}
    `.trim();
    }
    /**
     * Map run risk to ServiceNow impact.
     */
    mapRiskToImpact(run) {
        const maxRisk = Math.max(...run.policy_decisions.map((pd) => this.riskLevelToNumber(pd.risk_level)), ...run.assumptions.map((a) => this.riskLevelToNumber(a.risk_if_false)));
        if (maxRisk >= 4)
            return 1; // Critical
        if (maxRisk >= 3)
            return 2; // High
        if (maxRisk >= 2)
            return 3; // Medium
        return 4; // Low
    }
    /**
     * Map confidence to ServiceNow urgency.
     */
    mapConfidenceToUrgency(run) {
        if (run.confidence.overall_confidence < 0.5)
            return 1; // Urgent
        if (run.confidence.overall_confidence < 0.8)
            return 2; // Medium
        return 3; // Low
    }
    /**
     * Determine overall risk level for run.
     */
    determineRiskLevel(run) {
        const maxRisk = Math.max(...run.policy_decisions.map((pd) => this.riskLevelToNumber(pd.risk_level)), ...run.assumptions.map((a) => this.riskLevelToNumber(a.risk_if_false)), 0);
        if (maxRisk >= 4)
            return 'Critical';
        if (maxRisk >= 3)
            return 'High';
        if (maxRisk >= 2)
            return 'Medium';
        return 'Low';
    }
    /**
     * Convert risk level string to number.
     */
    riskLevelToNumber(risk) {
        const riskMap = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
        };
        return riskMap[risk.toLowerCase()] || 0;
    }
}
exports.GRCIntegrationService = GRCIntegrationService;
