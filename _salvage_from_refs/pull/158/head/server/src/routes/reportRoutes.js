const express = require('express');
const ReportController = require('../controllers/ReportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const controller = new ReportController(console);

router.use(authenticateToken);

router.post('/generate', async (req, res) => {
  await controller.generate(req, res);
});

module.exports = router;

