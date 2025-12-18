import express from 'express';
import { ReportServiceV2 } from '../services/reporting/ReportServiceV2.js';

const router = express.Router();
const reportService = new ReportServiceV2();

router.post('/publish', async (req, res) => {
  try {
    const result = await reportService.createReport(req.body);
    res.json(result);
  } catch (error: any) {
    if (error.message.startsWith('BLOCK:')) {
      res.status(400).json({ error: error.message, code: 'CITATION_REQUIRED' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
