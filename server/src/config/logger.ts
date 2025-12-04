import pino from 'pino';

// List of sensitive keys to redact
const REDACT_KEYS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'jwt.secret',
  'jwt.refreshSecret',
  'neo4j.password',
  'postgres.password',
  'redis.password',
  'OPENAI_API_KEY',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACT_KEYS,
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  browser: {
    asObject: true,
  },
});

export default logger;
