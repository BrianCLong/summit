import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import {
  initialiseNodeSdk,
  registerNodeGlobalHandlers,
  initialiseBrowserSdk,
  registerBrowserGlobalHandlers,
  recordBreadcrumb,
  instrumentConsole,
  setUserContext,
  clearUserContext,
  withScope,
  withSpan,
  withTransaction,
  captureException,
  captureMessage,
  createAlertRule,
  uploadSourceMaps,
  createErrorBoundary
} from '../src/index';
import { resolveNodeConfig } from '../src/config';
import { resetClient } from '../src/client-registry';
import { resetNodeState } from '../src/node';
import { resetBrowserState } from '../src/browser';

type MockFn<TArgs extends unknown[] = unknown[], TResult = unknown> = ((
  ...args: TArgs
) => TResult) & { calls: TArgs[] };

function createMockFn<TArgs extends unknown[] = unknown[], TResult = unknown>(
  implementation?: (...args: TArgs) => TResult
): MockFn<TArgs, TResult> {
  const fn = ((...args: TArgs) => {
    fn.calls.push(args);
    if (implementation) {
      return implementation(...args);
    }
    return undefined as TResult;
  }) as MockFn<TArgs, TResult>;
  fn.calls = [];
  return fn;
}

interface SpanMock {
  setStatus: MockFn<[string], void>;
  finish: MockFn<[], void>;
}

function createSpanMock(): SpanMock {
  return {
    setStatus: createMockFn(),
    finish: createMockFn()
  };
}

function createNodeSdkMock() {
  const spans: SpanMock[] = [];
  const transactions: SpanMock[] = [];
  const scopeTags: Array<Array<[string, string]>> = [];
  const configureScope = createMockFn((callback: (scope: { setTag: MockFn<[string, string], void> }) => void) => {
    const tags: Array<[string, string]> = [];
    const setTag = createMockFn<[string, string], void>((key, value) => {
      tags.push([key, value]);
    });
    callback({ setTag });
    scopeTags.push(tags);
  });

  const sdk = {
    init: createMockFn(),
    captureException: createMockFn(),
    captureMessage: createMockFn(),
    addBreadcrumb: createMockFn(),
    setUser: createMockFn(),
    configureScope,
    startTransaction: createMockFn(() => {
      const span = createSpanMock();
      transactions.push(span);
      return span;
    }),
    startSpan: createMockFn(() => {
      const span = createSpanMock();
      spans.push(span);
      return span;
    }),
    flush: createMockFn(async () => undefined)
  };

  return { sdk, spans, transactions, scopeTags };
}

function createBrowserSdkMock() {
  const transactions: SpanMock[] = [];
  const configureScope = createMockFn((callback: (scope: { setTag: MockFn<[string, string], void> }) => void) => {
    callback({ setTag: createMockFn() });
  });

  const sdk = {
    init: createMockFn(),
    captureException: createMockFn(),
    captureMessage: createMockFn(),
    addBreadcrumb: createMockFn(),
    setUser: createMockFn(),
    configureScope,
    startTransaction: createMockFn(() => {
      const transaction = createSpanMock();
      transactions.push(transaction);
      return transaction;
    })
  };

  return { sdk, transactions };
}

function createCliMock() {
  const releases = {
    new: createMockFn(async () => undefined),
    uploadSourceMaps: createMockFn(async () => undefined),
    finalize: createMockFn(async () => undefined)
  };

  class FakeCli {
    public readonly releases = releases;
    public readonly authToken: string;

    constructor(_: unknown, options: { authToken: string }) {
      this.authToken = options.authToken;
    }
  }

  return { FakeCli, releases };
}

describe('error-tracking package', () => {
  beforeEach(() => {
    resetClient();
    resetNodeState();
    resetBrowserState();
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
  });

  it('builds node config from env overrides', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    process.env.SENTRY_ENVIRONMENT = 'staging';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.3';

    const config = resolveNodeConfig({ enableTracing: true });

    assert.equal(config.dsn, 'https://dsn.example');
    assert.equal(config.environment, 'staging');
    assert.equal(config.tracesSampleRate, 0.3);
  });

  it('initialises node sdk exactly once and registers client', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const nodeMock = createNodeSdkMock();

    initialiseNodeSdk({ environment: 'production' }, nodeMock.sdk);
    initialiseNodeSdk({ environment: 'production' }, nodeMock.sdk);

    assert.equal(nodeMock.sdk.init.calls.length, 1);
    captureMessage('hello', 'info');
    assert.deepEqual(nodeMock.sdk.captureMessage.calls[0], ['hello', 'info']);
  });

  it('registers node global handlers and forwards errors', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const nodeMock = createNodeSdkMock();
    initialiseNodeSdk({}, nodeMock.sdk);

    const originalProcessOn = process.on;
    const events: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];
    (process as unknown as { on: typeof process.on }).on = ((event, handler) => {
      events.push({ event, handler });
      return process;
    }) as typeof process.on;

    try {
      registerNodeGlobalHandlers();
      registerNodeGlobalHandlers();
    } finally {
      (process as unknown as { on: typeof process.on }).on = originalProcessOn;
    }

    assert.equal(events.length, 2);
    const error = new Error('boom');
    events[0]?.handler(error);
    assert.equal(nodeMock.sdk.captureException.calls[0][0], error);
  });

  it('initialises browser sdk and captures breadcrumb', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const browserMock = createBrowserSdkMock();
    initialiseBrowserSdk({ environment: 'production' }, browserMock.sdk);

    const originalWindow = (globalThis as { window?: unknown }).window;
    const events: Array<{ name: string; handler: (payload: any) => void }> = [];
    (globalThis as { window?: unknown }).window = {
      addEventListener: (name: string, handler: (payload: any) => void) => {
        events.push({ name, handler });
      }
    } as unknown as Window;

    try {
      registerBrowserGlobalHandlers();
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }

    recordBreadcrumb({ category: 'ui', message: 'clicked' });
    assert.equal(browserMock.sdk.addBreadcrumb.calls.length, 1);
    assert.equal(events[0]?.name, 'error');
    assert.equal(events[1]?.name, 'unhandledrejection');
  });

  it('instruments console calls for breadcrumb capture', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const browserMock = createBrowserSdkMock();
    initialiseBrowserSdk({}, browserMock.sdk);

    const captured: unknown[][] = [];
    const originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args);
    };
    const restoreConsole = instrumentConsole(['log']);

    try {
      console.log('test message');
    } finally {
      restoreConsole();
      console.log = originalConsoleLog;
    }

    assert.equal(browserMock.sdk.addBreadcrumb.calls.length, 1);
    assert.deepEqual(browserMock.sdk.addBreadcrumb.calls[0][0]?.message, 'test message');
    assert.equal(captured.length, 1);
  });

  it('sets and clears user context', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const nodeMock = createNodeSdkMock();
    initialiseNodeSdk({}, nodeMock.sdk);

    setUserContext({ id: '123', email: 'agent@summit.dev' });
    assert.deepEqual(nodeMock.sdk.setUser.calls[0][0], { id: '123', email: 'agent@summit.dev' });

    clearUserContext();
    assert.equal(nodeMock.sdk.setUser.calls.at(-1)?.[0], null);
  });

  it('applies scope tags within scoped callbacks', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const nodeMock = createNodeSdkMock();
    initialiseNodeSdk({}, nodeMock.sdk);

    withScope({ feature: 'beta', tenant: 'acme' }, () => undefined);

    assert.deepEqual(nodeMock.scopeTags[0], [
      ['feature', 'beta'],
      ['tenant', 'acme']
    ]);
  });

  it('wraps async operations with spans and transactions', async () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const nodeMock = createNodeSdkMock();
    initialiseNodeSdk({}, nodeMock.sdk);

    await withSpan({ name: 'child' }, async () => 'ok');
    await withTransaction({ name: 'root' }, async () => 'done');

    assert.equal(nodeMock.sdk.startSpan.calls.length, 1);
    assert.equal(nodeMock.sdk.startTransaction.calls.length, 1);
    assert.equal(nodeMock.spans[0]?.setStatus.calls[0][0], 'ok');
    assert.equal(nodeMock.transactions[0]?.setStatus.calls[0][0], 'ok');
  });

  it('captures exceptions and messages', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const nodeMock = createNodeSdkMock();
    initialiseNodeSdk({}, nodeMock.sdk);

    const error = new Error('boom');
    captureException(error);
    captureMessage('boom', 'error');

    assert.equal(nodeMock.sdk.captureException.calls[0][0], error);
    assert.deepEqual(nodeMock.sdk.captureMessage.calls[0], ['boom', 'error']);
  });

  it('creates alert rules with validation', () => {
    const rule = createAlertRule(
      'High error rate',
      'production',
      'team:platform',
      { errorCountThreshold: 50 },
      { emails: ['alerts@summit.dev'] }
    );

    assert.equal(rule.conditions.length, 1);
    assert.equal(rule.actions.length, 1);

    assert.throws(() => createAlertRule('invalid', 'prod', 'team:platform', {}, {}));
    assert.throws(() =>
      createAlertRule('invalid', 'prod', 'team:platform', { errorCountThreshold: 1 }, {})
    );
  });

  it('uploads source maps with provided cli implementation', async () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const { FakeCli, releases } = createCliMock();
    const nodeMock = createNodeSdkMock();
    initialiseNodeSdk({}, nodeMock.sdk);

    await uploadSourceMaps(
      {
        authToken: 'token',
        org: 'summit',
        project: 'intelgraph',
        release: '1.2.3',
        include: ['dist/assets']
      },
      FakeCli as unknown as typeof import('@sentry/cli').default
    );

    assert.equal(releases.new.calls.length, 1);
    assert.equal(releases.uploadSourceMaps.calls.length, 1);
    assert.equal(releases.finalize.calls.length, 1);
  });

  it('creates error boundaries with callbacks', () => {
    process.env.SENTRY_DSN = 'https://dsn.example';
    const browserMock = createBrowserSdkMock();
    initialiseBrowserSdk({}, browserMock.sdk);

    const onError: MockFn<[Error, string], void> = createMockFn();
    const onReset: MockFn<[], void> = createMockFn();
    const ErrorBoundary = createErrorBoundary({
      fallback: ({ error }) => createElement('div', undefined, error.message),
      onError,
      onReset
    });

    assert.equal(typeof ErrorBoundary, 'function');
    const element = ErrorBoundary({ children: createElement('div') });
    assert.ok(element);
    assert.equal(onError.calls.length, 0);
    assert.equal(onReset.calls.length, 0);
  });
});
