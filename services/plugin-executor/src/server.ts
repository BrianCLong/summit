import express from 'express';
import { PluginExecutor } from './PluginExecutor.js';
import { createExecutorRoutes } from './routes/executorRoutes.js';

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());

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
