import { config } from './config.js';
import { logger } from './middleware/logging.js';
import { createServer } from './server.js';

const app = createServer();

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'golden-path service started');
});
