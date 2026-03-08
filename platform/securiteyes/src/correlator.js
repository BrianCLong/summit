"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentCorrelator = void 0;
const crypto_1 = require("crypto");
const governance_kernel_1 = require("@intelgraph/governance-kernel");
class IncidentCorrelator {
    graphAdapter;
    constructor(graphAdapter) {
        this.graphAdapter = graphAdapter;
    }
    async correlate(events) {
        if (events.length === 0)
            return null;
        // Simple strategy: Group all incoming events into one incident for v1
        const severity = events.some(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
            ? 'HIGH'
            : 'MEDIUM';
        // Governance Check: Escalation
        const govDecision = (0, governance_kernel_1.evaluateGovernancePolicy)('defensive_security', {
            tenantId: 'system', // or derive from event
            action: 'CREATE_INCIDENT',
            resource: 'Incident',
            params: { eventCount: events.length }
        });
        if (govDecision.outcome === 'DENIED') {
            console.warn('Incident creation blocked by governance policy');
            return null;
        }
        const incident = {
            id: (0, crypto_1.randomUUID)(),
            title: `Security Incident: ${events[0].type}`,
            events,
            status: 'OPEN',
            severity,
            createdAt: new Date()
        };
        // Graph Ingest
        await this.graphAdapter.addNode({
            id: incident.id,
            label: 'Incident',
            properties: { title: incident.title, severity: incident.severity }
        });
        for (const event of events) {
            await this.graphAdapter.addEdge({
                id: (0, crypto_1.randomUUID)(),
                from: incident.id,
                to: event.id, // Assuming event is in graph? Or just link logically.
                type: 'LINKED_EVENT',
                properties: { relationship: 'CONTAINS' }
            });
        }
        return incident;
    }
}
exports.IncidentCorrelator = IncidentCorrelator;
