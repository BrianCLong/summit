"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANDBOX_POLICY_VERSION = void 0;
exports.executeInSandbox = executeInSandbox;
// @ts-nocheck
const node_vm_1 = __importDefault(require("node:vm"));
const node_util_1 = require("node:util");
const canonical_js_1 = require("./utils/canonical.js");
exports.SANDBOX_POLICY_VERSION = 'sum-sandbox-v1';
async function executeInSandbox(submission, options, runtimeInput = {}) {
    const contextState = {
        logs: [],
        bufferBytes: 0,
        options,
        abortController: new AbortController(),
    };
    try {
        const wrapped = wrapSubmission(submission.code);
        const script = new node_vm_1.default.Script(wrapped, { filename: 'submission.js' });
        const context = node_vm_1.default.createContext(createVmContext(contextState, runtimeInput));
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
            outputDigest: (0, canonical_js_1.sha256)(serialized),
            logs: contextState.logs,
            policyVersion: exports.SANDBOX_POLICY_VERSION,
        };
    }
    catch (error) {
        if (typeof node_vm_1.default.ScriptRunTimeoutError === 'function') {
            const TimeoutCtor = node_vm_1.default.ScriptRunTimeoutError;
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
function createVmContext(state, runtimeInput) {
    const safeConsole = new Proxy(console, {
        get(target, prop) {
            if (typeof prop === 'string' && ['log', 'info', 'warn'].includes(prop)) {
                return (...args) => {
                    const line = args.map((arg) => (typeof arg === 'string' ? arg : safeStringify(arg))).join(' ');
                    state.logs.push(line);
                };
            }
            throw new Error(`Console method '${String(prop)}' is not available`);
        },
    });
    const limitedSetTimeout = (fn, delay = 0, ...args) => {
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
                return (...args) => {
                    const size = estimateSizeFromArgs(args);
                    accumulateBufferUsage(state, size);
                    return Reflect.get(target, prop, receiver).apply(target, args);
                };
            }
            return Reflect.get(target, prop, receiver);
        },
    });
    const fetchGuard = async (input, init) => {
        const url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.url);
        if (!state.options.allowedHosts.includes(url.host)) {
            throw new Error(`QuotaExceededError: host '${url.host}' is not in allowlist`);
        }
        return fetch(url, init);
    };
    const allowedGlobals = Object.fromEntries(state.options.allowedGlobals.map((key) => [key, globalThis[key]]));
    return {
        console: safeConsole,
        setTimeout: limitedSetTimeout,
        clearTimeout,
        Buffer: limitedBuffer,
        TextEncoder: node_util_1.TextEncoder,
        fetch: fetchGuard,
        runtimeInput,
        ...allowedGlobals,
    };
}
function createCapabilitySurface(state) {
    return {
        signal: state.abortController.signal,
        allowHost(host) {
            if (!state.options.allowedHosts.includes(host)) {
                throw new Error(`QuotaExceededError: host '${host}' is not pre-approved`);
            }
            return true;
        },
    };
}
function wrapSubmission(code) {
    const normalized = normalizeModuleSyntax(code);
    return `"use strict"; const module = { exports: {} }; const exports = module.exports;\n${normalized}\nlet handler = module.exports;\nif (typeof handler !== 'function' && typeof exports.default === 'function') { handler = exports.default; }\nif (typeof handler !== 'function') { throw new Error('Submission must export a callable function'); }\nhandler;`;
}
async function executeWithTimeout(promise, timeoutMs) {
    let timeoutRef;
    try {
        return await Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => {
                timeoutRef = setTimeout(() => {
                    reject(new Error('QuotaExceededError: execution timed out'));
                }, timeoutMs);
                timeoutRef.unref?.();
            }),
        ]);
    }
    finally {
        if (timeoutRef) {
            clearTimeout(timeoutRef);
        }
    }
}
function accumulateBufferUsage(state, size) {
    state.bufferBytes += size;
    if (state.bufferBytes > state.options.quotas.maxBufferBytes) {
        throw new Error('QuotaExceededError: buffer allocation exceeded');
    }
}
function enforceOutputQuota(serialized, state) {
    const size = new node_util_1.TextEncoder().encode(serialized).byteLength;
    if (size > state.options.quotas.maxOutputSize) {
        throw new Error('QuotaExceededError: output exceeds quota');
    }
}
function failure(status, error, state) {
    return {
        status,
        error,
        logs: state.logs,
        policyVersion: exports.SANDBOX_POLICY_VERSION,
    };
}
function safeStringify(value) {
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
    }
    catch {
        return '[unserializable]';
    }
}
function estimateSizeFromArgs(args) {
    if (!args.length) {
        return 0;
    }
    const [first] = args;
    if (typeof first === 'number') {
        return first;
    }
    if (typeof first === 'string') {
        return new node_util_1.TextEncoder().encode(first).byteLength;
    }
    if (ArrayBuffer.isView(first)) {
        return first.byteLength;
    }
    return 0;
}
function normalizeModuleSyntax(code) {
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
