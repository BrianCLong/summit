import { createRequire } from 'node:module';
import { registerClient } from './client-registry';
import type { RegisteredClient } from './client-registry';
import { resolveNodeConfig } from './config';
import type { BreadcrumbEvent, NodeErrorTrackingConfig, SpanLike } from './types';

type NodeOptionsLike = Record<string, unknown>;

interface NodeSdkLike {
  init: (options: NodeOptionsLike) => void;
  captureException: (error: unknown) => string | undefined;
  captureMessage: (message: string, context?: unknown) => string | undefined;
  addBreadcrumb: (breadcrumb: BreadcrumbEvent) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  configureScope: (callback: (scope: { setTag: (key: string, value: string) => void }) => void) => void;
  startTransaction?: (...args: unknown[]) => SpanLike;
  startSpan?: (...args: unknown[]) => SpanLike;
  flush: (timeout?: number) => PromiseLike<boolean>;
}

const require = createRequire(import.meta.url);

function createSpanStub(): SpanLike {
  return {
    setStatus: () => undefined,
    finish: () => undefined
  };
}

function createNoopNodeSdk(): NodeSdkLike {
  return {
    init: () => undefined,
    captureException: () => undefined,
    captureMessage: () => undefined,
    addBreadcrumb: () => undefined,
    setUser: () => undefined,
    configureScope: () => undefined,
    startTransaction: () => createSpanStub(),
    startSpan: () => createSpanStub(),
    flush: async () => true
  };
}

const defaultNodeSdk: NodeSdkLike = (() => {
  try {
    return require('@sentry/node') as NodeSdkLike;
  } catch {
    return createNoopNodeSdk();
  }
})();

let nodeInitialised = false;
let nodeHandlersRegistered = false;
let activeSdk: NodeSdkLike = defaultNodeSdk;

function buildNodeOptions(config: NodeErrorTrackingConfig): NodeOptionsLike {
  const options: NodeOptionsLike = {
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
    autoSessionTracking: config.autoSessionTracking,
    attachStacktrace: config.attachStacktrace,
    normalizeDepth: config.normalizeDepth,
    sampleRate: config.sampleRate,
    serverName: config.serverName
  };

  return options;
}

export function initialiseNodeSdk(
  overrides: Partial<NodeErrorTrackingConfig> = {},
  sdk: NodeSdkLike = defaultNodeSdk
): NodeErrorTrackingConfig {
  const config = resolveNodeConfig(overrides);
  activeSdk = sdk;
  if (nodeInitialised) {
    activeSdk.configureScope(scope => {
      scope.setTag('environment', config.environment);
      scope.setTag('release', config.release ?? 'unknown');
    });
    return config;
  }

  activeSdk.init(buildNodeOptions(config));
  registerClient({
    captureException: activeSdk.captureException,
    captureMessage: activeSdk.captureMessage,
    addBreadcrumb: activeSdk.addBreadcrumb,
    setUser: activeSdk.setUser,
    configureScope: activeSdk.configureScope,
    startTransaction: activeSdk.startTransaction as RegisteredClient['startTransaction'],
    startSpan: activeSdk.startSpan as RegisteredClient['startSpan']
  });
  nodeInitialised = true;
  return config;
}

export function registerNodeGlobalHandlers(): void {
  if (nodeHandlersRegistered) {
    return;
  }
  process.on('uncaughtException', error => {
    activeSdk.captureException(error);
    Promise.resolve(activeSdk.flush(2000)).catch(() => {
      /* noop */
    });
  });
  process.on('unhandledRejection', reason => {
    activeSdk.captureException(reason);
  });
  nodeHandlersRegistered = true;
}

export function isNodeInitialised(): boolean {
  return nodeInitialised;
}

export function resetNodeState(): void {
  nodeInitialised = false;
  nodeHandlersRegistered = false;
  activeSdk = defaultNodeSdk;
}
