import { Router } from 'express';
import Ajv from 'ajv';
import { Pool } from 'pg';
const r = Router();
const ajv = new Ajv({ allErrors: true });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
// (For brevity we assume schema loaded at startup)
r.post('/openlineage', async (req, res) => {
  const ev = req.body;
  // validate(ev) ... (omitted), then store
  await pg.query(
    `INSERT INTO openlineage_events(run_id, step_id, event_time, event_type, payload)
                  VALUES ($1,$2,$3,$4,$5)`,
    [
      ev?.run?.facets?.runId,
      ev?.job?.facets?.stepId,
      ev.eventTime,
      ev.eventType,
      ev,
    ],
  );
  res.status(202).json({ ok: true });
});
export default r;
