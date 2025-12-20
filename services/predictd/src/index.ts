import express from 'express';
import bodyParser from 'body-parser';
import { getPredictiveSignals } from '@summit/predictive-graph-intelligence';

const app = express();
const PORT = process.env.PREDICTD_PORT || 4001;

// Middleware
app.use(bodyParser.json());

// Routes
app.get('/api/v1/signals', (req, res) => {
  const signals = getPredictiveSignals();
  res.json({ signals });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Predictd Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  });
}

export default app;
