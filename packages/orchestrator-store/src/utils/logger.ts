// packages/orchestrator-store/src/utils/logger.ts
import { Logger, createLogger, transports, format } from 'winston';

export const logger: Logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'orchestrator-store' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

export default logger;