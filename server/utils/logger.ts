import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.colorize({ all: nodeEnv === 'development' }),
  ),
  defaultMeta: {
    service: 'maestro-conductor-v03',
    version: process.env.npm_package_version || '0.3.0',
  },
  transports: [
    new winston.transports.Console({
      format:
        nodeEnv === 'development'
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            )
          : winston.format.json(),
    }),
  ],
});

// Add file transport for production
if (nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/maestro-error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/maestro-combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  );
}

export { logger };
