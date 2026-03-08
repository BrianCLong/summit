"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../../src/app.js");
const globals_1 = require("@jest/globals");
// Mock database and external dependencies
// Mock database and external dependencies
// Use unstable_mockModule for ESM mocking
globals_1.jest.unstable_mockModule('../../src/services/ticket-links.js', () => ({
    __esModule: true,
    addTicketRunLink: globals_1.jest.fn(),
    extractTicketFromPR: globals_1.jest.fn(),
    addTicketDeploymentLink: globals_1.jest.fn(),
    linkTicketToRun: globals_1.jest.fn(),
    linkTicketToDeployment: globals_1.jest.fn(),
    extractTicketFromMetadata: globals_1.jest.fn(),
    getTicketLinks: globals_1.jest.fn(),
}));
const { addTicketRunLink, extractTicketFromPR, addTicketDeploymentLink, } = await Promise.resolve().then(() => __importStar(require('../../src/services/ticket-links.js')));
// Mock postgres
globals_1.jest.unstable_mockModule('../../src/db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(),
    query: globals_1.jest.fn(),
}));
const db = await Promise.resolve().then(() => __importStar(require('../../src/db/postgres.js')));
// Placeholder for createTestHarness if not imported
const createTestHarness = async () => {
    const app = await (0, app_js_1.createApp)();
    const server = app.listen(0);
    return { app, server };
};
(0, globals_1.describe)('Ticket Linking Integration Flow', () => {
    let server;
    let app;
    let harness; // Added harness declaration
    (0, globals_1.beforeAll)(async () => {
        // Disable webhook signature verification
        process.env.GITHUB_WEBHOOK_SECRET = '';
        process.env.JIRA_WEBHOOK_SECRET = '';
        process.env.LIFECYCLE_WEBHOOK_SECRET = '';
        harness = await createTestHarness();
        server = harness.server;
        app = harness.app;
    });
    (0, globals_1.afterAll)(async () => {
        if (server) {
            server.close();
        }
    });
    (0, globals_1.describe)('GitHub Webhook → Run Completion → TicketDetails Integration', () => {
        (0, globals_1.it)('should link ticket to run via webhook and show in TicketDetails', async () => {
            // Import is now top-level
            // const ticketLinkService = require('../../src/services/ticket-links.js');
            // Mock the linking service
            globals_1.jest.mocked(addTicketRunLink).mockResolvedValue(null);
            globals_1.jest.mocked(extractTicketFromPR).mockReturnValue({
                provider: 'github',
                externalId: '123',
            });
            // Step 1: Simulate GitHub PR webhook with run ID in body
            const webhookPayload = {
                action: 'closed',
                pull_request: {
                    number: 456,
                    title: 'Fix authentication bug',
                    body: 'This PR fixes #123 and relates to runId: 12345678-1234-1234-1234-1234567890ab',
                    html_url: 'https://github.com/owner/repo/pull/456',
                    user: { login: 'developer' },
                    merged: true,
                    head: {
                        sha: 'abc123def456',
                    },
                },
                repository: {
                    name: 'test-repo',
                    full_name: 'owner/test-repo',
                },
            };
            const webhookResponse = await (0, supertest_1.default)(server)
                .post('/api/webhooks/github')
                .send(webhookPayload)
                .expect(200);
            (0, globals_1.expect)(webhookResponse.body.status).toBe('processed');
            // Step 2: Simulate run completion event
            const lifecyclePayload = {
                event_type: 'run_completed',
                id: 'run-abc-123',
                metadata: {
                    ticket: {
                        provider: 'github',
                        external_id: '123',
                    },
                    pr_url: 'https://github.com/owner/repo/pull/456',
                    commit_sha: 'abc123def456',
                },
            };
            const lifecycleResponse = await (0, supertest_1.default)(server)
                .post('/api/webhooks/lifecycle')
                .send(lifecyclePayload)
                .expect(200);
            (0, globals_1.expect)(lifecycleResponse.body.status).toBe('processed');
            // Step 3: Verify GraphQL query shows the linked run
            // Mock the database query for tickets
            // Use imported db
            // const db = require('../../src/db/postgres.js');
            const mockPool = {
                query: globals_1.jest.fn(),
            };
            globals_1.jest.mocked(db.getPostgresPool).mockReturnValue(mockPool);
            // Mock ticket query result
            mockPool.query.mockResolvedValueOnce({
                rows: [
                    {
                        provider: 'github',
                        externalId: '123',
                        title: 'Authentication bug',
                        assignee: 'developer',
                        labels: ['bug', 'high-priority'],
                        project: null,
                        repo: 'owner/test-repo',
                    },
                ],
            });
            // Mock runs query result
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 'run-abc-123' }],
            });
            // Mock deployments query result
            mockPool.query.mockResolvedValueOnce({
                rows: [],
            });
            const graphqlQuery = `
        query($provider: String!, $id: String!) {
          tickets(provider: $provider, externalId: $id, limit: 1) {
            provider
            externalId
            title
            assignee
            labels
            project
            repo
            runs { id }
            deployments { id }
          }
        }
      `;
            const graphqlResponse = await (0, supertest_1.default)(server)
                .post('/graphql')
                .set('x-tenant-id', 'test-tenant')
                .set('Authorization', 'Bearer test-token')
                .send({
                query: graphqlQuery,
                variables: {
                    provider: 'github',
                    id: '123',
                },
            });
            if (graphqlResponse.status !== 200) {
                throw new Error(`GraphQL Error: ${JSON.stringify(graphqlResponse.body, null, 2)}`);
            }
            console.log('GraphQL Response Body:', JSON.stringify(graphqlResponse.body, null, 2));
            // Verify the response contains the linked run
            const ticket = graphqlResponse.body.data.tickets[0];
            (0, globals_1.expect)(ticket.provider).toBe('github');
            (0, globals_1.expect)(ticket.externalId).toBe('123');
            (0, globals_1.expect)(ticket.runs).toHaveLength(1);
            (0, globals_1.expect)(ticket.runs[0].id).toBe('run-abc-123');
            // Verify linking service was called correctly
            (0, globals_1.expect)(addTicketRunLink).toHaveBeenCalledWith({ provider: 'github', externalId: '123' }, '12345678-1234-1234-1234-1234567890ab', globals_1.expect.objectContaining({
                pr_url: 'https://github.com/owner/repo/pull/456',
            }));
        });
    });
    (0, globals_1.describe)('Jira Webhook → Deployment → TicketDetails Integration', () => {
        (0, globals_1.it)('should link Jira ticket to deployment and show in UI', async () => {
            // const ticketLinkService = require('../../src/services/ticket-links.js');
            // Mock the linking service
            globals_1.jest.mocked(addTicketDeploymentLink).mockResolvedValue(null);
            // Step 1: Simulate Jira issue update webhook with deployment ID
            const jiraWebhookPayload = {
                webhookEvent: 'jira:issue_updated',
                issue: {
                    key: 'PROJ-789',
                    fields: {
                        summary: 'Deploy new authentication service',
                        description: 'Ready for deployment. deploymentId: 12345678-1234-1234-1234-1234567890ab',
                        status: { name: 'In Progress' },
                        assignee: { displayName: 'DevOps Engineer' },
                        reporter: { displayName: 'Product Manager' },
                    },
                },
            };
            const jiraWebhookResponse = await (0, supertest_1.default)(server)
                .post('/api/webhooks/jira')
                .send(jiraWebhookPayload)
                .expect(200);
            (0, globals_1.expect)(jiraWebhookResponse.body.status).toBe('processed');
            // Step 2: Simulate deployment started event
            const deploymentPayload = {
                event_type: 'deployment_started',
                id: '12345678-1234-1234-1234-1234567890ab',
                metadata: {
                    ticket: {
                        provider: 'jira',
                        external_id: 'PROJ-789',
                    },
                    environment: 'staging',
                    version: 'v1.2.3',
                },
            };
            const deploymentResponse = await (0, supertest_1.default)(server)
                .post('/api/webhooks/lifecycle')
                .send(deploymentPayload)
                .expect(200);
            (0, globals_1.expect)(deploymentResponse.body.status).toBe('processed');
            // Verify linking service was called correctly
            (0, globals_1.expect)(addTicketDeploymentLink).toHaveBeenCalledWith(globals_1.expect.objectContaining({ provider: 'jira', externalId: 'PROJ-789' }), '12345678-1234-1234-1234-1234567890ab', globals_1.expect.objectContaining({
                issue_key: 'PROJ-789',
                issue_status: 'In Progress',
            }));
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle webhook with invalid payload gracefully', async () => {
            const invalidPayload = {}; // Missing 'action' field to trigger validation error
            const response = await (0, supertest_1.default)(server)
                .post('/api/webhooks/github')
                .send(invalidPayload)
                .expect(400);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
        });
        (0, globals_1.it)('should handle lifecycle event for nonexistent run', async () => {
            // const ticketLinkService = require('../../src/services/ticket-links.js');
            // Mock service to throw error for nonexistent run
            globals_1.jest.mocked(addTicketRunLink).mockRejectedValue(new Error('Run nonexistent-run not found'));
            const payload = {
                event_type: 'run_completed',
                id: 'nonexistent-run',
                metadata: {
                    ticket: {
                        provider: 'github',
                        external_id: '999',
                    },
                },
            };
            // Should still return 200 but handle error gracefully
            const response = await (0, supertest_1.default)(server)
                .post('/api/webhooks/lifecycle')
                .send(payload)
                .expect(200);
            (0, globals_1.expect)(response.body.status).toBe('processed');
        });
    });
    (0, globals_1.describe)('Idempotency', () => {
        (0, globals_1.it)('should handle duplicate webhook calls without errors', async () => {
            // const ticketLinkService = require('../../src/services/ticket-links.js');
            globals_1.jest.mocked(addTicketRunLink).mockResolvedValue(null);
            globals_1.jest.mocked(extractTicketFromPR).mockReturnValue({
                provider: 'github',
                externalId: '456',
            });
            const webhookPayload = {
                action: 'closed',
                pull_request: {
                    number: 789,
                    title: 'Feature implementation',
                    body: 'Implements #456 with runId: 12345678-1234-1234-1234-1234567890ab',
                    html_url: 'https://github.com/owner/repo/pull/789',
                    user: { login: 'developer' },
                },
                repository: {
                    name: 'test-repo',
                    full_name: 'owner/test-repo',
                },
            };
            // Send same webhook twice
            const response1 = await (0, supertest_1.default)(server)
                .post('/api/webhooks/github')
                .send(webhookPayload)
                .expect(200);
            const response2 = await (0, supertest_1.default)(server)
                .post('/api/webhooks/github')
                .send(webhookPayload)
                .expect(200);
            (0, globals_1.expect)(response1.body.status).toBe('processed');
            (0, globals_1.expect)(response2.body.status).toBe('processed');
            // Linking service should handle idempotency
            (0, globals_1.expect)(addTicketRunLink).toHaveBeenCalledTimes(2);
        });
    });
});
