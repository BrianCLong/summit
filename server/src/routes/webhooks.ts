import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  addTicketRunLink,
  addTicketDeploymentLink,
  extractTicketFromPR,
} from '../services/ticket-links.js';
import { LifecycleManager } from '../services/lifecycle-listeners.js';

const router = Router();

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
