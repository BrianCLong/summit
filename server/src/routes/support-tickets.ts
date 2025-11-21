import express from 'express';
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
  deleteTicket,
  addComment,
  getComments,
  getTicketCount,
  type CreateTicketInput,
  type UpdateTicketInput,
  type ListTicketsOptions,
} from '../services/support-tickets.js';

const router = express.Router();

/** POST /api/support/tickets - Create a new support ticket */
router.post('/tickets', express.json(), async (req, res) => {
  try {
    const user = (req as any).user;
    const input: CreateTicketInput = {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      category: req.body.category,
      reporter_id: user?.sub || user?.id || req.body.reporter_id || 'anonymous',
      reporter_email: user?.email || req.body.reporter_email,
      tags: req.body.tags,
      metadata: req.body.metadata,
    };

    if (!input.title || !input.description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const ticket = await createTicket(input);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/** GET /api/support/tickets - List support tickets */
router.get('/tickets', async (req, res) => {
  try {
    const options: ListTicketsOptions = {
      status: req.query.status as any,
      priority: req.query.priority as any,
      category: req.query.category as any,
      reporter_id: req.query.reporter_id as string,
      assignee_id: req.query.assignee_id as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const [tickets, count] = await Promise.all([
      listTickets(options),
      getTicketCount(options),
    ]);

    res.json({
      data: tickets,
      meta: {
        total: count,
        limit: options.limit,
        offset: options.offset,
      },
    });
  } catch (error) {
    console.error('Error listing tickets:', error);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
});

/** GET /api/support/tickets/:id - Get a specific ticket */
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

/** PATCH /api/support/tickets/:id - Update a ticket */
router.patch('/tickets/:id', express.json(), async (req, res) => {
  try {
    const input: UpdateTicketInput = {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      category: req.body.category,
      assignee_id: req.body.assignee_id,
      tags: req.body.tags,
      metadata: req.body.metadata,
    };

    const ticket = await updateTicket(req.params.id, input);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

/** DELETE /api/support/tickets/:id - Delete a ticket */
router.delete('/tickets/:id', async (req, res) => {
  try {
    const deleted = await deleteTicket(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

/** POST /api/support/tickets/:id/comments - Add a comment to a ticket */
router.post('/tickets/:id/comments', express.json(), async (req, res) => {
  try {
    const user = (req as any).user;
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const comment = await addComment(req.params.id, user?.sub || user?.id || 'anonymous', content, {
      authorEmail: user?.email,
      isInternal: isInternal || false,
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/** GET /api/support/tickets/:id/comments - Get comments for a ticket */
router.get('/tickets/:id/comments', async (req, res) => {
  try {
    const comments = await getComments(req.params.id);
    res.json(comments);
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

export default router;
