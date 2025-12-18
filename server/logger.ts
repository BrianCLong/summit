import { appLogger } from './src/logging/structuredLogger.js';

export const logger = appLogger;

const rate = Number(process.env.LOG_SAMPLE_RATE || '1.0');
export function maybeLog(level: 'info' | 'warn' | 'error', obj: any) {
  if (level === 'error' || Math.random() < rate) logger[level](obj);
}
