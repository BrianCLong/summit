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
const worker_threads_1 = require("worker_threads");
const url_1 = require("url");
async function run() {
    const { manifest, modulePath, exportName, context, timeoutMs } = worker_threads_1.workerData;
    try {
        const moduleUrl = (0, url_1.pathToFileURL)(modulePath).href;
        const module = await Promise.resolve(`${moduleUrl}`).then(s => __importStar(require(s)));
        const exported = module[exportName] || module.default;
        if (!exported) {
            throw new Error(`Extension ${manifest.name} does not export ${exportName}`);
        }
        const activationPromise = invoke(exported, context);
        const activation = await withTimeout(activationPromise, timeoutMs);
        worker_threads_1.parentPort?.postMessage({
            exports: activation?.exports,
            hasDispose: typeof activation?.dispose === 'function',
        });
        worker_threads_1.parentPort?.on('message', async (message) => {
            if (message?.type === 'dispose' && typeof activation?.dispose === 'function') {
                await activation.dispose();
                worker_threads_1.parentPort?.postMessage({ status: 'disposed' });
            }
        });
    }
    catch (err) {
        worker_threads_1.parentPort?.postMessage({
            error: err instanceof Error ? err.message : String(err),
            hasDispose: false,
        });
    }
}
async function invoke(exported, context) {
    if (typeof exported === 'function') {
        if (exported.prototype && exported.prototype.constructor === exported) {
            const instance = new exported();
            if (typeof instance.activate === 'function') {
                return instance.activate(context);
            }
        }
        return exported(context);
    }
    if (typeof exported.activate === 'function') {
        return exported.activate(context);
    }
    throw new Error('Unsupported extension entrypoint type');
}
async function withTimeout(promise, timeout) {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Extension activation timed out')), timeout);
    });
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
}
run();
