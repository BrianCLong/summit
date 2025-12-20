import { randomUUID as uuid } from 'crypto';
import fetch from 'node-fetch';
import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Opens a new incident in the database and notifies external services (PagerDuty, OpsGenie, Slack).
 *
 * @param params - The incident details.
 * @param params.runbook - The runbook associated with the incident.
 * @param params.tenant - The tenant ID.
 * @param params.severity - The severity level of the incident.
 * @param params.reason - The reason for the incident.
 * @param params.details - Additional details about the incident.
 * @returns The ID of the newly created incident.
 */
export async function openIncident({
  runbook,
  tenant,
  severity,
  reason,
  details,
}: {
  runbook: string;
  tenant: string;
  severity: string;
  reason: string;
  details: any;
}) {
  const id = uuid();
  await pg.query(
    `INSERT INTO incidents(id,runbook,tenant,severity,status,reason,details) VALUES ($1,$2,$3,$4,'OPEN',$5,$6)`,
    [id, runbook, tenant, severity, reason, details],
  );
  if (process.env.PAGERDUTY_URL)
    await fetch(process.env.PAGERDUTY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: `${runbook} SLO breach`,
        severity,
        source: 'maestro',
        custom_details: details,
      }),
    });
  if (process.env.OPSGENIE_URL)
    await fetch(process.env.OPSGENIE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `${runbook} incident: ${reason}`,
        priority: severity,
      }),
    });
  if (process.env.SLACK_WEBHOOK)
    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Incident ${id} for ${runbook}: ${reason}`,
      }),
    });
  return id;
}

/**
 * Closes an existing incident.
 * Updates the incident status to 'CLOSED' and sets the closed_at timestamp.
 *
 * @param id - The ID of the incident to close.
 */
export async function closeIncident(id: string) {
  await pg.query(
    `UPDATE incidents SET status='CLOSED', closed_at=now() WHERE id=$1`,
    [id],
  );
}
