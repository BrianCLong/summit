import { config as loadEnv } from 'dotenv';
import { loadConfig } from './config.js';
import { createServer } from './server.js';

loadEnv();

async function main() {
  const config = loadConfig(process.env);
  const { start } = await createServer(config);
  await start();
}

main().catch((error) => {
  console.error('Failed to start graph subgraph', error);
  process.exit(1);
});
