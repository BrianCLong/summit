import { createRuntime } from '../src/runtime/core.js';
import type { NanoEvent, NanoPlugin, RuntimeContext } from '../src/runtime/types.js';

const noopEvent: NanoEvent = {
  type: 'noop',
  payload: {},
  timestamp: new Date()
};

describe('LiquidNanoRuntime', () => {
  it('initializes with defaults and registers plugins', async () => {
    const runtime = createRuntime();
    const plugin: NanoPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      supportsEvent: () => true,
      onEvent: jest.fn(),
      onRegister: jest.fn(),
      onShutdown: jest.fn()
    };
    runtime.registerPlugin(plugin);
    await runtime.start();
    expect(runtime.listPlugins()).toEqual(['test-plugin']);
    await runtime.emit(noopEvent);
    expect(plugin.onEvent).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    await runtime.shutdown();
    expect(plugin.onShutdown).toHaveBeenCalled();
  });

  it('records diagnostics and metrics for processed events', async () => {
    const runtime = createRuntime();
    const spy = jest.fn();
    runtime.registerPlugin({
      name: 'spy',
      version: '0.0.1',
      supportsEvent: (event) => event.type === 'tracked',
      onEvent: async (event: NanoEvent, context: RuntimeContext) => {
        spy(event);
        context.metrics.recordGauge('custom.gauge', 42);
      }
    });
    await runtime.start();
    await runtime.emit({
      type: 'tracked',
      payload: { value: 7 },
      timestamp: new Date(),
      metadata: { correlationId: 'abc-123' }
    });
    const snapshot = runtime.snapshot();
    expect(snapshot['runtime.events.total']).toBe(1);
    expect(snapshot['plugin.spy.processed']).toBe(1);
    expect(snapshot['custom.gauge']).toBe(42);
    const diagnostics = runtime.flushDiagnostics();
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]?.status).toBe('processed');
  });

  it('surfaces plugin errors when signature validation enabled', async () => {
    const runtime = createRuntime({
      config: {
        ...createRuntime().context.config,
        security: {
          allowDynamicPlugins: true,
          redactFields: [],
          validateSignatures: true
        }
      }
    });
    runtime.registerPlugin({
      name: 'failing',
      version: '0.1.0',
      supportsEvent: () => true,
      onEvent: () => {
        throw new Error('failure');
      }
    });
    await runtime.start();
    await expect(runtime.emit(noopEvent)).rejects.toThrow('failure');
  });

  it('logs when no plugin handles an event and continues when signatures disabled', async () => {
    const runtime = createRuntime({
      config: {
        ...createRuntime().context.config,
        security: {
          allowDynamicPlugins: true,
          redactFields: [],
          validateSignatures: false
        }
      }
    });
    runtime.registerPlugin({
      name: 'failing-soft',
      version: '0.1.0',
      supportsEvent: (event) => event.type === 'handled',
      onEvent: () => {
        throw new Error('ignored');
      }
    });
    await runtime.start();
    await expect(runtime.emit({ ...noopEvent, type: 'handled' })).resolves.toBeUndefined();
    await expect(runtime.emit({ ...noopEvent, type: 'unhandled' })).resolves.toBeUndefined();
  });

  it('prevents registering plugins after start when dynamic loading disabled', async () => {
    const runtime = createRuntime();
    await runtime.start();
    expect(() =>
      runtime.registerPlugin({
        name: 'late',
        version: '0.0.1',
        supportsEvent: () => true,
        onEvent: () => undefined
      })
    ).toThrow('cannot register plugins while runtime is running');
  });

  it('warns on duplicate start invocations', async () => {
    const runtime = createRuntime();
    await runtime.start();
    await expect(runtime.start()).resolves.toBeUndefined();
  });
});
