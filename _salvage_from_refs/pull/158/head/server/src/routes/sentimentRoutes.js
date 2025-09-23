const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const MultimodalSentimentService = require('../services/MultimodalSentimentService');

const router = express.Router();
const svc = new MultimodalSentimentService();

router.use(authenticateToken);

router.post('/analyze', async (req, res) => {
  try {
    const { inputs } = req.body || {};
    const out = svc.analyzeInputs(inputs || []);
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

module.exports = router;

