/**
 * Reference Data Service
 * Service for distributing and publishing reference data
 */

import express from 'express';
import cors from 'cors';
import { ReferenceDataManager } from '@summit/reference-data';

const app = express();
const PORT = process.env.REF_DATA_SERVICE_PORT || 3101;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize manager
const refDataManager = new ReferenceDataManager();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ref-data-service', timestamp: new Date() });
});

// Code Lists API
app.get('/api/v1/code-lists', async (req, res) => {
  try {
    const codeLists = await refDataManager.getActiveCodeLists();
    res.json({ codeLists });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/code-lists/:name', async (req, res) => {
  try {
    const codeList = await refDataManager.getCodeListByName(req.params.name);
    if (codeList) {
      res.json(codeList);
    } else {
      res.status(404).json({ error: 'Code list not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/code-lists/:name/codes/:code', async (req, res) => {
  try {
    const code = await refDataManager.lookupCode(req.params.name, req.params.code);
    if (code) {
      res.json(code);
    } else {
      res.status(404).json({ error: 'Code not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Reference Data Service running on port ${PORT}`);
});

export default app;
