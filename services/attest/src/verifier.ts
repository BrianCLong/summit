import express from 'express';
import crypto from 'crypto';
const app = express();
app.use(express.json());
const ALLOW = new Set(
  (process.env.MEAS_ALLOWLIST || '').split(',').filter(Boolean),
);
app.post('/verify', (req, res) => {
  const { nodeId, provider, reportB64 } = req.body;
  // TODO: call AMD/Intel verification service; parse claims → measurement digest
  const measurement = crypto
    .createHash('sha256')
    .update(Buffer.from(reportB64, 'base64'))
    .digest('hex');
  const ok = ALLOW.has(measurement);
  res.json({ ok, measurement, provider, ts: new Date().toISOString() });
});
app.listen(process.env.PORT || 4040);
