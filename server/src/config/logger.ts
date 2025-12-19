/**
 * Extremely lightweight logger that avoids any external dependencies.
 * It mirrors the interface used throughout conductor modules while
 * remaining safe to import in minimal environments.
 */
export const logger = {
  info: (...args: any[]) => console?.log?.('[info]', ...args),
  warn: (...args: any[]) => console?.warn?.('[warn]', ...args),
  error: (...args: any[]) => console?.error?.('[error]', ...args),
  debug: (...args: any[]) => console?.debug?.('[debug]', ...args),
};

export default logger;
