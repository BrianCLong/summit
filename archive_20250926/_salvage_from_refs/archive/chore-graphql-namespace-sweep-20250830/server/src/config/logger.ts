import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
const pretty = process.env.PINO_PRETTY === '1';

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    browser: { asObject: true },
    // Disable transports in tests to avoid worker_thread + ESM target resolution issues
    transport: isTest
      ? undefined
      : (pretty
          ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:standard' } }
          : undefined),
  },
  isTest ? undefined : (pino as any).destination?.(1),
);

export default logger;
