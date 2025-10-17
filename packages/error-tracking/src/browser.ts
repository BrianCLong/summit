import { createRequire } from 'node:module';
import { registerClient } from './client-registry';
import type { RegisteredClient } from './client-registry';
import { resolveBrowserConfig } from './config';
import type { BreadcrumbEvent, BrowserErrorTrackingConfig, SpanLike } from './types';

type BrowserOptionsLike = Record<string, unknown>;

interface BrowserSdkLike {
  init: (options: BrowserOptionsLike) => void;
  captureException: (error: unknown) => string | undefined;
  captureMessage: (message: string, context?: unknown) => string | undefined;
  addBreadcrumb: (breadcrumb: BreadcrumbEvent) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  configureScope: (callback: (scope: { setTag: (key: string, value: string) => void }) => void) => void;
  startTransaction?: (...args: unknown[]) => SpanLike;
}

const require = createRequire(import.meta.url);

function createSpanStub(): SpanLike {
  return {
    setStatus: () => undefined,
    finish: () => undefined
  };
}

function createNoopBrowserSdk(): BrowserSdkLike {
  return {
    init: () => undefined,
    captureException: () => undefined,
    captureMessage: () => undefined,
    addBreadcrumb: () => undefined,
    setUser: () => undefined,
    configureScope: () => undefined,
    startTransaction: () => createSpanStub()
  };
}

const defaultBrowserSdk: BrowserSdkLike = (() => {
  try {
    return require('@sentry/react') as BrowserSdkLike;
  } catch {
    return createNoopBrowserSdk();
  }
})();

let browserInitialised = false;
let browserHandlersRegistered = false;
let activeSdk: BrowserSdkLike = defaultBrowserSdk;

function buildBrowserOptions(config: BrowserErrorTrackingConfig): BrowserOptionsLike {
  const options: BrowserOptionsLike = {
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    dist: config.dist,
    debug: config.debug,
    enabled: config.enabled,
    tracesSampleRate: config.enableTracing ? config.tracesSampleRate : undefined,
    profilesSampleRate: config.enableTracing ? config.profilesSampleRate : undefined,
    integrations: config.integrations,
    sendClientReports: config.sendClientReports,
    attachStacktrace: config.attachStacktrace,
    normalizeDepth: config.normalizeDepth,
    sampleRate: config.sampleRate
  };

  if (config.replaysSessionSampleRate !== undefined || config.replaysOnErrorSampleRate !== undefined) {
    options.replaysSessionSampleRate = config.replaysSessionSampleRate;
    options.replaysOnErrorSampleRate = config.replaysOnErrorSampleRate;
  }

  return options;
}

export function initialiseBrowserSdk(
  overrides: Partial<BrowserErrorTrackingConfig> = {},
  sdk: BrowserSdkLike = defaultBrowserSdk
): BrowserErrorTrackingConfig {
  const config = resolveBrowserConfig(overrides);
  activeSdk = sdk;
  if (browserInitialised) {
    activeSdk.configureScope(scope => {
      scope.setTag('environment', config.environment);
      scope.setTag('release', config.release ?? 'unknown');
    });
    return config;
  }

  activeSdk.init(buildBrowserOptions(config));
  registerClient({
    captureException: activeSdk.captureException,
    captureMessage: activeSdk.captureMessage,
    addBreadcrumb: activeSdk.addBreadcrumb,
    setUser: activeSdk.setUser,
    configureScope: activeSdk.configureScope,
    startTransaction: activeSdk.startTransaction as RegisteredClient['startTransaction']
  });
  browserInitialised = true;
  return config;
}

export function registerBrowserGlobalHandlers(): void {
  if (browserHandlersRegistered) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('error', event => {
      activeSdk.captureException(event.error ?? event.message);
    });
    window.addEventListener('unhandledrejection', event => {
      activeSdk.captureException(event.reason);
    });
  }
  browserHandlersRegistered = true;
}

export function isBrowserInitialised(): boolean {
  return browserInitialised;
}

export function resetBrowserState(): void {
  browserInitialised = false;
  browserHandlersRegistered = false;
  activeSdk = defaultBrowserSdk;
}
