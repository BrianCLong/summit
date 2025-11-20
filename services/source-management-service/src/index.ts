import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { SourceDatabase } from '@intelgraph/source-database';
import { HandlerTools } from '@intelgraph/handler-tools';

const app = express();
const port = process.env.SOURCE_MGMT_SERVICE_PORT || 3101;

// Initialize components
const sourceDb = new SourceDatabase();
const handlerTools = new HandlerTools();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'source-management-service' });
});

// Source CRUD operations
app.post('/api/sources', (req, res) => {
  try {
    const source = sourceDb.createSource(req.body);
    res.status(201).json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sources', (req, res) => {
  try {
    const { status, handlerId } = req.query;

    let sources;
    if (status) {
      sources = sourceDb.getSourcesByStatus(status as any);
    } else if (handlerId) {
      sources = sourceDb.getSourcesByHandler(handlerId as string);
    } else {
      sources = sourceDb.getAllSources();
    }

    res.json(sources);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sources/:id', (req, res) => {
  try {
    const source = sourceDb.getSource(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json(source);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sources/:id', (req, res) => {
  try {
    const source = sourceDb.updateSource(req.params.id, req.body);
    res.json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sources/:id/terminate', (req, res) => {
  try {
    const { reason } = req.body;
    const source = sourceDb.terminateSource(req.params.id, reason);
    res.json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sources/:id/compromise', (req, res) => {
  try {
    const { details } = req.body;
    const source = sourceDb.markCompromised(req.params.id, details);
    res.json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Contact logging
app.post('/api/sources/:sourceId/contacts', (req, res) => {
  try {
    const contact = sourceDb.logContact({
      sourceId: req.params.sourceId,
      ...req.body
    });
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sources/:sourceId/contacts', (req, res) => {
  try {
    const contacts = sourceDb.getSourceContacts(req.params.sourceId);
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Network relationships
app.post('/api/sources/:sourceId/network', (req, res) => {
  try {
    const network = sourceDb.addNetworkRelationship({
      sourceId: req.params.sourceId,
      ...req.body
    });
    res.status(201).json(network);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sources/:sourceId/network', (req, res) => {
  try {
    const network = sourceDb.getSourceNetwork(req.params.sourceId);
    res.json(network);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Compensation
app.post('/api/sources/:sourceId/compensation', (req, res) => {
  try {
    const record = sourceDb.recordCompensation({
      sourceId: req.params.sourceId,
      ...req.body
    });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sources/:sourceId/compensation', (req, res) => {
  try {
    const records = sourceDb.getSourceCompensation(req.params.sourceId);
    const total = sourceDb.getTotalCompensation(req.params.sourceId);
    res.json({ records, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vetting
app.post('/api/sources/:sourceId/vetting', (req, res) => {
  try {
    const record = sourceDb.addVettingRecord({
      sourceId: req.params.sourceId,
      ...req.body
    });
    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sources/:sourceId/vetting', (req, res) => {
  try {
    const records = sourceDb.getSourceVetting(req.params.sourceId);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Productivity scoring
app.get('/api/sources/:sourceId/productivity', (req, res) => {
  try {
    const score = sourceDb.calculateProductivityScore(req.params.sourceId);
    res.json({ sourceId: req.params.sourceId, productivityScore: score });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Handler workload
app.get('/api/handlers/:handlerId/workload', (req, res) => {
  try {
    const sources = sourceDb.getSourcesByHandler(req.params.handlerId);
    const activeSources = sources.filter(s => s.status === 'ACTIVE');

    const workload = handlerTools.calculateHandlerWorkload(
      req.params.handlerId,
      sources.length,
      activeSources.length
    );

    res.json(workload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics
app.get('/api/statistics', (req, res) => {
  try {
    const stats = sourceDb.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search
app.post('/api/sources/search', (req, res) => {
  try {
    const sources = sourceDb.searchSources(req.body);
    res.json(sources);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Source Management Service running on port ${port}`);
});

export default app;
