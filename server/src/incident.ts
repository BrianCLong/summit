import { randomUUID as uuid } from 'crypto';
import fetch from 'node-fetch';
import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

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

export async function closeIncident(id: string) {
  await pg.query(
    `UPDATE incidents SET status='CLOSED', closed_at=now() WHERE id=$1`,
    [id],
  );
}
