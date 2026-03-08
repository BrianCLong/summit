"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const IncidentService_js_1 = require("../../services/IncidentService.js");
const adapter_js_1 = require("../../integrations/jira/adapter.js");
const auth_js_1 = require("../../middleware/auth.js");
const EventService_js_1 = require("../../events/EventService.js");
const crypto_1 = require("crypto");
const http_param_js_1 = require("../../utils/http-param.js");
const router = express_1.default.Router();
// Mock config retrieval - in real app would come from DB/Secrets
const getJiraConfig = async (tenantId) => {
    // Stub
    return {
        baseUrl: process.env.JIRA_BASE_URL || 'https://jira.example.com',
        email: process.env.JIRA_EMAIL || 'user@example.com',
        apiToken: process.env.JIRA_API_TOKEN || 'token',
        projectKey: process.env.JIRA_PROJECT_KEY || 'PROJ'
    };
};
router.post('/incidents/:id/tickets', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
        const tenantId = req.user.tenantId;
        const incident = await IncidentService_js_1.IncidentService.get(tenantId, id);
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        if (incident.ticket_ref) {
            return res.status(400).json({ error: 'Ticket already exists', ticket: incident.ticket_ref });
        }
        const config = await getJiraConfig(tenantId);
        const jira = new adapter_js_1.JiraAdapter(config);
        // Create ticket in Jira
        const ticket = await jira.createTicket(incident);
        // Update incident
        const updatedIncident = await IncidentService_js_1.IncidentService.updateTicketRef(tenantId, id, {
            id: ticket.id,
            key: ticket.key,
            url: ticket.url
        });
        // Emit event
        await EventService_js_1.eventService.publish({
            event_id: (0, crypto_1.randomUUID)(),
            tenant_id: tenantId,
            type: 'incident.ticket_created',
            occurred_at: new Date().toISOString(),
            actor: { id: req.user.id, type: 'user' },
            resource_refs: [{ type: 'incident', id: incident.id }, { type: 'ticket', id: ticket.id }],
            payload: { ticket },
            schema_version: '1.0'
        });
        res.json({ message: 'Ticket created', ticket: updatedIncident?.ticket_ref });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
