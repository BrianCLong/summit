import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
  deleteTicket,
  addComment,
  getComments,
} from '../src/services/support-tickets.js';

// Mock the postgres pool
vi.mock('../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: vi.fn().mockResolvedValue({
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

describe('Support Tickets Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a ticket with required fields', async () => {
      const input = {
        title: 'Test Ticket',
        description: 'Test description',
        reporter_id: 'user-123',
      };

      const result = await createTicket(input);
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Ticket');
    });
  });

  describe('getTicketById', () => {
    it('should retrieve a ticket by id', async () => {
      const result = await getTicketById('test-uuid');
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-uuid');
    });
  });

  describe('listTickets', () => {
    it('should list tickets with filters', async () => {
      const result = await listTickets({ status: 'open' });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateTicket', () => {
    it('should update a ticket', async () => {
      const result = await updateTicket('test-uuid', { status: 'in_progress' });
      expect(result).toBeDefined();
    });
  });

  describe('deleteTicket', () => {
    it('should delete a ticket', async () => {
      const result = await deleteTicket('test-uuid');
      expect(result).toBe(true);
    });
  });

  describe('comments', () => {
    it('should add a comment', async () => {
      const result = await addComment('test-uuid', 'user-123', 'Test comment');
      expect(result).toBeDefined();
    });

    it('should get comments for a ticket', async () => {
      const result = await getComments('test-uuid');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
