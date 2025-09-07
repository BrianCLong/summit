import express from 'express';

const router = express.Router();

router.get('/controls', async (_req, res) => {
  const rows = [
    { id: 'SOC2-CC2.1', status: 'green', evidenceUri: '/docs/compliance/soc2-cc2.1.pdf' },
    { id: 'NIST-AC-2', status: 'green', evidenceUri: '/docs/compliance/nist-ac-2.json' },
  ];
  res.json(rows);
});

export default router;
