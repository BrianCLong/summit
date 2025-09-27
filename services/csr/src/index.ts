import express, { Request, Response } from 'express';
import { ConsentStateReconciler } from './reconciler';
import { ConsentRecord } from './types';
import { SourcePrecedenceConfig } from './config';

const app = express();
app.use(express.json());

const precedenceEnv = process.env.CSR_SOURCE_PRECEDENCE;
let precedenceConfig: SourcePrecedenceConfig | undefined;
if (precedenceEnv) {
  const sources = precedenceEnv
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (sources.length > 0) {
    precedenceConfig = { sources };
  }
}

const reconciler = new ConsentStateReconciler(precedenceConfig);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/ingest', (req: Request, res: Response) => {
  const { records } = req.body as { records?: ConsentRecord[] };
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records payload must be an array' });
  }

  const missing = records.filter((record) => !record.recordId || !record.subjectId || !record.consentType || !record.status || !record.source || !record.timestamp);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'each record must include recordId, subjectId, consentType, status, source, timestamp' });
  }

  try {
    const result = reconciler.ingest(records);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/diff/:snapshotId', (req: Request, res: Response) => {
  const { snapshotId } = req.params;
  try {
    const result = reconciler.diff(snapshotId);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.post('/rollback', (req: Request, res: Response) => {
  const { snapshotId } = req.body as { snapshotId?: string };
  if (!snapshotId) {
    return res.status(400).json({ error: 'snapshotId is required' });
  }
  try {
    const snapshot = reconciler.rollback(snapshotId);
    res.json({ snapshotId: snapshot.id, restoredAt: new Date().toISOString() });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.get('/state/:subjectId', (req: Request, res: Response) => {
  const { subjectId } = req.params;
  const state = reconciler.getSubjectState(subjectId);
  if (!state) {
    return res.status(404).json({ error: 'subject not found' });
  }
  res.json({ subjectId, state });
});

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Consent State Reconciler listening on port ${port}`);
});

export default app;
