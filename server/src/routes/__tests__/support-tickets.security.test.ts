import express from 'express';
import request from 'supertest';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the service
jest.unstable_mockModule('../../services/support-tickets.js', () => ({
  getCommentById: jest.fn(),
  softDeleteComment: jest.fn(),
  restoreComment: jest.fn(),
  getComments: jest.fn(),
  listTickets: jest.fn(),
  getTicketCount: jest.fn(),
  createTicket: jest.fn(),
  getTicketById: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn(),
  addComment: jest.fn(),
}));

const {
  getCommentById,
  softDeleteComment,
  getTicketById,
  deleteTicket,
} = await import('../../services/support-tickets.js');
const supportRouter = (await import('../support-tickets.js')).default;

describe('Support Tickets Security', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/support', supportRouter);
  });

  describe('resolveActor - Header Spoofing', () => {
    it('blocks header-based identity spoofing', async () => {
      const mockComment = {
        id: 'comment-123',
        ticket_id: 'ticket-456',
        author_id: 'original-author',
        content: 'Hello'
      };
      (getCommentById as any).mockResolvedValue(mockComment);

      const response = await request(app)
        .post('/api/support/tickets/ticket-456/comments/comment-123/delete')
        .set('x-user-id', 'attacker-id')
        .set('x-user-role', 'admin')
        .send({ reason: 'spoofed' });

      expect(response.status).toBe(401); // actorId is missing because no req.user
      expect(softDeleteComment).not.toHaveBeenCalled();
    });
  });

  describe('Ownership and RBAC', () => {
    const regularUser = { id: 'user-1', role: 'user' };

    it('GET /tickets/:id - regular user cannot see others ticket', async () => {
      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        (req as any).user = regularUser;
        next();
      });
      mockApp.use('/api/support', supportRouter);

      (getTicketById as any).mockResolvedValue({ id: 't-1', reporter_id: 'other-user' });

      const response = await request(mockApp).get('/api/support/tickets/t-1');
      expect(response.status).toBe(403);
    });

    it('DELETE /tickets/:id - regular user cannot delete ANY ticket', async () => {
      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        (req as any).user = regularUser;
        next();
      });
      mockApp.use('/api/support', supportRouter);

      const response = await request(mockApp).delete('/api/support/tickets/t-1');
      expect(response.status).toBe(403);
      expect(deleteTicket).not.toHaveBeenCalled();
    });
  });
});
