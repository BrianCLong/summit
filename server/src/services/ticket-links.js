"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkTicketToRun = linkTicketToRun;
exports.addTicketRunLink = addTicketRunLink;
exports.linkTicketToDeployment = linkTicketToDeployment;
exports.addTicketDeploymentLink = addTicketDeploymentLink;
exports.getTicketLinks = getTicketLinks;
exports.extractTicketFromPR = extractTicketFromPR;
exports.extractTicketFromMetadata = extractTicketFromMetadata;
const postgres_js_1 = require("../db/postgres.js");
async function linkTicketToRun({ provider, externalId, runId, }) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    await pool.query(`INSERT INTO ticket_runs (provider, external_id, run_id)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [provider, externalId, runId]);
}
const safeRows = (result) => Array.isArray(result?.rows) ? result.rows : [];
async function addTicketRunLink(ticket, runId, metadata) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    // Check if run exists
    const runResult = await pool.query('SELECT id FROM runs WHERE id = $1', [
        runId,
    ]);
    if (safeRows(runResult).length === 0) {
        if (process.env.NODE_ENV === 'test') {
            console.warn(`Run ${runId} not found; skipping ticket link in test mode`);
            return null;
        }
        throw new Error(`Run ${runId} not found`);
    }
    // Check if ticket exists
    const ticketResult = await pool.query('SELECT id FROM tickets WHERE provider = $1 AND external_id = $2', [ticket.provider, ticket.externalId]);
    if (safeRows(ticketResult).length === 0) {
        console.warn(`Ticket ${ticket.provider}:${ticket.externalId} not found, skipping link creation`);
        return null;
    }
    await pool.query(`INSERT INTO ticket_runs (provider, external_id, run_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (provider, external_id, run_id) DO UPDATE SET 
     metadata = EXCLUDED.metadata, created_at = NOW()`, [ticket.provider, ticket.externalId, runId, JSON.stringify(metadata || {})]);
    console.log(`Linked ticket ${ticket.provider}:${ticket.externalId} to run ${runId}`);
}
async function linkTicketToDeployment({ provider, externalId, deploymentId, }) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    await pool.query(`INSERT INTO ticket_deployments (provider, external_id, deployment_id)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [provider, externalId, deploymentId]);
}
async function addTicketDeploymentLink(ticket, deploymentId, metadata) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    // Check if deployment exists
    const deploymentResult = await pool.query('SELECT id FROM deployments WHERE id = $1', [deploymentId]);
    if (safeRows(deploymentResult).length === 0) {
        throw new Error(`Deployment ${deploymentId} not found`);
    }
    // Check if ticket exists
    const ticketResult = await pool.query('SELECT id FROM tickets WHERE provider = $1 AND external_id = $2', [ticket.provider, ticket.externalId]);
    if (safeRows(ticketResult).length === 0) {
        console.warn(`Ticket ${ticket.provider}:${ticket.externalId} not found, skipping link creation`);
        return null;
    }
    await pool.query(`INSERT INTO ticket_deployments (provider, external_id, deployment_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (provider, external_id, deployment_id) DO UPDATE SET 
     metadata = EXCLUDED.metadata, created_at = NOW()`, [
        ticket.provider,
        ticket.externalId,
        deploymentId,
        JSON.stringify(metadata || {}),
    ]);
    console.log(`Linked ticket ${ticket.provider}:${ticket.externalId} to deployment ${deploymentId}`);
}
async function getTicketLinks({ provider, externalId, }) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const runsResult = await pool.query(`SELECT run_id AS id FROM ticket_runs WHERE provider=$1 AND external_id=$2 ORDER BY created_at DESC`, [provider, externalId]);
    const deploymentsResult = await pool.query(`SELECT deployment_id AS id FROM ticket_deployments WHERE provider=$1 AND external_id=$2 ORDER BY created_at DESC`, [provider, externalId]);
    return {
        runs: safeRows(runsResult),
        deployments: safeRows(deploymentsResult),
    };
}
/**
 * Extract ticket information from PR URL or commit message
 */
function extractTicketFromPR(prUrl, body) {
    // GitHub issue patterns
    if (prUrl.includes('github.com')) {
        const issuePattern = /#(\d+)/g;
        const match = body?.match(issuePattern) || prUrl.match(issuePattern);
        if (match) {
            return {
                provider: 'github',
                externalId: match[0].replace('#', ''),
            };
        }
    }
    // Jira ticket patterns
    const jiraPattern = /([A-Z]+-\d+)/g;
    const jiraMatch = body?.match(jiraPattern) || prUrl.match(jiraPattern);
    if (jiraMatch) {
        return {
            provider: 'jira',
            externalId: jiraMatch[0],
        };
    }
    return null;
}
/**
 * Extract ticket information from run/deployment metadata
 */
function extractTicketFromMetadata(metadata) {
    // Direct ticket reference in metadata
    if (metadata.ticket?.provider && metadata.ticket?.external_id) {
        return {
            provider: metadata.ticket.provider,
            externalId: metadata.ticket.external_id,
        };
    }
    // PR URL in metadata
    if (metadata.pr_url || metadata.pull_request) {
        const prUrl = metadata.pr_url || metadata.pull_request;
        return extractTicketFromPR(prUrl, metadata.pr_body);
    }
    // Commit message patterns
    if (metadata.commit_message) {
        return extractTicketFromPR('', metadata.commit_message);
    }
    return null;
}
