import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  addTicketRunLink,
  addTicketDeploymentLink,
  extractTicketFromPR,
} from '../services/ticket-links.js';
import { LifecycleManager } from '../services/lifecycle-listeners.js';
import { webhookService, CreateWebhookSchema, UpdateWebhookSchema } from '../webhooks/webhook.service.js';
import { z } from 'zod/v4';
import { logger, metrics, tracer } from '../observability/index.js';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import crypto from 'crypto';

const router = Router();

// GitHub Signature Verification Middleware
const verifyGitHubSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  // Skip verification if secret is not configured (e.g. dev/test)
  // WARN: In production this should be enforced strictly.
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('GITHUB_WEBHOOK_SECRET is missing in production');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.warn('Webhook received without rawBody (express.json verify hook missing?)');
    return res.status(400).json({ error: 'Payload verification failed' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

  const sigString = Array.isArray(signature) ? signature[0] : signature;
  const sigBuffer = Buffer.from(sigString);
  const digestBuffer = Buffer.from(digest);

  try {
    if (
      sigBuffer.length !== digestBuffer.length ||
      !crypto.timingSafeEqual(digestBuffer, sigBuffer)
    ) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid signature format' });
  }

  next();
};

// Jira Secret Verification Middleware
const verifyJiraSecret = (req: any, res: any, next: any) => {
  const secret = process.env.JIRA_WEBHOOK_SECRET;

  // Skip verification if secret is not configured
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error("JIRA_WEBHOOK_SECRET is missing in production. Blocking request.");
      return res.status(500).json({ error: "Server configuration error" });
    }
    return next();
  }

  // Check for secret in header or query param (common Jira patterns)
  const incomingSecret = req.headers['x-webhook-secret'] || (req.query.secret as any);

  if (!incomingSecret || incomingSecret !== secret) {
    logger.warn('Jira webhook rejected: Invalid secret');
    return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
  }

  next();
};

// Lifecycle Secret Verification Middleware
const verifyLifecycleSecret = (req: any, res: any, next: any) => {
  const secret = process.env.LIFECYCLE_WEBHOOK_SECRET;

  // Skip verification if secret is not configured
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error("LIFECYCLE_WEBHOOK_SECRET is missing in production. Blocking request.");
      return res.status(500).json({ error: "Server configuration error" });
    }
    return next();
  }

  const incomingSecret = req.headers['x-lifecycle-secret'] || req.headers['x-webhook-secret'];

  if (!incomingSecret || incomingSecret !== secret) {
    logger.warn('Lifecycle webhook rejected: Invalid secret');
    return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
  }

  next();
};

// Helper for validation (for new routes)
const validate = (schema: any) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid input', details: error });
  }
};

// Helper for tenant ID (assuming it's in req.user or req.headers)
const getTenantId = (req: any) => {
  // Strict auth is enforced via app.ts, so req.user should always be populated
  if (req.user?.tenantId || req.user?.tenant_id) {
    return req.user.tenantId || req.user.tenant_id;
  }
  // Fallback only if configured for strict dev bypassing, but now we enforce auth even in dev (mock user)
  // We throw error if tenant identification fails for security
  throw new Error('Tenant ID not found in authenticated session');
};

// --- New Webhook Management Routes ---

/**
 * @openapi
 * /api/webhooks:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Create webhook
 *     description: Create a new webhook.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Webhook created
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/', validate(CreateWebhookSchema), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const webhook = await webhookService.createWebhook(tenantId, req.body);
    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/webhooks:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: List webhooks
 *     description: List all webhooks for the tenant.
 *     responses:
 *       200:
 *         description: List of webhooks
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const webhooks = await webhookService.getWebhooks(tenantId);
    res.json(webhooks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: Get webhook
 *     description: Get a webhook by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook details
 *       404:
 *         description: Webhook not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const webhook = await webhookService.getWebhook(tenantId, req.params.id);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   patch:
 *     tags:
 *       - Webhooks
 *     summary: Update webhook
 *     description: Update a webhook by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook updated
 *       404:
 *         description: Webhook not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', validate(UpdateWebhookSchema), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const webhook = await webhookService.updateWebhook(tenantId, req.params.id, req.body);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   delete:
 *     tags:
 *       - Webhooks
 *     summary: Delete webhook
 *     description: Delete a webhook by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Webhook deleted
 *       404:
 *         description: Webhook not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const success = await webhookService.deleteWebhook(tenantId, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/webhooks/{id}/deliveries:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: Get webhook deliveries
 *     description: Get delivery history for a webhook.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of deliveries
 *       500:
 *         description: Internal server error
 */
router.get('/:id/deliveries', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const deliveries = await webhookService.getDeliveries(tenantId, req.params.id, limit, offset);
    res.json(deliveries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/webhooks/trigger-test:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Trigger test event
 *     description: Trigger a test webhook event.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - payload
 *             properties:
 *               eventType:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event triggered
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Internal server error
 */
router.post('/trigger-test', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { eventType, payload } = req.body;
    if (!eventType || !payload) {
      return res.status(400).json({ error: 'eventType and payload required' });
    }
    await webhookService.triggerEvent(tenantId, eventType, payload);
    res.json({ message: 'Event triggered' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Existing Webhook Routes (GitHub, Jira, Lifecycle) ---

/**
 * @openapi
 * /api/webhooks/github:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: GitHub webhook
 *     description: Handle GitHub webhook events.
 *     responses:
 *       200:
 *         description: Processed
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
  '/github',
  verifyGitHubSignature,
  body('action').isString(),
  body('number').optional().isNumeric(),
  body('pull_request').optional().isObject(),
  body('issue').optional().isObject(),
  async (req, res) => {
    return tracer.trace('webhook.receive', async (span: any) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Validation failed' });
        return res.status(400).json({ errors: errors.array() });
      }

      span.setAttributes({
        'webhook.provider': 'github',
        'webhook.event': req.body.action
      });

      try {
        const { action, pull_request, issue, repository } = req.body;

        logger.info(`Received GitHub webhook: ${action}`, {
          pr: pull_request?.number,
          issue: issue?.number,
          repo: repository?.name,
          provider: 'github'
        });

        metrics.incrementCounter('summit_webhook_deliveries_total', { status: 'received', provider: 'github' });

        // Handle PR events
        if (
          pull_request &&
          (action === 'opened' || action === 'closed' || action === 'merged')
        ) {
          const prUrl = pull_request.html_url;
          const prBody = pull_request.body || '';

          // Extract ticket information from PR
          const ticket = extractTicketFromPR(prUrl, prBody);

          if (ticket) {
            // Check if PR body contains run or deployment IDs
            const runIdMatch = prBody.match(/runId[:\s]*([a-f0-9-]{36})/i);
            const deploymentIdMatch = prBody.match(
              /deploymentId[:\s]*([a-f0-9-]{36})/i,
            );

            const metadata = {
              pr_url: prUrl,
              pr_number: pull_request.number,
              pr_title: pull_request.title,
              pr_body: prBody,
              pr_action: action,
              repository: repository?.full_name,
              author: pull_request.user?.login,
            };

            if (runIdMatch) {
              await addTicketRunLink(ticket, runIdMatch[1], metadata);
            }

            if (deploymentIdMatch) {
              await addTicketDeploymentLink(
                ticket,
                deploymentIdMatch[1],
                metadata,
              );
            }
          }
        }

        // Handle issue events
        if (issue && (action === 'opened' || action === 'closed')) {
          console.log(`GitHub issue ${action}: #${issue.number}`);
        }

        res.status(200).json({ status: 'processed' });
      } catch (error: any) {
        logger.error('GitHub webhook error:', { error: error.message });
        metrics.incrementCounter('summit_webhook_deliveries_total', { status: 'failed', provider: 'github' });

        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

        res.status(500).json({ error: 'Webhook processing failed' });
      }
    }, {
      kind: SpanKind.SERVER,
      attributes: {
        'webhook.provider': 'github'
      }
    });
  },
);

/**
 * @openapi
 * /api/webhooks/jira:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Jira webhook
 *     description: Handle Jira webhook events.
 *     responses:
 *       200:
 *         description: Processed
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
  '/jira',
  verifyJiraSecret,
  body('webhookEvent').isString(),
  body('issue').optional().isObject(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { webhookEvent, issue, changelog } = req.body;

      console.log(`Received Jira webhook: ${webhookEvent}`, {
        issue: issue?.key,
        status: issue?.fields?.status?.name,
      });

      if (
        issue &&
        (webhookEvent === 'jira:issue_created' ||
          webhookEvent === 'jira:issue_updated')
      ) {
        const ticket = {
          provider: 'jira' as const,
          externalId: issue.key,
        };

        // Check if issue description contains run or deployment IDs
        const description = issue.fields?.description || '';
        const runIdMatch = description.match(/runId[:\s]*([a-f0-9-]{36})/i);
        const deploymentIdMatch = description.match(
          /deploymentId[:\s]*([a-f0-9-]{36})/i,
        );

        const metadata = {
          issue_key: issue.key,
          issue_summary: issue.fields?.summary,
          issue_description: description,
          issue_status: issue.fields?.status?.name,
          webhook_event: webhookEvent,
          assignee: issue.fields?.assignee?.displayName,
          reporter: issue.fields?.reporter?.displayName,
        };

        if (runIdMatch) {
          await addTicketRunLink(ticket, runIdMatch[1], metadata);
        }

        if (deploymentIdMatch) {
          await addTicketDeploymentLink(ticket, deploymentIdMatch[1], metadata);
        }
      }

      res.status(200).json({ status: 'processed' });
    } catch (error: any) {
      console.error('Jira webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
);

/**
 * @openapi
 * /api/webhooks/lifecycle:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Lifecycle webhook
 *     description: Handle run/deployment lifecycle events.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_type
 *               - id
 *             properties:
 *               event_type:
 *                 type: string
 *                 enum: [run_created, run_completed, run_failed, deployment_started, deployment_completed, deployment_failed]
 *               id:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Processed
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
  '/lifecycle',
  verifyLifecycleSecret,
  body('event_type').isIn([
    'run_created',
    'run_completed',
    'run_failed',
    'deployment_started',
    'deployment_completed',
    'deployment_failed',
  ]),
  body('id').isString(),
  body('metadata').optional().isObject(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { event_type, id, metadata } = req.body;

      if (event_type.startsWith('run_')) {
        await LifecycleManager.emitRunEvent({
          type: event_type as 'run_created' | 'run_completed' | 'run_failed',
          runId: id,
          metadata,
          timestamp: new Date(),
        });
      } else if (event_type.startsWith('deployment_')) {
        await LifecycleManager.emitDeploymentEvent({
          type: event_type as
            | 'deployment_started'
            | 'deployment_completed'
            | 'deployment_failed',
          deploymentId: id,
          metadata,
          timestamp: new Date(),
        });
      }

      res.status(200).json({ status: 'processed' });
    } catch (error: any) {
      console.error('Lifecycle webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
);

export default router;
