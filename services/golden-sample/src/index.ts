import { app } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

const server = app.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT}`);
});

const gracefulShutdown = () => {
  logger.info('Received kill signal, shutting down gracefully');
  server.close(() => {
    logger.info('Closed out remaining connections');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
