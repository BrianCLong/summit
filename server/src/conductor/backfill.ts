// @ts-nocheck
import YAML from 'yaml';
import { DateTime } from 'luxon';
import pg from 'pg';
import { createHash } from 'crypto';
import { startRun } from './start.js';

const { Pool } = pg;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function planBackfill(rbYaml: string) {
  const rb = YAML.parse(rbYaml) as { backfill?: { window?: { start: string; end: string; type: 'hourly' | 'daily' } } };
  const win = rb?.backfill?.window;
  if (!win) {return [] as { start: string; end: string }[];}
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
    if (s && e) {slots.push({ start: s, end: e });}
  }
  return slots;
}

export async function runBackfill(rbYaml: string, dry = true) {
  const slots = await planBackfill(rbYaml);
  const planned: Array<{ window: { start: string; end: string }; idempotency: string }> = [];
  for (const w of slots) {
    const idempotency =
      `backfill:${ 
      createHash('sha1').update(`${w.start}:${w.end}`).digest('hex')}`;
    const exists = await pgPool.query(
      `SELECT 1 FROM run WHERE idempotency_key=$1`,
      [idempotency],
    );
    if (exists.rowCount) {continue;}
    if (!dry)
      {await startRun({
        runbookYaml: rbYaml,
        runbookRef: 'backfill',
        labels: ['backfill'],
        idempotency,
      });}
    planned.push({ window: w, idempotency });
  }
  return planned;
}
