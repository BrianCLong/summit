const express = require('express');
const { OPAClient } = require('../middleware/opa-abac');
const { logger } = require('../utils/logger');

const router = express.Router();
const opaClient = new OPAClient(process.env.OPA_BASE_URL);

router.post('/simulate', async (req, res) => {
  try {
    const { policy, input } = req.body;

    if (!policy || !input) {
      return res.status(400).json({ error: 'Missing policy or input' });
    }

    const result = await opaClient.evaluate(policy, input);

    res.json({ result });
  } catch (error) {
    logger.error('OPA simulation error:', error);
    res.status(500).json({ error: 'OPA simulation failed' });
  }
});

module.exports = router;
