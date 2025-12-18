import winston from 'winston';
import { appLogger } from './structuredLogger.js';

const stream = {
  write: (message: string) => {
    try {
      const parsed = JSON.parse(message);
      appLogger.info(parsed);
    } catch {
      appLogger.info({ message });
    }
  },
};

export const winstonBridge = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: process.env.SERVICE_NAME || 'summit-api' },
  transports: [new winston.transports.Stream({ stream })],
});
