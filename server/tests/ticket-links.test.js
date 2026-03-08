"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ticket_links_js_1 = require("../src/services/ticket-links.js");
// Mock the database connection
globals_1.jest.mock('../src/db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn(),
    })),
}));
(0, globals_1.describe)('Ticket Linking Service', () => {
    let mockPool;
    (0, globals_1.beforeEach)(() => {
        const { getPostgresPool } = require('../src/db/postgres.js');
        mockPool = {
            query: globals_1.jest.fn(),
        };
        getPostgresPool.mockReturnValue(mockPool);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('addTicketRunLink', () => {
        (0, globals_1.it)('should create a link between ticket and run', async () => {
            // Mock run exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'run-123' }] });
            // Mock ticket exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ticket-456' }] });
            // Mock insert
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const ticket = {
                provider: 'github',
                externalId: '123',
            };
            await (0, ticket_links_js_1.addTicketRunLink)(ticket, 'run-123', { source: 'test' });
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(3);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith('SELECT id FROM runs WHERE id = $1', ['run-123']);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith('SELECT id FROM tickets WHERE provider = $1 AND external_id = $2', ['github', '123']);
        });
        (0, globals_1.it)('should return null if run does not exist in test mode', async () => {
            // Mock run does not exist
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const ticket = {
                provider: 'github',
                externalId: '123',
            };
            await (0, globals_1.expect)((0, ticket_links_js_1.addTicketRunLink)(ticket, 'nonexistent-run', {})).resolves.toBeNull();
        });
        (0, globals_1.it)('should handle idempotent calls', async () => {
            // Mock run exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'run-123' }] });
            // Mock ticket exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ticket-456' }] });
            // Mock insert with conflict handling
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const ticket = {
                provider: 'github',
                externalId: '123',
            };
            await (0, ticket_links_js_1.addTicketRunLink)(ticket, 'run-123', { source: 'test' });
            // Should not throw on duplicate call
            (0, globals_1.expect)(() => (0, ticket_links_js_1.addTicketRunLink)(ticket, 'run-123', { source: 'test' })).not.toThrow();
        });
    });
    (0, globals_1.describe)('extractTicketFromPR', () => {
        (0, globals_1.it)('should return null when PR URL has no ticket reference', () => {
            const result = (0, ticket_links_js_1.extractTicketFromPR)('https://github.com/owner/repo/pull/123');
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should extract GitHub issue from PR body', () => {
            const result = (0, ticket_links_js_1.extractTicketFromPR)('https://github.com/owner/repo/pull/456', 'This PR fixes #123');
            (0, globals_1.expect)(result).toEqual({
                provider: 'github',
                externalId: '123',
            });
        });
        (0, globals_1.it)('should extract Jira ticket from PR body', () => {
            const result = (0, ticket_links_js_1.extractTicketFromPR)('https://github.com/owner/repo/pull/456', 'This PR implements PROJ-789 feature');
            (0, globals_1.expect)(result).toEqual({
                provider: 'jira',
                externalId: 'PROJ-789',
            });
        });
        (0, globals_1.it)('should return null if no ticket found', () => {
            const result = (0, ticket_links_js_1.extractTicketFromPR)('https://github.com/owner/repo/pull/456', 'This PR has no ticket reference');
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should handle multiple patterns and return first match', () => {
            const result = (0, ticket_links_js_1.extractTicketFromPR)('https://github.com/owner/repo/pull/456', 'This PR fixes #123 and relates to PROJ-789');
            // Should prefer GitHub issue pattern
            (0, globals_1.expect)(result).toEqual({
                provider: 'github',
                externalId: '123',
            });
        });
    });
    (0, globals_1.describe)('extractTicketFromMetadata', () => {
        (0, globals_1.it)('should extract direct ticket reference', () => {
            const metadata = {
                ticket: {
                    provider: 'jira',
                    external_id: 'PROJ-456',
                },
            };
            const result = (0, ticket_links_js_1.extractTicketFromMetadata)(metadata);
            (0, globals_1.expect)(result).toEqual({
                provider: 'jira',
                externalId: 'PROJ-456',
            });
        });
        (0, globals_1.it)('should extract from PR URL in metadata', () => {
            const metadata = {
                pr_url: 'https://github.com/owner/repo/pull/789',
                pr_body: 'Fixes #123',
            };
            const result = (0, ticket_links_js_1.extractTicketFromMetadata)(metadata);
            (0, globals_1.expect)(result).toEqual({
                provider: 'github',
                externalId: '123',
            });
        });
        (0, globals_1.it)('should extract from commit message', () => {
            const metadata = {
                commit_message: 'feat: implement PROJ-999 authentication',
            };
            const result = (0, ticket_links_js_1.extractTicketFromMetadata)(metadata);
            (0, globals_1.expect)(result).toEqual({
                provider: 'jira',
                externalId: 'PROJ-999',
            });
        });
        (0, globals_1.it)('should return null if no ticket information found', () => {
            const metadata = {
                random_field: 'no ticket here',
            };
            const result = (0, ticket_links_js_1.extractTicketFromMetadata)(metadata);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('addTicketDeploymentLink', () => {
        (0, globals_1.it)('should create a link between ticket and deployment', async () => {
            // Mock deployment exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'deploy-789' }] });
            // Mock ticket exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ticket-456' }] });
            // Mock insert
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const ticket = {
                provider: 'jira',
                externalId: 'PROJ-456',
            };
            await (0, ticket_links_js_1.addTicketDeploymentLink)(ticket, 'deploy-789', {
                environment: 'staging',
            });
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(3);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith('SELECT id FROM deployments WHERE id = $1', ['deploy-789']);
        });
        (0, globals_1.it)('should throw error if deployment does not exist', async () => {
            // Mock deployment does not exist
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            const ticket = {
                provider: 'jira',
                externalId: 'PROJ-456',
            };
            await (0, globals_1.expect)((0, ticket_links_js_1.addTicketDeploymentLink)(ticket, 'nonexistent-deploy', {})).rejects.toThrow('Deployment nonexistent-deploy not found');
        });
    });
});
