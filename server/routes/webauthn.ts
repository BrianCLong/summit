import express from 'express';
const r = express.Router();
r.post('/webauthn/challenge', (_req, res) => {
  /* return challenge */ res.json({ challenge: '...' });
});
r.post('/webauthn/verify', (_req, res) => {
  /* verify */ res.json({ ok: true, level: 2 });
});
export default r;
