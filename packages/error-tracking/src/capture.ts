import { getClient } from './client-registry';

export function captureException(error: unknown): string | undefined {
  return getClient().captureException(error);
}

export function captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'error'): string | undefined {
  return getClient().captureMessage(message, level);
}
