const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const MLController = require('../controllers/MLController');

const router = express.Router();
const controller = new MLController();

router.use(authenticateToken);

router.post('/train', async (req, res) => {
  await controller.trainModel(req, res);
});

router.post('/suggest-links', async (req, res) => {
  await controller.suggestLinks(req, res);
});

module.exports = router;

