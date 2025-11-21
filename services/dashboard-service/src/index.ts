import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { DashboardService } from './services/DashboardService';
import { setupGraphQL } from './graphql';
import { setupWebSocket } from './websocket';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize services
const dashboardService = new DashboardService();

// Setup GraphQL
setupGraphQL(app, dashboardService);

// Setup WebSocket for real-time updates
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

setupWebSocket(io, dashboardService);

// REST API endpoints (alternative to GraphQL)
app.get('/api/dashboards', async (req, res) => {
  try {
    const dashboards = await dashboardService.listDashboards(req.query);
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

app.get('/api/dashboards/:id', async (req, res) => {
  try {
    const dashboard = await dashboardService.getDashboard(req.params.id);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

app.post('/api/dashboards', async (req, res) => {
  try {
    const dashboard = await dashboardService.createDashboard(req.body);
    res.status(201).json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

app.put('/api/dashboards/:id', async (req, res) => {
  try {
    const dashboard = await dashboardService.updateDashboard(req.params.id, req.body);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

app.delete('/api/dashboards/:id', async (req, res) => {
  try {
    await dashboardService.deleteDashboard(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

app.post('/api/dashboards/:id/export', async (req, res) => {
  try {
    const { format } = req.body;
    const result = await dashboardService.exportDashboard(req.params.id, format);
    res.json({ url: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export dashboard' });
  }
});

// Widget templates
app.get('/api/widgets/templates', async (req, res) => {
  try {
    const templates = await dashboardService.getWidgetTemplates(req.query.category as string);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch widget templates' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Dashboard service running on port ${PORT}`);
  console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`REST API: http://localhost:${PORT}/api`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

export { app, httpServer };
