import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(): Logger {
  return pino({
    name: 'ops-guard',
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers.authorization']
  });
}
