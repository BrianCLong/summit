"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentManager = void 0;
// @ts-nocheck
const SecuriteyesService_js_1 = require("./SecuriteyesService.js");
const types_js_1 = require("../models/types.js");
const neo4j_js_1 = require("../../graph/neo4j.js");
class IncidentManager {
    static instance;
    securiteyes;
    constructor() {
        this.securiteyes = SecuriteyesService_js_1.SecuriteyesService.getInstance();
    }
    static getInstance() {
        if (!IncidentManager.instance) {
            IncidentManager.instance = new IncidentManager();
        }
        return IncidentManager.instance;
    }
    async createIncidentFromEvents(eventIds, tenantId, title, severity) {
        const incident = await this.securiteyes.createIncident({
            tenantId,
            title,
            severity,
            status: 'detected',
            summary: `Auto-generated incident from ${eventIds.length} events.`
        });
        // Link events to incident
        // PART_OF_INVESTIGATION is close, but maybe TRIGGERED_BY or similar
        // Let's use PART_OF_INVESTIGATION for now as it groups them
        for (const eid of eventIds) {
            await this.securiteyes.createRelationship(eid, incident.id, types_js_1.RELATIONSHIPS.PART_OF_INVESTIGATION);
        }
        return incident;
    }
    async updateStatus(incidentId, status, tenantId) {
        const query = `
            MATCH (n:${types_js_1.NODE_LABELS.INCIDENT} { id: $incidentId, tenantId: $tenantId })
            SET n.status = $status, n.updatedAt = datetime()
            ${status === 'recovered' ? 'SET n.resolvedAt = datetime()' : ''}
        `;
        await (0, neo4j_js_1.runCypher)(query, { incidentId, tenantId, status });
    }
    async generateEvidenceBundle(incidentId, tenantId) {
        // Collect all linked entities
        const query = `
            MATCH (i:${types_js_1.NODE_LABELS.INCIDENT} { id: $incidentId, tenantId: $tenantId })
            OPTIONAL MATCH (i)<-[:${types_js_1.RELATIONSHIPS.PART_OF_INVESTIGATION}]-(e)
            RETURN i, collect(e) as related_entities
        `;
        const result = await (0, neo4j_js_1.runCypher)(query, { incidentId, tenantId });
        if (result.length === 0)
            return null;
        const incident = result[0].i.properties;
        const related = result[0].related_entities.map((e) => e.properties);
        return {
            incident,
            evidence: related,
            generatedAt: new Date().toISOString()
        };
    }
}
exports.IncidentManager = IncidentManager;
