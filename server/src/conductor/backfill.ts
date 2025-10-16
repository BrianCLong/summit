import YAML from 'yaml';
import { DateTime } from 'luxon';
import { Pool } from 'pg';
import crypto from 'crypto';
import { startRun } from './start.js';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function planBackfill(rbYaml: string) {
  const rb: any = YAML.parse(rbYaml);
  const win = rb?.backfill?.window;
  if (!win) return [] as any[];
  const start = DateTime.fromISO(win.start);
  const end = DateTime.fromISO(win.end);
  const step =
    win.type === 'hourly'
      ? { unit: 'hours' as const, n: 1 }
      : { unit: 'days' as const, n: 1 };
  const slots: { start: string; end: string }[] = [];
  for (let t = start; t < end; t = t.plus({ [step.unit]: step.n })) {
    const s = t.toISO();
    const e = t.plus({ [step.unit]: step.n }).toISO();
    if (s && e) slots.push({ start: s, end: e });
  }
  return slots;
}

export async function runBackfill(rbYaml: string, dry = true) {
  const slots = await planBackfill(rbYaml);
  const planned: any[] = [];
  for (const w of slots) {
    const idempotency =
      'backfill:' +
      crypto.createHash('sha1').update(`${w.start}:${w.end}`).digest('hex');
    const exists = await pg.query(
      `SELECT 1 FROM run WHERE idempotency_key=$1`,
      [idempotency],
    );
    if (exists.rowCount) continue;
    if (!dry)
      await startRun({
        runbookYaml: rbYaml,
        runbookRef: 'backfill',
        labels: ['backfill'],
        idempotency,
      });
    planned.push({ window: w, idempotency });
  }
  return planned;
}
