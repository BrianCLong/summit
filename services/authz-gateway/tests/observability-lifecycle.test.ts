import { afterEach, describe, expect, it, jest } from '@jest/globals';

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.NODE_ENV = 'test';
  delete process.env.OTEL_SDK_DISABLED;
  jest.dontMock('@opentelemetry/sdk-node');
});

describe('observability lifecycle', () => {
  it('starts and stops the OTEL SDK when enabled', async () => {
    const startMock = jest.fn(async () => undefined);
    const shutdownMock = jest.fn(async () => undefined);
    jest.doMock('@opentelemetry/sdk-node', () => ({
      NodeSDK: jest.fn().mockImplementation(() => ({
        start: startMock,
        shutdown: shutdownMock,
      })),
    }));
    process.env.NODE_ENV = 'production';
    process.env.OTEL_SDK_DISABLED = 'false';
    const observability = await import('../src/observability');
    await observability.startObservability();
    await observability.stopObservability();
    expect(startMock).toHaveBeenCalled();
    expect(shutdownMock).toHaveBeenCalled();
  });
});
