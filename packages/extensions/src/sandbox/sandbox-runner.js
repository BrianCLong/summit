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
exports.SandboxRunner = void 0;
const worker_threads_1 = require("worker_threads");
const fs = __importStar(require("fs"));
const url_1 = require("url");
const path = __importStar(require("path"));
class SandboxRunner {
    observability;
    timeoutMs;
    memoryLimitMb;
    constructor(observability, options = {}) {
        this.observability = observability;
        this.timeoutMs = options.timeoutMs ?? 2000;
        this.memoryLimitMb = options.memoryLimitMb ?? 64;
    }
    async run(manifest, modulePath, exportName, context) {
        const start = Date.now();
        const workerFile = this.resolveWorkerFile();
        const workerOptions = {
            workerData: {
                manifest,
                modulePath: (0, url_1.pathToFileURL)(modulePath).toString(),
                exportName,
                context,
                timeoutMs: this.timeoutMs,
            },
            resourceLimits: {
                maxOldGenerationSizeMb: this.memoryLimitMb,
            },
        };
        if (workerFile.endsWith('.ts')) {
            workerOptions.execArgv = ['--loader', 'ts-node/esm'];
        }
        const worker = new worker_threads_1.Worker(workerFile, workerOptions);
        const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                worker.terminate();
                reject(new Error(`Extension ${manifest.name} exceeded sandbox timeout`));
            }, this.timeoutMs + 100);
            worker.once('message', (message) => {
                clearTimeout(timer);
                resolve(message);
            });
            worker.once('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
        const duration = Date.now() - start;
        if (result.error) {
            this.observability.recordFailure(manifest.name, result.error);
            throw new Error(result.error);
        }
        this.observability.recordActivation(manifest.name, duration);
        return {
            exports: result.exports,
            dispose: async () => {
                if (!result.hasDispose) {
                    worker.terminate();
                    return;
                }
                worker.postMessage({ type: 'dispose' });
                await new Promise((resolve) => {
                    worker.once('message', () => resolve());
                    setTimeout(() => resolve(), 250);
                });
                worker.terminate();
            },
        };
    }
    resolveWorkerFile() {
        const dir = path.dirname((0, url_1.fileURLToPath)(import.meta.url));
        const jsPath = path.resolve(dir, 'sandbox-worker.js');
        if (fs.existsSync(jsPath)) {
            return jsPath;
        }
        const tsPath = path.resolve(dir, 'sandbox-worker.ts');
        return tsPath;
    }
}
exports.SandboxRunner = SandboxRunner;
