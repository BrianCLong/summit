import { getClient } from './client-registry';
import type { BreadcrumbEvent, BreadcrumbOptions } from './types';

export function recordBreadcrumb(options: BreadcrumbOptions): void {
  const breadcrumb: BreadcrumbEvent = {
    category: options.category,
    level: options.level,
    message: options.message,
    data: options.data,
    timestamp: Date.now() / 1000
  };
  getClient().addBreadcrumb(breadcrumb);
}

export function instrumentConsole(levels: Array<'log' | 'warn' | 'error'> = ['log', 'warn', 'error']): () => void {
  const originalConsole: Partial<Record<string, (...args: unknown[]) => void>> = {};
  const restoreFunctions: Array<() => void> = [];

  for (const level of levels) {
    // eslint-disable-next-line no-console
    const original = console[level];
    if (typeof original !== 'function') {
      continue;
    }
    originalConsole[level] = original.bind(console);
    // eslint-disable-next-line no-console
    console[level] = (...args: unknown[]) => {
      const resolvedLevel = level === 'log' ? ('info' as const) : level === 'warn' ? ('warning' as const) : ('error' as const);
      recordBreadcrumb({
        category: 'console',
        level: resolvedLevel,
        message: args.map(arg => String(arg)).join(' ')
      });
      original(...args);
    };
    restoreFunctions.push(() => {
      if (originalConsole[level]) {
        // eslint-disable-next-line no-console
        console[level] = originalConsole[level] as (...args: unknown[]) => void;
      }
    });
  }

  return () => {
    for (const restore of restoreFunctions) {
      restore();
    }
  };
}
