import express from 'express';
import { IncidentService } from '../../services/IncidentService.js';
import { JiraAdapter } from '../../integrations/jira/adapter.js';
import { ensureAuthenticated as requireAuth } from '../../middleware/auth.js';
import { eventService } from '../../events/EventService.js';
import { EventType } from '../../integrations/foundation/contracts.js';
import { randomUUID } from 'crypto';

const router = express.Router();
const singleParam = (value: unknown): string | undefined =>
    Array.isArray(value) ? (value[0] as string | undefined) : typeof value === 'string' ? value : undefined;

// Mock config retrieval - in real app would come from DB/Secrets
const getJiraConfig = async (tenantId: string) => {
    // Stub
    return {
        baseUrl: process.env.JIRA_BASE_URL || 'https://jira.example.com',
        email: process.env.JIRA_EMAIL || 'user@example.com',
        apiToken: process.env.JIRA_API_TOKEN || 'token',
        projectKey: process.env.JIRA_PROJECT_KEY || 'PROJ'
    };
};

router.post('/incidents/:id/tickets', requireAuth, async (req, res) => {
    try {
        const id = singleParam(req.params.id) ?? '';
        const tenantId = req.user!.tenantId!;

        const incident = await IncidentService.get(tenantId, id);
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        if (incident.ticket_ref) {
            return res.status(400).json({ error: 'Ticket already exists', ticket: incident.ticket_ref });
        }

        const config = await getJiraConfig(tenantId);
        const jira = new JiraAdapter(config);

        // Create ticket in Jira
        const ticket = await jira.createTicket(incident);

        // Update incident
        const updatedIncident = await IncidentService.updateTicketRef(tenantId, id, {
            id: ticket.id,
            key: ticket.key,
            url: ticket.url
        });

        // Emit event
        await eventService.publish({
            event_id: randomUUID(),
            tenant_id: tenantId,
            type: 'incident.ticket_created',
            occurred_at: new Date().toISOString(),
            actor: { id: req.user!.id, type: 'user' },
            resource_refs: [{ type: 'incident', id: incident.id }, { type: 'ticket', id: ticket.id }],
            payload: { ticket },
            schema_version: '1.0'
        });

        res.json({ message: 'Ticket created', ticket: updatedIncident?.ticket_ref });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
