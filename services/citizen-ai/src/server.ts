/**
 * Citizen AI Service Server
 */

import { createApp } from './api';

const PORT = parseInt(process.env.PORT || '3020', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down Citizen AI Service...');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, HOST, () => {
  console.log(`Citizen AI Service running at http://${HOST}:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/conversation - Process conversation message');
  console.log('  POST /api/nlu/analyze - NLU analysis');
  console.log('  GET  /api/health - Health check');
});
