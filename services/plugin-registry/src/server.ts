import express from 'express';
import rateLimit from 'express-rate-limit';
import { PluginRegistryService } from './PluginRegistryService.js';
import { createPluginRoutes } from './routes/pluginRoutes.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize services
const registryService = new PluginRegistryService();

// Routes
app.use('/api/plugins', createPluginRoutes(registryService));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'plugin-registry' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(port, () => {
  console.log(`Plugin registry service listening on port ${port}`);
});
