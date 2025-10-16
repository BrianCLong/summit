import fetch from 'node-fetch';
import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const SLACK_URL = process.env.SLACK_WEBHOOK || '';

export async function createApprovalTask(
  runId: string,
  stepId: string,
  labels: string[],
) {
  await pg.query(
    `INSERT INTO run_event (run_id, kind, payload) VALUES ($1,'approval.created',$2)`,
    [runId, { stepId, labels }],
  );
  if (!SLACK_URL) return;
  try {
    await fetch(SLACK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `🔐 Approval needed: run ${runId}, step ${stepId}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Approval needed*\nRun *${runId}*, step *${stepId}*`,
            },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Labels: ${labels.join(', ')}` },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Approve' },
                value: `${runId}|${stepId}|ok`,
                action_id: 'approve',
              },
              {
                type: 'button',
                style: 'danger',
                text: { type: 'plain_text', text: 'Decline' },
                value: `${runId}|${stepId}|no`,
                action_id: 'decline',
              },
            ],
          },
        ],
      }),
    });
  } catch {}
}

// M-of-N approvals groundwork
export type ApprovalRule = {
  runId: string;
  stepId: string;
  required: number;
  approvers: string[];
};

export async function upsertApprovalRule(rule: ApprovalRule) {
  await pg.query(
    `INSERT INTO approvals_rule(run_id, step_id, required, approvers)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (run_id, step_id) DO UPDATE SET required=$3, approvers=$4`,
    [rule.runId, rule.stepId, rule.required, rule.approvers],
  );
}

export async function approvalProgress(
  runId: string,
  stepId: string,
): Promise<{ count: number; required: number; satisfied: boolean }> {
  const {
    rows: [rule],
  } = await pg.query(
    `SELECT required FROM approvals_rule WHERE run_id=$1 AND step_id=$2`,
    [runId, stepId],
  );
  const {
    rows: [c],
  } = await pg.query(
    `SELECT count(*)::int AS cnt FROM approvals WHERE run_id=$1 AND step_id=$2 AND verdict='approved'`,
    [runId, stepId],
  );
  const required = rule?.required ?? 1;
  const count = c?.cnt ?? 0;
  return { count, required, satisfied: count >= required };
}
