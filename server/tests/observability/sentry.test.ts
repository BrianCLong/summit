import { sentryErrorMiddleware } from '../../src/logging/error-tracking';

describe('Sentry Integration', () => {
  it('should export error middleware', () => {
    expect(typeof sentryErrorMiddleware).toBe('function');
  });
});
