import 'reflect-metadata';
import { startServer } from './server/http';
import { logger } from './observability/logging';

const main = async () => {
  try {
    startServer();
  } catch (error) {
    logger.error('Failed to start the application', { error });
    process.exit(1);
  }
};

main();
