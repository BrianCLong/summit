export type TestLogger = {
  fatal: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  child: (...args: unknown[]) => TestLogger;
  level: string;
  flush: (...args: unknown[]) => void;
  bindings: () => Record<string, unknown>;
  setBindings: (bindings: Record<string, unknown>) => void;
  isLevelEnabled: (level: string) => boolean;
};

export function createTestLogger(): TestLogger {
  const noop = () => undefined;

  const logger: TestLogger = {
    fatal: noop,
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
    trace: noop,
    child: () => logger,
    level: 'silent',
    flush: noop,
    bindings: () => ({}),
    setBindings: noop,
    isLevelEnabled: () => false,
  };

  return logger;
}

const logger = createTestLogger();

export default logger;
export { logger };
