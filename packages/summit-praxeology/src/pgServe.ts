import express from 'express';
import { validatePlaybook } from "./validate/validatePlaybook";
import { matchPlaybook } from "./engine/matchPlaybook";

const app = express();
app.use(express.json());

app.post('/pg/validate-playbook', (req, res) => {
  const report = validatePlaybook(req.body);
  if (report.ok) {
     res.json({ ok: true });
  } else {
     res.status(400).json(report);
  }
});

app.post('/pg/match', (req, res) => {
  const { playbook, actionSignaturesById, evidence } = req.body;
  if (!playbook || !actionSignaturesById || !evidence) {
     return res.status(400).json({ error: "Missing playbook, actionSignaturesById, or evidence" });
  }
  const result = matchPlaybook({ playbook, actionSignaturesById, evidence });
  res.json(result);
});

app.get('/pg/fixtures', (req, res) => {
  res.json({ message: "Fixtures endpoint" });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`PG Serve listening on port ${PORT}`);
  });
}

export default app;
