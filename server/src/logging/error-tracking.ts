import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';

export interface ErrorTracker {
  captureException(error: Error, context?: Record<string, any>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
  setUser(user: { id: string; email?: string; username?: string } | null): void;
}

class LocalErrorTracker implements ErrorTracker {
  captureException(error: Error, context?: Record<string, any>): void {
    logger.error({ err: error, ...context }, 'Captured exception');
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    logger[level]({ message }, 'Captured message');
  }

  setUser(user: { id: string; email?: string; username?: string } | null): void {
    // Local logger typically relies on AsyncLocalStorage context for user info
  }
}

class SentryErrorTracker implements ErrorTracker {
  captureException(error: Error, context?: Record<string, any>): void {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    Sentry.captureMessage(message, level as Sentry.SeverityLevel);
  }

  setUser(user: { id: string; email?: string; username?: string } | null): void {
    Sentry.setUser(user);
  }
}

export const initErrorTracking = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
      environment: process.env.NODE_ENV || 'development',
    });
    logger.info('Sentry initialized');
  }
};

// Factory to get the appropriate tracker
export const getErrorTracker = (): ErrorTracker => {
  if (process.env.SENTRY_DSN) {
    return new SentryErrorTracker();
  }
  return new LocalErrorTracker();
};

export const errorTracker = getErrorTracker();
