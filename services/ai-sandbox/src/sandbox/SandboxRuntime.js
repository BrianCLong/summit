"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxRuntime = void 0;
const vm = __importStar(require("node:vm"));
const node_crypto_1 = require("node:crypto");
const logger_js_1 = require("../utils/logger.js");
const ALLOWED_GLOBALS = ['Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Error', 'TypeError', 'RangeError', 'setTimeout', 'clearTimeout', 'Promise'];
class SandboxRuntime {
    quotas;
    logs = [];
    constructor(quotas) {
        this.quotas = quotas;
    }
    async execute(code, input, config = {}) {
        const executionId = (0, node_crypto_1.randomUUID)();
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage().heapUsed;
        this.logs = [];
        logger_js_1.logger.info({ executionId, codeLength: code.length }, 'Starting sandbox execution');
        // Static analysis - block dangerous patterns
        const blockedPatterns = [
            /require\s*\(/,
            /import\s+/,
            /process\./,
            /global\./,
            /eval\s*\(/,
            /Function\s*\(/,
            /child_process/,
            /fs\./,
            /net\./,
            /http\./,
            /https\./,
        ];
        for (const pattern of blockedPatterns) {
            if (pattern.test(code)) {
                return {
                    id: executionId,
                    status: 'failed',
                    output: null,
                    logs: this.logs,
                    error: `Security violation: Blocked pattern detected (${pattern.source})`,
                    resourceUsage: {
                        cpuMs: 0,
                        memoryPeakMb: 0,
                        durationMs: 0,
                        outputBytes: 0,
                    },
                };
            }
        }
        // Create sandboxed context
        const sandboxContext = {
            input,
            config,
            console: {
                log: (...args) => this.logs.push(`[LOG] ${args.join(' ')}`),
                warn: (...args) => this.logs.push(`[WARN] ${args.join(' ')}`),
                error: (...args) => this.logs.push(`[ERROR] ${args.join(' ')}`),
            },
        };
        // Add allowed globals
        const contextGlobals = {};
        for (const name of ALLOWED_GLOBALS) {
            contextGlobals[name] = globalThis[name];
        }
        const vmContext = vm.createContext({
            ...contextGlobals,
            ...sandboxContext,
        });
        const wrappedCode = `
      (async function sandboxMain() {
        ${code}
      })();
    `;
        try {
            const script = new vm.Script(wrappedCode, {
                filename: `sandbox-${executionId}.js`,
            });
            const resultPromise = script.runInContext(vmContext, {
                timeout: this.quotas.cpuMs,
                displayErrors: true,
            });
            // Wall-clock timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Execution timeout')), this.quotas.timeoutMs);
            });
            const output = await Promise.race([resultPromise, timeoutPromise]);
            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage().heapUsed;
            const durationMs = Number(endTime - startTime) / 1_000_000;
            const memoryPeakMb = Math.max(0, (endMemory - startMemory) / (1024 * 1024));
            const outputStr = JSON.stringify(output);
            const outputBytes = Buffer.byteLength(outputStr, 'utf8');
            if (outputBytes > this.quotas.maxOutputBytes) {
                return {
                    id: executionId,
                    status: 'failed',
                    output: null,
                    logs: this.logs,
                    error: `Output size (${outputBytes} bytes) exceeds limit (${this.quotas.maxOutputBytes} bytes)`,
                    resourceUsage: {
                        cpuMs: durationMs,
                        memoryPeakMb,
                        durationMs,
                        outputBytes,
                    },
                };
            }
            logger_js_1.logger.info({ executionId, durationMs, memoryPeakMb }, 'Sandbox execution completed');
            return {
                id: executionId,
                status: 'completed',
                output,
                logs: this.logs,
                resourceUsage: {
                    cpuMs: durationMs,
                    memoryPeakMb,
                    durationMs,
                    outputBytes,
                },
            };
        }
        catch (error) {
            const endTime = process.hrtime.bigint();
            const durationMs = Number(endTime - startTime) / 1_000_000;
            // Handle errors from VM context which may not be instanceof Error
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String(error.message);
            }
            else if (typeof error === 'string') {
                errorMessage = error;
            }
            logger_js_1.logger.error({ executionId, error: errorMessage }, 'Sandbox execution failed');
            // Detect timeout from various sources
            const isTimeout = errorMessage.toLowerCase().includes('timeout') ||
                errorMessage.includes('Script execution timed out') ||
                errorMessage.includes('execution time');
            return {
                id: executionId,
                status: isTimeout ? 'timeout' : 'failed',
                output: null,
                logs: this.logs,
                error: errorMessage,
                resourceUsage: {
                    cpuMs: durationMs,
                    memoryPeakMb: 0,
                    durationMs,
                    outputBytes: 0,
                },
            };
        }
    }
}
exports.SandboxRuntime = SandboxRuntime;
