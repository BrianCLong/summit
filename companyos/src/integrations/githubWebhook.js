"use strict";
/**
 * GitHub Webhook Integration
 * Handles GitHub webhook events for incidents and deployments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGitHubWebhookRouter = createGitHubWebhookRouter;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const incidentService_1 = require("../services/incidentService");
const deploymentService_1 = require("../services/deploymentService");
const incident_1 = require("../models/incident");
function createGitHubWebhookRouter(db) {
    const router = (0, express_1.Router)();
    const incidentService = new incidentService_1.IncidentService(db);
    const deploymentService = new deploymentService_1.DeploymentService(db);
    // Webhook signature verification
    const verifySignature = (req) => {
        const signature = req.headers['x-hub-signature-256'];
        if (!signature || !process.env.GITHUB_WEBHOOK_SECRET) {
            return false;
        }
        const hmac = crypto_1.default.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
        const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
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
        }
        catch (error) {
            console.error('Error handling GitHub webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Handle issue events (for incident tracking)
    async function handleIssueEvent(payload) {
        const { action, issue, repository } = payload;
        // Only handle issues with 'incident' label
        const isIncident = issue.labels?.some((label) => label.name.toLowerCase() === 'incident');
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
        }
        else if (action === 'closed') {
            // Find and close corresponding incident
            const result = await db.query('SELECT id FROM maestro.incidents WHERE github_issue_number = $1', [issue.number]);
            if (result.rows.length > 0) {
                await incidentService.closeIncident(result.rows[0].id);
            }
        }
    }
    // Handle workflow run events (for deployment tracking)
    async function handleWorkflowRunEvent(payload) {
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
        }
        else if (action === 'completed') {
            // Update deployment status
            const result = await db.query('SELECT id FROM maestro.deployments WHERE github_run_id = $1', [workflow_run.id.toString()]);
            if (result.rows.length > 0) {
                const deploymentId = result.rows[0].id;
                if (workflow_run.conclusion === 'success') {
                    await deploymentService.markSucceeded(deploymentId);
                }
                else if (workflow_run.conclusion === 'failure') {
                    await deploymentService.markFailed(deploymentId, `Workflow failed: ${workflow_run.conclusion}`);
                }
            }
        }
    }
    // Handle deployment events
    async function handleDeploymentEvent(payload) {
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
    async function handleDeploymentStatusEvent(payload) {
        const { deployment_status, deployment, repository } = payload;
        console.log(`GitHub deployment status: ${deployment_status.state} for ${deployment.environment}`);
        const result = await db.query('SELECT id FROM maestro.deployments WHERE metadata->\'deploymentId\' = $1', [deployment.id.toString()]);
        if (result.rows.length > 0) {
            const deploymentId = result.rows[0].id;
            if (deployment_status.state === 'success') {
                await deploymentService.markSucceeded(deploymentId);
            }
            else if (deployment_status.state === 'failure' || deployment_status.state === 'error') {
                await deploymentService.markFailed(deploymentId, deployment_status.description || 'Deployment failed');
            }
        }
    }
    // Helper functions
    function extractSeverity(labels) {
        const sevLabel = labels.find((l) => l.name.toLowerCase().startsWith('sev'));
        if (sevLabel) {
            const match = sevLabel.name.match(/sev(\d)/i);
            if (match) {
                return `sev${match[1]}`;
            }
        }
        return incident_1.IncidentSeverity.SEV3; // Default
    }
    function extractServices(body) {
        const serviceMatch = body.match(/services?:\s*([^\n]+)/i);
        if (serviceMatch) {
            return serviceMatch[1].split(',').map((s) => s.trim());
        }
        return [];
    }
    function extractServiceName(workflowName, repoName) {
        // Try to extract service name from workflow name
        const match = workflowName.match(/deploy[- ]([a-z0-9-]+)/i);
        if (match) {
            return match[1];
        }
        // Fall back to repo name
        return repoName;
    }
    function extractEnvironment(workflowName, branch) {
        const name = (workflowName + ' ' + branch).toLowerCase();
        if (name.includes('production') || name.includes('prod'))
            return 'production';
        if (name.includes('staging'))
            return 'staging';
        if (name.includes('preview'))
            return 'preview';
        if (name.includes('canary'))
            return 'canary';
        return 'dev';
    }
    return router;
}
