import request from 'supertest';
import { createApp } from '../../src/app.js';
import { jest, describe, it, test, expect, beforeAll, afterAll } from '@jest/globals';

// Mock database and external dependencies
// Mock database and external dependencies
// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../../src/services/ticket-links.js', () => ({
  __esModule: true,
  addTicketRunLink: jest.fn(),
  extractTicketFromPR: jest.fn(),
  addTicketDeploymentLink: jest.fn(),
  linkTicketToRun: jest.fn(),
  linkTicketToDeployment: jest.fn(),
  extractTicketFromMetadata: jest.fn(),
  getTicketLinks: jest.fn(),
}));

const {
  addTicketRunLink,
  extractTicketFromPR,
  addTicketDeploymentLink,
} = await import('../../src/services/ticket-links.js');

// Mock postgres
jest.unstable_mockModule('../../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(),
  query: jest.fn(),
}));

const db = await import('../../src/db/postgres.js');

// Placeholder for createTestHarness if not imported
const createTestHarness = async () => {
  const app = await createApp();
  const server = app.listen(0);
  return { app, server };
};

describe('Ticket Linking Integration Flow', () => {
  let server: any;
  let app: any;
  let harness: any; // Added harness declaration

  beforeAll(async () => {
    // Disable webhook signature verification
    process.env.GITHUB_WEBHOOK_SECRET = '';
    process.env.JIRA_WEBHOOK_SECRET = '';
    process.env.LIFECYCLE_WEBHOOK_SECRET = '';

    harness = await createTestHarness();
    server = harness.server;
    app = harness.app;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('GitHub Webhook → Run Completion → TicketDetails Integration', () => {
    it('should link ticket to run via webhook and show in TicketDetails', async () => {
      // Import is now top-level
      // const ticketLinkService = require('../../src/services/ticket-links.js');

      // Mock the linking service
      jest.mocked(addTicketRunLink).mockResolvedValue(null);
      jest.mocked(extractTicketFromPR).mockReturnValue({
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

      const webhookResponse = await request(server)
        .post('/api/webhooks/github')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.status).toBe('processed');

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

      const lifecycleResponse = await request(server)
        .post('/api/webhooks/lifecycle')
        .send(lifecyclePayload)
        .expect(200);

      expect(lifecycleResponse.body.status).toBe('processed');

      // Step 3: Verify GraphQL query shows the linked run
      // Mock the database query for tickets
      // Use imported db
      // const db = require('../../src/db/postgres.js');
      const mockPool = {
        query: jest.fn(),
      };

      jest.mocked(db.getPostgresPool).mockReturnValue(mockPool as any);

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

      const graphqlResponse = await request(server)
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
      expect(ticket.provider).toBe('github');
      expect(ticket.externalId).toBe('123');
      expect(ticket.runs).toHaveLength(1);
      expect(ticket.runs[0].id).toBe('run-abc-123');

      // Verify linking service was called correctly
      expect(addTicketRunLink).toHaveBeenCalledWith(
        { provider: 'github', externalId: '123' },
        '12345678-1234-1234-1234-1234567890ab',
        expect.objectContaining({
          pr_url: 'https://github.com/owner/repo/pull/456',
        }),
      );
    });
  });

  describe('Jira Webhook → Deployment → TicketDetails Integration', () => {
    it('should link Jira ticket to deployment and show in UI', async () => {
      // const ticketLinkService = require('../../src/services/ticket-links.js');

      // Mock the linking service
      jest.mocked(addTicketDeploymentLink).mockResolvedValue(null);

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

      const jiraWebhookResponse = await request(server)
        .post('/api/webhooks/jira')
        .send(jiraWebhookPayload)
        .expect(200);

      expect(jiraWebhookResponse.body.status).toBe('processed');

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

      const deploymentResponse = await request(server)
        .post('/api/webhooks/lifecycle')
        .send(deploymentPayload)
        .expect(200);

      expect(deploymentResponse.body.status).toBe('processed');

      // Verify linking service was called correctly
      expect(addTicketDeploymentLink).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'jira', externalId: 'PROJ-789' }),
        '12345678-1234-1234-1234-1234567890ab',
        expect.objectContaining({
          issue_key: 'PROJ-789',
          issue_status: 'In Progress',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle webhook with invalid payload gracefully', async () => {
      const invalidPayload = {}; // Missing 'action' field to trigger validation error

      const response = await request(server)
        .post('/api/webhooks/github')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle lifecycle event for nonexistent run', async () => {
      // const ticketLinkService = require('../../src/services/ticket-links.js');

      // Mock service to throw error for nonexistent run
      jest.mocked(addTicketRunLink).mockRejectedValue(new Error('Run nonexistent-run not found'));

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
      const response = await request(server)
        .post('/api/webhooks/lifecycle')
        .send(payload)
        .expect(200);

      expect(response.body.status).toBe('processed');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook calls without errors', async () => {
      // const ticketLinkService = require('../../src/services/ticket-links.js');

      jest.mocked(addTicketRunLink).mockResolvedValue(null);
      jest.mocked(extractTicketFromPR).mockReturnValue({
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
      const response1 = await request(server)
        .post('/api/webhooks/github')
        .send(webhookPayload)
        .expect(200);

      const response2 = await request(server)
        .post('/api/webhooks/github')
        .send(webhookPayload)
        .expect(200);

      expect(response1.body.status).toBe('processed');
      expect(response2.body.status).toBe('processed');

      // Linking service should handle idempotency
      expect(addTicketRunLink).toHaveBeenCalledTimes(2);
    });
  });
});
