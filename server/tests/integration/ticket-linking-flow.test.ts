import request from 'supertest';
import { createApp } from '../../src/app.js';

// Mock database and external dependencies
jest.mock('../../src/db/postgres.js');
jest.mock('../../src/services/ticket-links.js');

describe('Ticket Linking Integration Flow', () => {
  let server: any;
  let app: any;

  beforeAll(async () => {
    // Create and start test server
    app = await createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('GitHub Webhook → Run Completion → TicketDetails Integration', () => {
    it('should link ticket to run via webhook and show in TicketDetails', async () => {
      const ticketLinkService = require('../../src/services/ticket-links.js');

      // Mock the linking service
      ticketLinkService.addTicketRunLink = jest.fn().mockResolvedValue(null);
      ticketLinkService.extractTicketFromPR = jest.fn().mockReturnValue({
        provider: 'github',
        externalId: '123',
      });

      // Step 1: Simulate GitHub PR webhook with run ID in body
      const webhookPayload = {
        action: 'closed',
        pull_request: {
          number: 456,
          title: 'Fix authentication bug',
          body: 'This PR fixes #123 and relates to runId: run-abc-123',
          html_url: 'https://github.com/owner/repo/pull/456',
          user: { login: 'developer' },
          merged: true,
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
      const db = require('../../src/db/postgres.js');
      const mockPool = {
        query: jest.fn(),
      };
      db.getPostgresPool.mockReturnValue(mockPool);

      // Mock ticket query result
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            provider: 'github',
            external_id: '123',
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
          tickets(provider: $provider, external_id: $id, limit: 1) {
            provider
            external_id
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
        .send({
          query: graphqlQuery,
          variables: {
            provider: 'github',
            id: '123',
          },
        })
        .expect(200);

      // Verify the response contains the linked run
      const ticket = graphqlResponse.body.data.tickets[0];
      expect(ticket.provider).toBe('github');
      expect(ticket.external_id).toBe('123');
      expect(ticket.runs).toHaveLength(1);
      expect(ticket.runs[0].id).toBe('run-abc-123');

      // Verify linking service was called correctly
      expect(ticketLinkService.addTicketRunLink).toHaveBeenCalledWith(
        { provider: 'github', externalId: '123' },
        'run-abc-123',
        expect.objectContaining({
          pr_url: 'https://github.com/owner/repo/pull/456',
          commit_sha: 'abc123def456',
        }),
      );
    });
  });

  describe('Jira Webhook → Deployment → TicketDetails Integration', () => {
    it('should link Jira ticket to deployment and show in UI', async () => {
      const ticketLinkService = require('../../src/services/ticket-links.js');

      // Mock the linking service
      ticketLinkService.addTicketDeploymentLink = jest
        .fn()
        .mockResolvedValue(null);

      // Step 1: Simulate Jira issue update webhook with deployment ID
      const jiraWebhookPayload = {
        webhookEvent: 'jira:issue_updated',
        issue: {
          key: 'PROJ-789',
          fields: {
            summary: 'Deploy new authentication service',
            description: 'Ready for deployment. deploymentId: deploy-xyz-789',
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
        id: 'deploy-xyz-789',
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

      // Verify linking service was called with correct parameters
      expect(ticketLinkService.addTicketDeploymentLink).toHaveBeenCalledWith(
        { provider: 'jira', externalId: 'PROJ-789' },
        'deploy-xyz-789',
        expect.objectContaining({
          environment: 'staging',
          version: 'v1.2.3',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle webhook with invalid payload gracefully', async () => {
      const invalidPayload = {
        action: 'invalid_action',
        // Missing required fields
      };

      const response = await request(server)
        .post('/api/webhooks/github')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle lifecycle event for nonexistent run', async () => {
      const ticketLinkService = require('../../src/services/ticket-links.js');

      // Mock service to throw error for nonexistent run
      ticketLinkService.addTicketRunLink = jest
        .fn()
        .mockRejectedValue(new Error('Run nonexistent-run not found'));

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
      const ticketLinkService = require('../../src/services/ticket-links.js');

      ticketLinkService.addTicketRunLink = jest.fn().mockResolvedValue(null);
      ticketLinkService.extractTicketFromPR = jest.fn().mockReturnValue({
        provider: 'github',
        externalId: '456',
      });

      const webhookPayload = {
        action: 'closed',
        pull_request: {
          number: 789,
          title: 'Feature implementation',
          body: 'Implements #456 with runId: run-duplicate-test',
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
      expect(ticketLinkService.addTicketRunLink).toHaveBeenCalledTimes(2);
    });
  });
});
