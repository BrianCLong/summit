import express from 'express';
import { body, validationResult } from 'express-validator';
import AssistantService from '../ai/services/AssistantService.js';

const router = express.Router();
const service = new AssistantService();

router.post(
  '/chat',
  [body('message').isString().notEmpty(), body('context').optional().isObject()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { message, context = {} } = req.body;

    try {
      const reply = await service.chat(message, context);
      res.json({ reply });
    } catch {
      res.status(500).json({ error: 'Assistant error' });
    }
  }
);

export default router;
