import express, { Request, Response } from 'express';
import { validatePlaybook } from './validate/validatePlaybook';
import { matchPlaybook } from './engine/matchPlaybook';
import playbookFixture from './fixtures/playbook.defensive.example.json';
import evidenceFixture from './fixtures/evidence.sample.json';

const app = express();
app.use(express.json());

// POST /pg/validate-playbook
app.post('/pg/validate-playbook', (req: Request, res: Response) => {
  const playbook = req.body;

  if (!playbook) {
    return res.status(400).json({ error: 'Missing playbook in request body' });
  }

  const report = validatePlaybook(playbook);
  return res.json(report);
});

// POST /pg/match
app.post('/pg/match', (req: Request, res: Response) => {
  const { playbook, actionSignaturesById, evidence } = req.body;

  if (!playbook || !actionSignaturesById || !evidence) {
    return res.status(400).json({ error: 'Missing playbook, actionSignaturesById, or evidence in request body' });
  }

  const hypothesis = matchPlaybook({ playbook, actionSignaturesById, evidence });
  return res.json(hypothesis);
});

// GET /pg/fixtures
app.get('/pg/fixtures', (req: Request, res: Response) => {
  return res.json({
    playbook: playbookFixture,
    evidence: evidenceFixture
  });
});

export function startPGServe(port = 3000) {
  return app.listen(port, () => {
    console.log(`PG Serve listening on port ${port}`);
  });
}

// In case this is run directly
if (require.main === module) {
  startPGServe();
}
