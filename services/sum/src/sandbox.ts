import vm from 'node:vm';
import { TextEncoder } from 'node:util';
import { sha256 } from './utils/canonical.js';
import type { SandboxOptions, SandboxResult, SandboxStatus, UdfSubmission } from './types.js';

export const SANDBOX_POLICY_VERSION = 'sum-sandbox-v1';

interface ExecutionContext {
  logs: string[];
  bufferBytes: number;
  options: SandboxOptions;
  abortController: AbortController;
}

export async function executeInSandbox(
  submission: UdfSubmission,
  options: SandboxOptions,
  runtimeInput: Record<string, unknown> = {}
): Promise<SandboxResult> {
  const contextState: ExecutionContext = {
    logs: [],
    bufferBytes: 0,
    options,
    abortController: new AbortController(),
  };

  try {
    const wrapped = wrapSubmission(submission.code);
    const script = new vm.Script(wrapped, { filename: 'submission.js' });
    const context = vm.createContext(createVmContext(contextState, runtimeInput));

    const exported = script.runInContext(context, { timeout: options.quotas.cpuMs });
    if (typeof exported !== 'function') {
      return failure('runtime-error', 'Submission did not export a callable function', contextState);
    }

    const execution = exported(runtimeInput, createCapabilitySurface(contextState));
    const result = await executeWithTimeout(execution, options.quotas.wallClockMs);

    const serialized = safeStringify(result ?? null);
    enforceOutputQuota(serialized, contextState);

    return {
      status: 'success',
      outputDigest: sha256(serialized),
      logs: contextState.logs,
      policyVersion: SANDBOX_POLICY_VERSION,
    } satisfies SandboxResult;
  } catch (error) {
    if (typeof (vm as { ScriptRunTimeoutError?: unknown }).ScriptRunTimeoutError === 'function') {
      const TimeoutCtor = (vm as { ScriptRunTimeoutError?: new (...args: unknown[]) => Error }).ScriptRunTimeoutError;
      if (TimeoutCtor && error instanceof TimeoutCtor) {
        return failure('timeout', 'Execution exceeded CPU quota', contextState);
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('QuotaExceededError')) {
      return failure('quota-exceeded', message, contextState);
    }

    return failure('runtime-error', message, contextState);
  }
}

function createVmContext(state: ExecutionContext, runtimeInput: Record<string, unknown>) {
  const safeConsole = new Proxy(console, {
    get(target, prop) {
      if (typeof prop === 'string' && ['log', 'info', 'warn'].includes(prop)) {
        return (...args: unknown[]) => {
          const line = args.map((arg) => (typeof arg === 'string' ? arg : safeStringify(arg))).join(' ');
          state.logs.push(line);
        };
      }
      throw new Error(`Console method '${String(prop)}' is not available`);
    },
  });

  const limitedSetTimeout = (fn: (...args: unknown[]) => unknown, delay = 0, ...args: unknown[]): NodeJS.Timeout => {
    if (delay > state.options.quotas.wallClockMs) {
      throw new Error('QuotaExceededError: setTimeout delay exceeds allowed budget');
    }
    return setTimeout(fn, delay, ...args);
  };

  const limitedBuffer = new Proxy(Buffer, {
    apply() {
      throw new Error('QuotaExceededError: Buffer constructor not allowed');
    },
    construct(target, args) {
      const size = typeof args[0] === 'number' ? args[0] : 0;
      accumulateBufferUsage(state, size);
      return Reflect.construct(target, args);
    },
    get(target, prop, receiver) {
      if (prop === 'alloc' || prop === 'allocUnsafe' || prop === 'from') {
        return (...args: unknown[]) => {
          const size = estimateSizeFromArgs(args);
          accumulateBufferUsage(state, size);
          return Reflect.get(target, prop, receiver).apply(target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  const fetchGuard = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    if (!state.options.allowedHosts.includes(url.host)) {
      throw new Error(`QuotaExceededError: host '${url.host}' is not in allowlist`);
    }
    return fetch(url, init);
  };

  const allowedGlobals = Object.fromEntries(state.options.allowedGlobals.map((key) => [key, (globalThis as Record<string, unknown>)[key]]));

  return {
    console: safeConsole,
    setTimeout: limitedSetTimeout,
    clearTimeout,
    Buffer: limitedBuffer,
    TextEncoder,
    fetch: fetchGuard,
    runtimeInput,
    ...allowedGlobals,
  };
}

function createCapabilitySurface(state: ExecutionContext) {
  return {
    signal: state.abortController.signal,
    allowHost(host: string) {
      if (!state.options.allowedHosts.includes(host)) {
        throw new Error(`QuotaExceededError: host '${host}' is not pre-approved`);
      }
      return true;
    },
  } as const;
}

function wrapSubmission(code: string): string {
  const normalized = normalizeModuleSyntax(code);
  return `"use strict"; const module = { exports: {} }; const exports = module.exports;\n${normalized}\nlet handler = module.exports;\nif (typeof handler !== 'function' && typeof exports.default === 'function') { handler = exports.default; }\nif (typeof handler !== 'function') { throw new Error('Submission must export a callable function'); }\nhandler;`;
}

async function executeWithTimeout<T>(promise: Promise<T> | T, timeoutMs: number): Promise<T> {
  let timeoutRef: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timeoutRef = setTimeout(() => {
          reject(new Error('QuotaExceededError: execution timed out'));
        }, timeoutMs);
        timeoutRef.unref?.();
      }),
    ]);
  } finally {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
  }
}

function accumulateBufferUsage(state: ExecutionContext, size: number): void {
  state.bufferBytes += size;
  if (state.bufferBytes > state.options.quotas.maxBufferBytes) {
    throw new Error('QuotaExceededError: buffer allocation exceeded');
  }
}

function enforceOutputQuota(serialized: string, state: ExecutionContext): void {
  const size = new TextEncoder().encode(serialized).byteLength;
  if (size > state.options.quotas.maxOutputSize) {
    throw new Error('QuotaExceededError: output exceeds quota');
  }
}

function failure(status: SandboxStatus, error: string, state: ExecutionContext): SandboxResult {
  return {
    status,
    error,
    logs: state.logs,
    policyVersion: SANDBOX_POLICY_VERSION,
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      if (val instanceof Map) {
        return Object.fromEntries([...val.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
      }
      if (val instanceof Set) {
        return [...val.values()].sort();
      }
      return val;
    });
  } catch {
    return '[unserializable]';
  }
}

function estimateSizeFromArgs(args: unknown[]): number {
  if (!args.length) {
    return 0;
  }
  const [first] = args;
  if (typeof first === 'number') {
    return first;
  }
  if (typeof first === 'string') {
    return new TextEncoder().encode(first).byteLength;
  }
  if (ArrayBuffer.isView(first)) {
    return first.byteLength;
  }
  return 0;
}

function normalizeModuleSyntax(code: string): string {
  let result = code;
  result = result.replace(/export\s+default\s+async\s+function\s*(\w*)/g, (_match, name) => {
    const identifier = name && name.length > 0 ? name : 'handler';
    return `module.exports = async function ${identifier}`;
  });
  result = result.replace(/export\s+default\s+function\s*(\w*)/g, (_match, name) => {
    const identifier = name && name.length > 0 ? name : 'handler';
    return `module.exports = function ${identifier}`;
  });
  result = result.replace(/export\s+default\s*\(/g, 'module.exports = (');
  return result;
}
