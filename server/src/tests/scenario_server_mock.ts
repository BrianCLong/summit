import express from 'express';
import { killSwitchGuard } from '../middleware/kill-switch.js';

const app = express();
const port = 3001;

// Mock Maestro Route (Protected)
app.get('/api/maestro/runs', killSwitchGuard('maestro'), (req, res) => {
  res.json({ status: 'ok', runs: [] });
});

// Mock Non-Maestro Route (Public/Other)
app.get('/api/other', (req, res) => {
  res.json({ status: 'ok', data: 'other' });
});

app.listen(port, () => {
  console.log(`Mock server listening on port ${port}`);
});
