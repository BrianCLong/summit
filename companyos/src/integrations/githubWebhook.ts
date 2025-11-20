/**
 * GitHub Webhook Integration
 * Handles GitHub webhook events for incidents and deployments
 */

import { Router } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import { IncidentService } from '../services/incidentService';
import { DeploymentService } from '../services/deploymentService';
import { IncidentSeverity, IncidentStatus } from '../models/incident';

export function createGitHubWebhookRouter(db: Pool): Router {
  const router = Router();
  const incidentService = new IncidentService(db);
  const deploymentService = new DeploymentService(db);

  // Webhook signature verification
  const verifySignature = (req: any): boolean => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature || !process.env.GITHUB_WEBHOOK_SECRET) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  };

  // Main webhook endpoint
  router.post('/github-webhook', async (req, res) => {
    // Verify signature
    if (!verifySignature(req)) {
      console.warn('GitHub webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    const payload = req.body;

    try {
      switch (event) {
        case 'issues':
          await handleIssueEvent(payload);
          break;
        case 'workflow_run':
          await handleWorkflowRunEvent(payload);
          break;
        case 'deployment':
          await handleDeploymentEvent(payload);
          break;
        case 'deployment_status':
          await handleDeploymentStatusEvent(payload);
          break;
        default:
          console.log(`Unhandled GitHub event: ${event}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling GitHub webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Handle issue events (for incident tracking)
  async function handleIssueEvent(payload: any) {
    const { action, issue, repository } = payload;

    // Only handle issues with 'incident' label
    const isIncident = issue.labels?.some((label: any) =>
      label.name.toLowerCase() === 'incident'
    );

    if (!isIncident) {
      return;
    }

    console.log(`GitHub issue event: ${action} for incident ${issue.number}`);

    if (action === 'opened') {
      // Create incident from GitHub issue
      const severity = extractSeverity(issue.labels);
      await incidentService.createIncident({
        title: issue.title,
        description: issue.body || '',
        severity,
        affectedServices: extractServices(issue.body),
        githubIssueUrl: issue.html_url,
        githubIssueNumber: issue.number,
        createdBy: issue.user.login,
        metadata: {
          repository: repository.full_name,
          githubId: issue.id,
        },
      });
    } else if (action === 'closed') {
      // Find and close corresponding incident
      const result = await db.query(
        'SELECT id FROM maestro.incidents WHERE github_issue_number = $1',
        [issue.number]
      );
      if (result.rows.length > 0) {
        await incidentService.closeIncident(result.rows[0].id);
      }
    }
  }

  // Handle workflow run events (for deployment tracking)
  async function handleWorkflowRunEvent(payload: any) {
    const { action, workflow_run, repository } = payload;

    // Only track deployment workflows
    const isDeploymentWorkflow = workflow_run.name.toLowerCase().includes('deploy') ||
      workflow_run.path.includes('deploy');

    if (!isDeploymentWorkflow) {
      return;
    }

    console.log(`GitHub workflow event: ${action} for ${workflow_run.name}`);

    if (action === 'requested' || action === 'in_progress') {
      // Create deployment tracking
      const serviceName = extractServiceName(workflow_run.name, repository.name);
      const environment = extractEnvironment(workflow_run.name, workflow_run.head_branch);

      await deploymentService.createDeployment({
        serviceName,
        version: workflow_run.head_sha.substring(0, 7),
        environment,
        deployedBy: workflow_run.actor.login,
        commitSha: workflow_run.head_sha,
        githubRunId: workflow_run.id.toString(),
        githubRunUrl: workflow_run.html_url,
        metadata: {
          workflowName: workflow_run.name,
          branch: workflow_run.head_branch,
          repository: repository.full_name,
        },
      });
    } else if (action === 'completed') {
      // Update deployment status
      const result = await db.query(
        'SELECT id FROM maestro.deployments WHERE github_run_id = $1',
        [workflow_run.id.toString()]
      );

      if (result.rows.length > 0) {
        const deploymentId = result.rows[0].id;
        if (workflow_run.conclusion === 'success') {
          await deploymentService.markSucceeded(deploymentId);
        } else if (workflow_run.conclusion === 'failure') {
          await deploymentService.markFailed(
            deploymentId,
            `Workflow failed: ${workflow_run.conclusion}`
          );
        }
      }
    }
  }

  // Handle deployment events
  async function handleDeploymentEvent(payload: any) {
    const { deployment, repository } = payload;

    console.log(`GitHub deployment event for ${deployment.environment}`);

    await deploymentService.createDeployment({
      serviceName: repository.name,
      version: deployment.ref,
      environment: deployment.environment,
      deployedBy: deployment.creator.login,
      commitSha: deployment.sha,
      metadata: {
        deploymentId: deployment.id,
        description: deployment.description,
        repository: repository.full_name,
      },
    });
  }

  // Handle deployment status events
  async function handleDeploymentStatusEvent(payload: any) {
    const { deployment_status, deployment, repository } = payload;

    console.log(`GitHub deployment status: ${deployment_status.state} for ${deployment.environment}`);

    const result = await db.query(
      'SELECT id FROM maestro.deployments WHERE metadata->\'deploymentId\' = $1',
      [deployment.id.toString()]
    );

    if (result.rows.length > 0) {
      const deploymentId = result.rows[0].id;

      if (deployment_status.state === 'success') {
        await deploymentService.markSucceeded(deploymentId);
      } else if (deployment_status.state === 'failure' || deployment_status.state === 'error') {
        await deploymentService.markFailed(
          deploymentId,
          deployment_status.description || 'Deployment failed'
        );
      }
    }
  }

  // Helper functions
  function extractSeverity(labels: any[]): IncidentSeverity {
    const sevLabel = labels.find((l) => l.name.toLowerCase().startsWith('sev'));
    if (sevLabel) {
      const match = sevLabel.name.match(/sev(\d)/i);
      if (match) {
        return `sev${match[1]}` as IncidentSeverity;
      }
    }
    return IncidentSeverity.SEV3; // Default
  }

  function extractServices(body: string): string[] {
    const serviceMatch = body.match(/services?:\s*([^\n]+)/i);
    if (serviceMatch) {
      return serviceMatch[1].split(',').map((s) => s.trim());
    }
    return [];
  }

  function extractServiceName(workflowName: string, repoName: string): string {
    // Try to extract service name from workflow name
    const match = workflowName.match(/deploy[- ]([a-z0-9-]+)/i);
    if (match) {
      return match[1];
    }
    // Fall back to repo name
    return repoName;
  }

  function extractEnvironment(workflowName: string, branch: string): any {
    const name = (workflowName + ' ' + branch).toLowerCase();
    if (name.includes('production') || name.includes('prod')) return 'production';
    if (name.includes('staging')) return 'staging';
    if (name.includes('preview')) return 'preview';
    if (name.includes('canary')) return 'canary';
    return 'dev';
  }

  return router;
}
