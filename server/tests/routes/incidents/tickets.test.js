"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const tickets_1 = __importDefault(require("../../../src/routes/incidents/tickets"));
const IncidentService_1 = require("../../../src/services/IncidentService");
const adapter_1 = require("../../../src/integrations/jira/adapter");
const EventService_1 = require("../../../src/events/EventService");
globals_1.jest.mock('../../../src/services/IncidentService');
globals_1.jest.mock('../../../src/integrations/jira/adapter');
globals_1.jest.mock('../../../src/events/EventService');
// Mock Auth Middleware
globals_1.jest.mock('../../../src/middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => {
        req.user = { id: 'user-1', tenantId: 'tenant-1' };
        next();
    }
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(tickets_1.default);
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Ticket Routes', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should create ticket for incident', async () => {
        IncidentService_1.IncidentService.get.mockResolvedValue({
            id: 'incident-1',
            title: 'Test',
            description: 'Desc',
            ticket_ref: null
        });
        adapter_1.JiraAdapter.prototype.createTicket.mockResolvedValue({
            id: '100',
            key: 'PROJ-1',
            url: 'http://jira/browse/PROJ-1',
            title: 'Test',
            status: 'New',
            created_at: new Date(),
            updated_at: new Date(),
            external_id: '100'
        });
        IncidentService_1.IncidentService.updateTicketRef.mockResolvedValue({
            id: 'incident-1',
            ticket_ref: { id: '100', key: 'PROJ-1' }
        });
        const res = await (0, supertest_1.default)(app).post('/incidents/incident-1/tickets');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.ticket).toEqual({ id: '100', key: 'PROJ-1' });
        (0, globals_1.expect)(EventService_1.eventService.publish).toHaveBeenCalled();
    });
});
