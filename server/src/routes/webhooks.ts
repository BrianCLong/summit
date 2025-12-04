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

const router = Router();

const TestWebhookSchema = z.object({
  eventType: z.string().default('webhook.test'),
  payload: z.record(z.any()).optional(),
  webhookId: z.string().optional(),
});

// Helper for validation (for new routes)
const validate = (schema: any) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid input', details: error });
  }
};

// Helper for tenant ID (assuming it's in req.user or req.headers)
const getTenantId = (req: any) => {
    // In production, strict auth is enforced and tenantId comes from req.user
    // In dev/testing, we allow header override IF req.user is missing
    if (req.user?.tenantId) {
        return req.user.tenantId;
    }
    // Fallback for development/testing purposes ONLY
    return req.headers['x-tenant-id'] || 'default-tenant';
};

// --- New Webhook Management Routes ---

// Create Webhook
router.post('/', validate(CreateWebhookSchema), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const webhook = await webhookService.createWebhook(tenantId, req.body);
    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Webhooks
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const webhooks = await webhookService.getWebhooks(tenantId);
    res.json(webhooks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Webhook
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

// Update Webhook
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

// Delete Webhook
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

// Get Deliveries
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

// Delivery attempts for a webhook
router.get('/:id/attempts', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const attempts = await webhookService.getDeliveryAttempts(tenantId, req.params.id, undefined, limit);
    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delivery attempts for a specific delivery
router.get('/:id/deliveries/:deliveryId/attempts', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const attempts = await webhookService.getDeliveryAttempts(
      tenantId,
      req.params.id,
      req.params.deliveryId,
      limit
    );
    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test Trigger (broadcast or targeted)
router.post('/trigger-test', validate(TestWebhookSchema), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { eventType, payload, webhookId } = req.body as z.infer<typeof TestWebhookSchema>;

    if (webhookId) {
      const delivery = await webhookService.triggerWebhook(
        tenantId,
        webhookId,
        eventType,
        payload || {
          type: 'webhook.test',
          timestamp: new Date().toISOString(),
        },
        'test'
      );

      if (!delivery) {
        return res.status(404).json({ error: 'Webhook not found or inactive' });
      }

      return res.json({ message: 'Test delivery enqueued', deliveryId: delivery.id });
    }

    await webhookService.triggerEvent(
      tenantId,
      eventType,
      payload || { type: 'webhook.test', timestamp: new Date().toISOString() }
    );
    res.json({ message: 'Broadcast test enqueued' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Targeted test trigger for a single webhook
router.post('/:id/test', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const eventType = req.body.eventType || 'webhook.test';
    const payload =
      req.body.payload ||
      ({
        type: 'webhook.test',
        timestamp: new Date().toISOString(),
        message: 'Subscriber test delivery',
      } as any);

    const delivery = await webhookService.triggerWebhook(
      tenantId,
      req.params.id,
      eventType,
      payload,
      'test'
    );

    if (!delivery) {
      return res.status(404).json({ error: 'Webhook not found or inactive' });
    }

    res.json({ message: 'Test delivery queued', deliveryId: delivery.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Existing Webhook Routes (GitHub, Jira, Lifecycle) ---

/**
 * GitHub webhook handler for issue and PR events
 */
router.post(
  '/github',
  body('action').isString(),
  body('number').optional().isNumeric(),
  body('pull_request').optional().isObject(),
  body('issue').optional().isObject(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { action, pull_request, issue, repository } = req.body;

      console.log(`Received GitHub webhook: ${action}`, {
        pr: pull_request?.number,
        issue: issue?.number,
        repo: repository?.name,
      });

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
    } catch (error) {
      console.error('GitHub webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
);

/**
 * Jira webhook handler for issue events
 */
router.post(
  '/jira',
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
    } catch (error) {
      console.error('Jira webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
);

/**
 * Generic webhook for run/deployment lifecycle events
 * This can be called by CI/CD systems or the application itself
 */
router.post(
  '/lifecycle',
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
    } catch (error) {
      console.error('Lifecycle webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
);

export default router;
