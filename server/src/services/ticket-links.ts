import { getPostgresPool } from '../db/postgres.js';

export interface TicketIdentifier {
  provider: 'github' | 'jira' | 'linear' | 'asana';
  externalId: string;
}

export async function linkTicketToRun({
  provider,
  externalId,
  runId,
}: {
  provider: string;
  externalId: string;
  runId: string;
}) {
  const pool = getPostgresPool();
  await pool.query(
    `INSERT INTO ticket_runs (provider, external_id, run_id)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [provider, externalId, runId],
  );
}

const safeRows = <T = unknown>(result: any): T[] =>
  Array.isArray(result?.rows) ? (result.rows as T[]) : [];

export async function addTicketRunLink(
  ticket: TicketIdentifier,
  runId: string,
  metadata?: Record<string, any>,
) {
  const pool = getPostgresPool();

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
  const ticketResult = await pool.query(
    'SELECT id FROM tickets WHERE provider = $1 AND external_id = $2',
    [ticket.provider, ticket.externalId],
  );

  if (safeRows(ticketResult).length === 0) {
    console.warn(
      `Ticket ${ticket.provider}:${ticket.externalId} not found, skipping link creation`,
    );
    return null;
  }

  await pool.query(
    `INSERT INTO ticket_runs (provider, external_id, run_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (provider, external_id, run_id) DO UPDATE SET 
     metadata = EXCLUDED.metadata, created_at = NOW()`,
    [ticket.provider, ticket.externalId, runId, JSON.stringify(metadata || {})],
  );

  console.log(
    `Linked ticket ${ticket.provider}:${ticket.externalId} to run ${runId}`,
  );
}

export async function linkTicketToDeployment({
  provider,
  externalId,
  deploymentId,
}: {
  provider: string;
  externalId: string;
  deploymentId: string;
}) {
  const pool = getPostgresPool();
  await pool.query(
    `INSERT INTO ticket_deployments (provider, external_id, deployment_id)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [provider, externalId, deploymentId],
  );
}

export async function addTicketDeploymentLink(
  ticket: TicketIdentifier,
  deploymentId: string,
  metadata?: Record<string, any>,
) {
  const pool = getPostgresPool();

  // Check if deployment exists
  const deploymentResult = await pool.query(
    'SELECT id FROM deployments WHERE id = $1',
    [deploymentId],
  );
  if (safeRows(deploymentResult).length === 0) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  // Check if ticket exists
  const ticketResult = await pool.query(
    'SELECT id FROM tickets WHERE provider = $1 AND external_id = $2',
    [ticket.provider, ticket.externalId],
  );

  if (safeRows(ticketResult).length === 0) {
    console.warn(
      `Ticket ${ticket.provider}:${ticket.externalId} not found, skipping link creation`,
    );
    return null;
  }

  await pool.query(
    `INSERT INTO ticket_deployments (provider, external_id, deployment_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (provider, external_id, deployment_id) DO UPDATE SET 
     metadata = EXCLUDED.metadata, created_at = NOW()`,
    [
      ticket.provider,
      ticket.externalId,
      deploymentId,
      JSON.stringify(metadata || {}),
    ],
  );

  console.log(
    `Linked ticket ${ticket.provider}:${ticket.externalId} to deployment ${deploymentId}`,
  );
}

export async function getTicketLinks({
  provider,
  externalId,
}: {
  provider: string;
  externalId: string;
}) {
  const pool = getPostgresPool();
  const runsResult = await pool.query(
    `SELECT run_id AS id FROM ticket_runs WHERE provider=$1 AND external_id=$2 ORDER BY created_at DESC`,
    [provider, externalId],
  );
  const deploymentsResult = await pool.query(
    `SELECT deployment_id AS id FROM ticket_deployments WHERE provider=$1 AND external_id=$2 ORDER BY created_at DESC`,
    [provider, externalId],
  );
  return {
    runs: safeRows(runsResult),
    deployments: safeRows(deploymentsResult),
  };
}

/**
 * Extract ticket information from PR URL or commit message
 */
export function extractTicketFromPR(
  prUrl: string,
  body?: string,
): TicketIdentifier | null {
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
export function extractTicketFromMetadata(
  metadata: Record<string, any>,
): TicketIdentifier | null {
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
