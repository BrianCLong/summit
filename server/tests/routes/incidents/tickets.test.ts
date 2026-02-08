import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import ticketRouter from '../../../src/routes/incidents/tickets';
import { IncidentService } from '../../../src/services/IncidentService.js';
import { JiraAdapter } from '../../../src/integrations/jira/adapter.js';
import { eventService } from '../../../src/events/EventService.js';

jest.mock(new URL('../../../src/services/IncidentService.ts', import.meta.url).pathname);
jest.mock(new URL('../../../src/integrations/jira/adapter.ts', import.meta.url).pathname);
jest.mock(new URL('../../../src/events/EventService.ts', import.meta.url).pathname);

// Mock Auth Middleware
jest.mock(new URL('../../../src/middleware/auth.ts', import.meta.url).pathname, () => ({
    ensureAuthenticated: (req: any, res: any, next: any) => {
        req.user = { id: 'user-1', tenantId: 'tenant-1' };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use(ticketRouter);

const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('Ticket Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create ticket for incident', async () => {
        (IncidentService.get as any).mockResolvedValue({
            id: 'incident-1',
            title: 'Test',
            description: 'Desc',
            ticket_ref: null
        });

        (JiraAdapter.prototype.createTicket as any).mockResolvedValue({
            id: '100',
            key: 'PROJ-1',
            url: 'http://jira/browse/PROJ-1',
            title: 'Test',
            status: 'New',
            created_at: new Date(),
            updated_at: new Date(),
            external_id: '100'
        });

        (IncidentService.updateTicketRef as any).mockResolvedValue({
            id: 'incident-1',
            ticket_ref: { id: '100', key: 'PROJ-1' }
        });

        const res = await request(app).post('/incidents/incident-1/tickets');

        expect(res.status).toBe(200);
        expect(res.body.ticket).toEqual({ id: '100', key: 'PROJ-1' });
        expect(eventService.publish).toHaveBeenCalled();
    });
});
