/**
 * OSINT Service - REST API for OSINT operations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CollectionScheduler } from '@intelgraph/osint-collector';
import { ScraperEngine } from '@intelgraph/web-scraper';
import { AttributionEngine } from '@intelgraph/attribution-engine';

const app = express();
const PORT = process.env.OSINT_SERVICE_PORT || 3010;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize services
const scheduler = new CollectionScheduler();
const scraperEngine = new ScraperEngine();
const attributionEngine = new AttributionEngine();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'osint-service' });
});

// Collection endpoints
app.post('/api/collect', async (req, res) => {
  try {
    const { type, source, target } = req.body;
    res.json({ message: 'Collection started', taskId: `task-${Date.now()}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Scraping endpoints
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, method } = req.body;
    const result = await scraperEngine.scrape({
      id: `scrape-${Date.now()}`,
      url,
      method: method || 'static'
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Attribution endpoints
app.post('/api/attribute', async (req, res) => {
  try {
    const { identifier } = req.body;
    const result = await attributionEngine.attributeIdentity(identifier);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function start() {
  await scraperEngine.initialize();

  app.listen(PORT, () => {
    console.log(`OSINT Service running on port ${PORT}`);
  });
}

start().catch(console.error);

export default app;
