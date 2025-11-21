import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { PluginGateway } from './PluginGateway.js';
import { RateLimiter } from './middleware/RateLimiter.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { RequestLogger } from './middleware/RequestLogger.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = process.env.PORT || 3003;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Initialize gateway
const gateway = new PluginGateway();

// Global middleware
app.use(RequestLogger.middleware());
app.use(AuthMiddleware.middleware());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'plugin-gateway' });
});

// Plugin endpoint routing with rate limiting
app.use('/api/plugins/:pluginId/*', RateLimiter.perPlugin(), async (req, res, next) => {
  const { pluginId } = req.params;

  try {
    // Validate plugin exists and is enabled
    const plugin = await gateway.getPlugin(pluginId);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    if (plugin.state !== 'active') {
      return res.status(503).json({ error: 'Plugin is not active' });
    }

    // Check permissions
    const hasPermission = await gateway.checkPermission(
      pluginId,
      req.path,
      req.method,
      (req as any).user
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Transform request if needed
    const transformedReq = await gateway.transformRequest(pluginId, req);

    // Route to plugin executor
    const response = await gateway.routeToPlugin(pluginId, transformedReq);

    // Transform response if needed
    const transformedRes = await gateway.transformResponse(pluginId, response);

    res.status(transformedRes.status).json(transformedRes.body);
  } catch (error) {
    next(error);
  }
});

// Webhook endpoint
app.post('/webhooks/:pluginId/:webhookId', RateLimiter.perPlugin(), async (req, res, next) => {
  const { pluginId, webhookId } = req.params;

  try {
    await gateway.handleWebhook(pluginId, webhookId, req.body, req.headers);
    res.status(202).json({ accepted: true });
  } catch (error) {
    next(error);
  }
});

// Plugin API documentation
app.get('/api/plugins/:pluginId/docs', async (req, res, next) => {
  const { pluginId } = req.params;

  try {
    const docs = await gateway.getPluginDocs(pluginId);
    res.json(docs);
  } catch (error) {
    next(error);
  }
});

// Gateway metrics
app.get('/metrics', AuthMiddleware.requireAdmin(), async (req, res) => {
  const metrics = await gateway.getMetrics();
  res.json(metrics);
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code,
  });
});

app.listen(port, () => {
  console.log(`Plugin gateway listening on port ${port}`);
});
