import express from 'express';
import { secureApp } from '../../libs/ops/src/http-secure';
import { csrfGuard } from '../../libs/ops/src/auth';
import { log } from '../../libs/ops/src/log';
import { PluginExecutor } from './PluginExecutor.js';
import { createExecutorRoutes } from './routes/executorRoutes.js';

const app = express();
const port = process.env.PORT || 3002;

secureApp(app);
app.use(log);
app.use(express.json());
app.use(csrfGuard());

// Initialize executor
const executor = new PluginExecutor();

// Routes
app.use('/api/execute', createExecutorRoutes(executor));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'plugin-executor' });
});

app.listen(port, () => {
  console.log(`Plugin executor service listening on port ${port}`);
});
