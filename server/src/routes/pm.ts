import express from 'express';
import crypto from 'crypto';
import logger from '../config/logger';
import {
  upsertTickets,
  mapGitHubIssue,
  mapJiraIssue,
  listTickets,
} from '../db/repositories/tickets.js'; // added links
import { addTicketRunLink } from '../db/repositories/tickets.js';

const router = express.Router();

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// GitHub webhook receiver
router.post(
  '/webhooks/github',
  express.json({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.header('x-hub-signature-256') || '';
      const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
      if (!secret) {
        logger.warn('GITHUB_WEBHOOK_SECRET not set; rejecting');
        return res.status(503).json({ error: 'webhook not configured' });
      }
      const body = JSON.stringify(req.body);
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      const expected = `sha256=${hmac}`;
      if (!timingSafeEqual(signature, expected)) {
        return res.status(401).json({ error: 'invalid signature' });
      }
      const event = req.header('x-github-event') || 'unknown';
      const delivery = req.header('x-github-delivery') || crypto.randomUUID();
      logger.info({ event, delivery }, 'github webhook received');
      const mapped = mapGitHubIssue(req.body);
      if (mapped) {
        await upsertTickets([mapped]);
      }
      return res.json({ ok: true, upserted: mapped ? 1 : 0 });
    } catch (e) {
      logger.error({ err: e }, 'github webhook error');
      return res.status(500).json({ error: 'internal' });
    }
  },
);

// Jira webhook receiver (optional verification by secret header if configured)
router.post(
  '/webhooks/jira',
  express.json({ type: 'application/json' }),
  async (req, res) => {
    try {
      // Optionally verify via custom header if you set one in Jira (X-Jira-Secret)
      const configured = process.env.JIRA_WEBHOOK_SECRET;
      if (configured) {
        const provided = req.header('x-jira-secret') || '';
        if (!timingSafeEqual(provided, configured)) {
          return res.status(401).json({ error: 'invalid secret' });
        }
      }
      logger.info(
        { webhook: 'jira', type: req.body?.webhookEvent },
        'jira webhook received',
      );
      const mapped = mapJiraIssue(req.body);
      if (mapped) {
        await upsertTickets([mapped]);
      }
      return res.json({ ok: true, upserted: mapped ? 1 : 0 });
    } catch (e) {
      logger.error({ err: e }, 'jira webhook error');
      return res.status(500).json({ error: 'internal' });
    }
  },
);

// Minimal tickets endpoint (placeholder for GH/Jira merged view)
router.get('/tickets', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const filters = {
      provider: (req.query.provider as any) || undefined,
      assignee: (req.query.assignee as string) || undefined,
      label: (req.query.label as string) || undefined,
      project: (req.query.project as string) || undefined,
      repo: (req.query.repo as string) || undefined,
    };
    const items = await listTickets(limit, offset, filters);
    return res.json({ items, total: items.length, limit, offset });
  } catch (e) {
    return res.status(500).json({ error: 'internal' });
  }
});

export default router;
