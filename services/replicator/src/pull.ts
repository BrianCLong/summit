import fetch from 'node-fetch';
import readline from 'readline';
import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function pullFrom(peer: string, url: string) {
  const {
    rows: [wm],
  } = await pg.query(`SELECT last_seq FROM ledger_watermarks WHERE peer=$1`, [
    peer,
  ]);
  const since = wm?.last_seq || 0;
  const res = await fetch(`${url}?since=${since}`, {
    headers: { 'x-peer': String(process.env.REGION_ID || '') },
  });
  const rl = readline.createInterface({ input: res.body as any });
  let last = since;
  for await (const line of rl) {
    const ev = JSON.parse(line);
    await pg.query(
      `INSERT INTO run_ledger(region,site_id,run_id,event,payload,lamport,ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        ev.region,
        ev.site_id || null,
        ev.run_id,
        ev.event,
        ev.payload || {},
        ev.lamport,
        ev.ts || new Date().toISOString(),
      ],
    );
    last = Math.max(last, Number(ev.seq || 0));
  }
  await pg.query(
    `INSERT INTO ledger_watermarks(peer,last_seq,updated_at)
     VALUES ($1,$2,now()) ON CONFLICT (peer) DO UPDATE SET last_seq=EXCLUDED.last_seq, updated_at=now()`,
    [peer, last],
  );
}
