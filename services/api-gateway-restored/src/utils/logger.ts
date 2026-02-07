import winston from 'winston';

const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDev
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        )
      : winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    ...(isDev
      ? []
      : [
          new winston.transports.File({
            filename: 'error.log',
            level: 'error',
          }),
          new winston.transports.File({ filename: 'combined.log' }),
        ]),
  ],
});
