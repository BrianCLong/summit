import { startWorker } from './worker.js';
import { startServer } from './server.js';
import { closeBrowser } from './renderer.js';

async function main() {
  const worker = startWorker();
  startServer();

  const shutdown = async () => {
    console.log('Shutting down...');
    await worker.close();
    await closeBrowser();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(console.error);
