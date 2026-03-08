"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const support_tickets_js_1 = require("../src/services/support-tickets.js");
// Mock the postgres pool
globals_1.jest.mock('../src/db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: globals_1.jest.fn().mockResolvedValue({
            rows: [
                {
                    id: 'test-uuid',
                    title: 'Test Ticket',
                    description: 'Test description',
                    status: 'open',
                    priority: 'medium',
                    category: 'bug',
                    reporter_id: 'user-123',
                    reporter_email: 'test@example.com',
                    assignee_id: null,
                    tags: [],
                    metadata: {},
                    created_at: new Date(),
                    updated_at: new Date(),
                    resolved_at: null,
                    closed_at: null,
                },
            ],
            rowCount: 1,
        }),
    }),
}));
(0, globals_1.describe)('Support Tickets Service', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('createTicket', () => {
        (0, globals_1.it)('should create a ticket with required fields', async () => {
            const input = {
                title: 'Test Ticket',
                description: 'Test description',
                reporter_id: 'user-123',
            };
            const result = await (0, support_tickets_js_1.createTicket)(input);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.title).toBe('Test Ticket');
        });
    });
    (0, globals_1.describe)('getTicketById', () => {
        (0, globals_1.it)('should retrieve a ticket by id', async () => {
            const result = await (0, support_tickets_js_1.getTicketById)('test-uuid');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.id).toBe('test-uuid');
        });
    });
    (0, globals_1.describe)('listTickets', () => {
        (0, globals_1.it)('should list tickets with filters', async () => {
            const result = await (0, support_tickets_js_1.listTickets)({ status: 'open' });
            (0, globals_1.expect)(Array.isArray(result)).toBe(true);
        });
    });
    (0, globals_1.describe)('updateTicket', () => {
        (0, globals_1.it)('should update a ticket', async () => {
            const result = await (0, support_tickets_js_1.updateTicket)('test-uuid', { status: 'in_progress' });
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('deleteTicket', () => {
        (0, globals_1.it)('should delete a ticket', async () => {
            const result = await (0, support_tickets_js_1.deleteTicket)('test-uuid');
            (0, globals_1.expect)(result).toBe(true);
        });
    });
    (0, globals_1.describe)('comments', () => {
        (0, globals_1.it)('should add a comment', async () => {
            const result = await (0, support_tickets_js_1.addComment)('test-uuid', 'user-123', 'Test comment');
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should get comments for a ticket', async () => {
            const result = await (0, support_tickets_js_1.getComments)('test-uuid');
            (0, globals_1.expect)(Array.isArray(result)).toBe(true);
        });
    });
});
