import { SecuriteyesService } from './SecuriteyesService.js';
import { NODE_LABELS, RELATIONSHIPS, Incident, SuspiciousEvent } from '../models/types.js';
import { runCypher } from '../../graph/neo4j.js';

export class IncidentManager {
    private static instance: IncidentManager;
    private securiteyes: SecuriteyesService;

    private constructor() {
        this.securiteyes = SecuriteyesService.getInstance();
    }

    public static getInstance(): IncidentManager {
        if (!IncidentManager.instance) {
            IncidentManager.instance = new IncidentManager();
        }
        return IncidentManager.instance;
    }

    async createIncidentFromEvents(eventIds: string[], tenantId: string, title: string, severity: Incident['severity']): Promise<Incident> {
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
            await this.securiteyes.createRelationship(eid, incident.id, RELATIONSHIPS.PART_OF_INVESTIGATION);
        }

        return incident;
    }

    async updateStatus(incidentId: string, status: Incident['status'], tenantId: string): Promise<void> {
        const query = `
            MATCH (n:${NODE_LABELS.INCIDENT} { id: $incidentId, tenantId: $tenantId })
            SET n.status = $status, n.updatedAt = datetime()
            ${status === 'recovered' ? 'SET n.resolvedAt = datetime()' : ''}
        `;
        await runCypher(query, { incidentId, tenantId, status });
    }

    async generateEvidenceBundle(incidentId: string, tenantId: string): Promise<any> {
        // Collect all linked entities
        const query = `
            MATCH (i:${NODE_LABELS.INCIDENT} { id: $incidentId, tenantId: $tenantId })
            OPTIONAL MATCH (i)<-[:${RELATIONSHIPS.PART_OF_INVESTIGATION}]-(e)
            RETURN i, collect(e) as related_entities
        `;
        const result = await runCypher(query, { incidentId, tenantId });
        if (result.length === 0) return null;

        const incident = result[0].i.properties;
        const related = result[0].related_entities.map((e: any) => e.properties);

        return {
            incident,
            evidence: related,
            generatedAt: new Date().toISOString()
        };
    }
}
