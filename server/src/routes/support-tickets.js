"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const support_tickets_js_1 = require("../services/support-tickets.js");
const router = express_1.default.Router();
/** POST /api/support/tickets - Create a new support ticket */
router.post('/tickets', express_1.default.json(), async (req, res) => {
    try {
        const user = req.user;
        const input = {
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
        const ticket = await (0, support_tickets_js_1.createTicket)(input);
        res.status(201).json(ticket);
    }
    catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});
/** GET /api/support/tickets - List support tickets */
router.get('/tickets', async (req, res) => {
    try {
        const options = {
            status: req.query.status,
            priority: req.query.priority,
            category: req.query.category,
            reporter_id: req.query.reporter_id,
            assignee_id: req.query.assignee_id,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
            offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
        };
        const [tickets, count] = await Promise.all([
            (0, support_tickets_js_1.listTickets)(options),
            (0, support_tickets_js_1.getTicketCount)(options),
        ]);
        res.json({
            data: tickets,
            meta: {
                total: count,
                limit: options.limit,
                offset: options.offset,
            },
        });
    }
    catch (error) {
        console.error('Error listing tickets:', error);
        res.status(500).json({ error: 'Failed to list tickets' });
    }
});
/** GET /api/support/tickets/:id - Get a specific ticket */
router.get('/tickets/:id', async (req, res) => {
    try {
        const ticket = await (0, support_tickets_js_1.getTicketById)(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(ticket);
    }
    catch (error) {
        console.error('Error getting ticket:', error);
        res.status(500).json({ error: 'Failed to get ticket' });
    }
});
/** PATCH /api/support/tickets/:id - Update a ticket */
router.patch('/tickets/:id', express_1.default.json(), async (req, res) => {
    try {
        const input = {
            title: req.body.title,
            description: req.body.description,
            status: req.body.status,
            priority: req.body.priority,
            category: req.body.category,
            assignee_id: req.body.assignee_id,
            tags: req.body.tags,
            metadata: req.body.metadata,
        };
        const ticket = await (0, support_tickets_js_1.updateTicket)(req.params.id, input);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(ticket);
    }
    catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});
/** DELETE /api/support/tickets/:id - Delete a ticket */
router.delete('/tickets/:id', async (req, res) => {
    try {
        const deleted = await (0, support_tickets_js_1.deleteTicket)(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});
/** POST /api/support/tickets/:id/comments - Add a comment to a ticket */
router.post('/tickets/:id/comments', express_1.default.json(), async (req, res) => {
    try {
        const user = req.user;
        const { content, isInternal } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content is required' });
        }
        const comment = await (0, support_tickets_js_1.addComment)(req.params.id, user?.sub || user?.id || 'anonymous', content, {
            authorEmail: user?.email,
            isInternal: isInternal || false,
        });
        res.status(201).json(comment);
    }
    catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});
/** GET /api/support/tickets/:id/comments - Get comments for a ticket */
router.get('/tickets/:id/comments', async (req, res) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        const comments = await (0, support_tickets_js_1.getComments)(req.params.id, { includeDeleted });
        res.json(comments);
    }
    catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});
const resolveActor = (req) => {
    const user = req.user;
    // SEC-HARDENING: Rely exclusively on authenticated user object.
    // Identity spoofing via headers is strictly forbidden.
    const id = (user?.sub || user?.id || '').toString();
    const roles = Array.isArray(user?.roles)
        ? user?.roles
        : user?.role ? [user.role] : [];
    return { id, roles };
};
const canModerateComments = (roles) => roles.some((role) => role === 'admin' || role === 'support_admin');
router.post('/tickets/:ticketId/comments/:commentId/delete', express_1.default.json(), async (req, res) => {
    try {
        const { id: actorId, roles } = resolveActor(req);
        if (!actorId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const comment = await (0, support_tickets_js_1.getCommentById)(req.params.commentId);
        if (!comment || comment.ticket_id !== req.params.ticketId) {
            return res.status(404).json({ error: 'comment_not_found' });
        }
        const isOwner = comment.author_id === actorId;
        if (!isOwner && !canModerateComments(roles)) {
            return res.status(403).json({ error: 'forbidden' });
        }
        const deleted = await (0, support_tickets_js_1.softDeleteComment)(comment.id, actorId, req.body.reason);
        res.json({ status: 'deleted', comment: deleted });
    }
    catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});
router.post('/tickets/:ticketId/comments/:commentId/restore', express_1.default.json(), async (req, res) => {
    try {
        const { id: actorId, roles } = resolveActor(req);
        if (!actorId) {
            return res.status(401).json({ error: 'user_required' });
        }
        const comment = await (0, support_tickets_js_1.getCommentById)(req.params.commentId);
        if (!comment || comment.ticket_id !== req.params.ticketId) {
            return res.status(404).json({ error: 'comment_not_found' });
        }
        const isOwner = comment.author_id === actorId;
        if (!isOwner && !canModerateComments(roles)) {
            return res.status(403).json({ error: 'forbidden' });
        }
        const restored = await (0, support_tickets_js_1.restoreComment)(comment.id, actorId);
        res.json({ status: 'restored', comment: restored });
    }
    catch (error) {
        console.error('Error restoring comment:', error);
        res.status(500).json({ error: 'Failed to restore comment' });
    }
});
exports.default = router;
