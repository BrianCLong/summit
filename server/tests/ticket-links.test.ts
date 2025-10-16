import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  addTicketRunLink,
  addTicketDeploymentLink,
  extractTicketFromPR,
  extractTicketFromMetadata,
  TicketIdentifier,
} from '../src/services/ticket-links.js';

// Mock the database connection
jest.mock('../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn(),
  })),
}));

describe('Ticket Linking Service', () => {
  let mockPool: any;

  beforeEach(() => {
    const { getPostgresPool } = require('../src/db/postgres.js');
    mockPool = {
      query: jest.fn(),
    };
    getPostgresPool.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addTicketRunLink', () => {
    it('should create a link between ticket and run', async () => {
      // Mock run exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'run-123' }] });
      // Mock ticket exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ticket-456' }] });
      // Mock insert
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const ticket: TicketIdentifier = {
        provider: 'github',
        externalId: '123',
      };

      await addTicketRunLink(ticket, 'run-123', { source: 'test' });

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id FROM runs WHERE id = $1',
        ['run-123'],
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id FROM tickets WHERE provider = $1 AND external_id = $2',
        ['github', '123'],
      );
    });

    it('should throw error if run does not exist', async () => {
      // Mock run does not exist
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const ticket: TicketIdentifier = {
        provider: 'github',
        externalId: '123',
      };

      await expect(
        addTicketRunLink(ticket, 'nonexistent-run', {}),
      ).rejects.toThrow('Run nonexistent-run not found');
    });

    it('should handle idempotent calls', async () => {
      // Mock run exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'run-123' }] });
      // Mock ticket exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ticket-456' }] });
      // Mock insert with conflict handling
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const ticket: TicketIdentifier = {
        provider: 'github',
        externalId: '123',
      };

      await addTicketRunLink(ticket, 'run-123', { source: 'test' });

      // Should not throw on duplicate call
      expect(() =>
        addTicketRunLink(ticket, 'run-123', { source: 'test' }),
      ).not.toThrow();
    });
  });

  describe('extractTicketFromPR', () => {
    it('should extract GitHub issue number from PR URL', () => {
      const result = extractTicketFromPR(
        'https://github.com/owner/repo/pull/123',
      );
      expect(result).toEqual({
        provider: 'github',
        externalId: '123',
      });
    });

    it('should extract GitHub issue from PR body', () => {
      const result = extractTicketFromPR(
        'https://github.com/owner/repo/pull/456',
        'This PR fixes #123',
      );
      expect(result).toEqual({
        provider: 'github',
        externalId: '123',
      });
    });

    it('should extract Jira ticket from PR body', () => {
      const result = extractTicketFromPR(
        'https://github.com/owner/repo/pull/456',
        'This PR implements PROJ-789 feature',
      );
      expect(result).toEqual({
        provider: 'jira',
        externalId: 'PROJ-789',
      });
    });

    it('should return null if no ticket found', () => {
      const result = extractTicketFromPR(
        'https://github.com/owner/repo/pull/456',
        'This PR has no ticket reference',
      );
      expect(result).toBeNull();
    });

    it('should handle multiple patterns and return first match', () => {
      const result = extractTicketFromPR(
        'https://github.com/owner/repo/pull/456',
        'This PR fixes #123 and relates to PROJ-789',
      );
      // Should prefer GitHub issue pattern
      expect(result).toEqual({
        provider: 'github',
        externalId: '123',
      });
    });
  });

  describe('extractTicketFromMetadata', () => {
    it('should extract direct ticket reference', () => {
      const metadata = {
        ticket: {
          provider: 'jira',
          external_id: 'PROJ-456',
        },
      };

      const result = extractTicketFromMetadata(metadata);
      expect(result).toEqual({
        provider: 'jira',
        externalId: 'PROJ-456',
      });
    });

    it('should extract from PR URL in metadata', () => {
      const metadata = {
        pr_url: 'https://github.com/owner/repo/pull/789',
        pr_body: 'Fixes #123',
      };

      const result = extractTicketFromMetadata(metadata);
      expect(result).toEqual({
        provider: 'github',
        externalId: '123',
      });
    });

    it('should extract from commit message', () => {
      const metadata = {
        commit_message: 'feat: implement PROJ-999 authentication',
      };

      const result = extractTicketFromMetadata(metadata);
      expect(result).toEqual({
        provider: 'jira',
        externalId: 'PROJ-999',
      });
    });

    it('should return null if no ticket information found', () => {
      const metadata = {
        random_field: 'no ticket here',
      };

      const result = extractTicketFromMetadata(metadata);
      expect(result).toBeNull();
    });
  });

  describe('addTicketDeploymentLink', () => {
    it('should create a link between ticket and deployment', async () => {
      // Mock deployment exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'deploy-789' }] });
      // Mock ticket exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ticket-456' }] });
      // Mock insert
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const ticket: TicketIdentifier = {
        provider: 'jira',
        externalId: 'PROJ-456',
      };

      await addTicketDeploymentLink(ticket, 'deploy-789', {
        environment: 'staging',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id FROM deployments WHERE id = $1',
        ['deploy-789'],
      );
    });

    it('should throw error if deployment does not exist', async () => {
      // Mock deployment does not exist
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const ticket: TicketIdentifier = {
        provider: 'jira',
        externalId: 'PROJ-456',
      };

      await expect(
        addTicketDeploymentLink(ticket, 'nonexistent-deploy', {}),
      ).rejects.toThrow('Deployment nonexistent-deploy not found');
    });
  });
});
