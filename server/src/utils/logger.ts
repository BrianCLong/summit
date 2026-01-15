import * as pinoPkg from 'pino';

// Handle different pino export formats (standard, default, mocked)
// @ts-ignore
let pino: any = pinoPkg.pino || pinoPkg.default || (typeof pinoPkg === 'function' ? pinoPkg : null);

if (!pino && (pinoPkg as any).default && typeof (pinoPkg as any).default === 'function') {
  pino = (pinoPkg as any).default;
}

// Fallback for tests if pino initialization fails
if (typeof pino !== 'function') {
  pino = () => ({
    info: () => { }, error: () => { }, warn: () => { }, debug: () => { },
    child: function () { return this; },
    level: 'info'
  });
}

/**
 * Global application logger configured with Pino.
 */
// @ts-ignore - pino types conflict with module resolution
const pinoLogger = (pino as any)({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'intelgraph-api' },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
});

export const logger = pinoLogger;
export type Logger = typeof pinoLogger;
export default pinoLogger;
