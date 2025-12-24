// @ts-nocheck
/**
 * IntelGraph Logger Utility
 * Simple logger for the ingest service
 */

export const logger = {
  info: (message: string | Record<string, any>) => {
    const msg =
      typeof message === 'string'
        ? { message, timestamp: new Date().toISOString() }
        : { ...message, timestamp: new Date().toISOString() };
    console.info(JSON.stringify(msg));
  },

  error: (message: string | Record<string, any>) => {
    const msg =
      typeof message === 'string'
        ? { message, timestamp: new Date().toISOString() }
        : { ...message, timestamp: new Date().toISOString() };
    console.error(JSON.stringify(msg));
  },

  warn: (message: string | Record<string, any>) => {
    const msg =
      typeof message === 'string'
        ? { message, timestamp: new Date().toISOString() }
        : { ...message, timestamp: new Date().toISOString() };
    console.warn(JSON.stringify(msg));
  },

  debug: (message: string | Record<string, any>) => {
    if (process.env.DEBUG) {
      const msg =
        typeof message === 'string'
          ? { message, timestamp: new Date().toISOString() }
          : { ...message, timestamp: new Date().toISOString() };
      console.debug(JSON.stringify(msg));
    }
  },
};
