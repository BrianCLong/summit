#!/usr/bin/env node
import { Pool } from "pg";
import fetch from "node-fetch";

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const SLACK = process.env.SLACK_QOS_CSM_WEBHOOK!;
const HOURS = parseInt(process.env.QOS_OVERRIDE_REMINDER_HOURS || "24", 10);

async function main() {
  const { rows } = await pg.query(
    `select id, tenant_id, coalesce(expert,'*') as expert, explore_max, expires_at, reason, actor
       from qos_overrides
      where expires_at > now()
        and expires_at <= now() + ($1 || ' hours')::interval
      order by expires_at asc`,
    [HOURS]
  );

  if (!rows.length) return console.log("no overrides expiring in next %sh", HOURS);

  const lines = rows.map(r =>
    `• *${r.tenant_id}* (${r.expert}) → explore_max=${(r.explore_max*100).toFixed(1)}% expires *${new Date(r.expires_at).toISOString()}* — _${r.reason}_ (by ${r.actor})`
  ).join("\n");

  const payload = {
    text: ":alarm_clock: *QoS overrides expiring in next ${HOURS}h*\n${lines}\n\nAction: confirm extension, upgrade tenant, or let expire."
  };

  const res = await fetch(SLACK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) {
    console.error("Slack post failed", await res.text());
    process.exit(1);
  }
  console.log("reminder posted:", rows.length);
}

main().catch(e => { console.error(e); process.exit(1); });
