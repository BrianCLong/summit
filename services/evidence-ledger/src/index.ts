import express from 'express';
import bodyParser from 'body-parser';
import { ledger } from './ledger';
import { z } from 'zod';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Import schemas from telemetry package?
// Since we are in a monorepo and I haven't built the package yet, I might need to rely on the source or just build it.
// But for now, I'll just accept any JSON for the ledger and let the client (telemetry SDK) handle validation before sending.
// Or I can validate generic structure.

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/evidence', (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing body' });
    }

    const entry = ledger.append(data);
    return res.json({
      success: true,
      receipt: {
        index: entry.index,
        hash: entry.hash,
        timestamp: entry.timestamp
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/evidence/:hash', (req, res) => {
  const hash = req.params.hash;
  const entry = ledger.getEntryByHash(hash);
  if (!entry) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(entry);
});

app.get('/verify', (req, res) => {
  const isValid = ledger.verifyIntegrity();
  res.json({ integrity: isValid });
});

app.listen(port, () => {
  console.log(`Evidence Ledger service running at http://localhost:${port}`);
});
