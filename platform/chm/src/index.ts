import { loadConfig } from './config.js';
import { createPool, initSchema } from './db.js';
import { createApp } from './server.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);

const bootstrap = async () => {
  await initSchema(pool);
  const app = createApp({ pool, config });
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`CHM service listening on port ${config.port}`);
  });
};

bootstrap();
