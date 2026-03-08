"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionEngine = void 0;
// @ts-nocheck
const SecuriteyesService_js_1 = require("./SecuriteyesService.js");
const types_js_1 = require("../models/types.js");
const neo4j_js_1 = require("../../graph/neo4j.js");
class DetectionEngine {
    static instance;
    securiteyes;
    rules = [];
    constructor() {
        this.securiteyes = SecuriteyesService_js_1.SecuriteyesService.getInstance();
        this.registerDefaultRules();
    }
    getSecuriteyes() {
        return SecuriteyesService_js_1.SecuriteyesService.getInstance();
    }
    static getInstance() {
        if (!DetectionEngine.instance) {
            DetectionEngine.instance = new DetectionEngine();
        }
        return DetectionEngine.instance;
    }
    registerRule(rule) {
        this.rules.push(rule);
    }
    registerDefaultRules() {
        this.registerRule({
            id: 'AUTH_BRUTE_FORCE',
            description: 'Potential brute force attack detected',
            severity: 'high',
            condition: (event, history) => {
                if (event.eventType !== 'login_failed')
                    return false;
                const recentFailures = history.filter(h => h.eventType === 'login_failed' &&
                    h.details.ip === event.details.ip &&
                    new Date(h.timestamp).getTime() > new Date(event.timestamp).getTime() - 60000);
                return recentFailures.length >= 5;
            }
        });
        this.registerRule({
            id: 'DECEPTION_TRIGGER',
            description: 'Access to deception asset detected',
            severity: 'critical',
            condition: (event, _history) => {
                return event.eventType === 'deception_access';
            }
        });
    }
    async evaluateSignal(signal, tenantId) {
        let history = await this.getSecuriteyes().getRecentSuspiciousEvents(tenantId, 20);
        if (!history)
            history = [];
        for (const rule of this.rules) {
            if (rule.condition(signal, history)) {
                console.log(`[DetectionEngine] Rule Triggered: ${rule.id}`);
                const event = await this.getSecuriteyes().createSuspiciousEvent({
                    tenantId,
                    eventType: 'rule_match',
                    severity: rule.severity,
                    details: {
                        ruleId: rule.id,
                        description: rule.description,
                        triggerSignal: signal
                    },
                    sourceDetector: 'RuleBasedDetector',
                    timestamp: new Date().toISOString()
                });
                if (signal.ip) {
                    const indicator = await this.getSecuriteyes().createIndicator({
                        tenantId,
                        type: 'ip',
                        value: signal.ip,
                        source: 'internal_telemetry'
                    });
                    await this.getSecuriteyes().createRelationship(event.id, indicator.id, types_js_1.RELATIONSHIPS.INDICATES);
                }
                // If deception, link to the asset if ID provided
                if (rule.id === 'DECEPTION_TRIGGER' && signal.assetId) {
                    await this.getSecuriteyes().createRelationship(event.id, signal.assetId, types_js_1.RELATIONSHIPS.TRIGGERED_BY);
                }
            }
        }
    }
    async runGraphDetections(tenantId) {
        // Find clusters of SuspiciousEvents sharing an IP
        const query = `
            MATCH (e1:${types_js_1.NODE_LABELS.SUSPICIOUS_EVENT})-[:${types_js_1.RELATIONSHIPS.INDICATES}]->(i:${types_js_1.NODE_LABELS.INDICATOR})<-[:${types_js_1.RELATIONSHIPS.INDICATES}]-(e2:${types_js_1.NODE_LABELS.SUSPICIOUS_EVENT})
            WHERE e1.tenantId = $tenantId AND e1.id <> e2.id
            RETURN e1, i, e2
            LIMIT 10
        `;
        const matches = await (0, neo4j_js_1.runCypher)(query, { tenantId });
        if (matches.length > 0) {
            console.log(`[DetectionEngine] Found correlated suspicious events via graph: ${matches.length} matches`);
            // Create a Campaign
            const campaignName = `Auto-Campaign: Correlated Events via ${matches[0].i.properties.value}`;
            // Check if campaign already exists for this day/indicator to avoid dupes?
            // For MVP, just create one.
            const campaign = await this.getSecuriteyes().createCampaign({
                tenantId,
                name: campaignName,
                status: 'active',
                goal: 'Potential coordinated activity',
                timeline: 'detected via graph correlation'
            });
            // Link events to campaign
            for (const match of matches) {
                const e1Id = match.e1.properties.id;
                const e2Id = match.e2.properties.id;
                await this.getSecuriteyes().createRelationship(e1Id, campaign.id, types_js_1.RELATIONSHIPS.SUSPICIOUS_FOR);
                await this.getSecuriteyes().createRelationship(e2Id, campaign.id, types_js_1.RELATIONSHIPS.SUSPICIOUS_FOR);
            }
        }
    }
}
exports.DetectionEngine = DetectionEngine;
