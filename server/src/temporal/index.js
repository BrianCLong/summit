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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTemporalWorker = startTemporalWorker;
exports.getTemporalClient = getTemporalClient;
const logger_js_1 = __importDefault(require("../config/logger.js"));
const logger = logger_js_1.default.child({ name: 'temporal' });
async function startTemporalWorker() {
    if (process.env.TEMPORAL_ENABLED !== 'true') {
        logger.info('Temporal disabled');
        return { stop: async () => { } };
    }
    try {
        // Lazy import to avoid hard dependency when disabled
        const temporal = await Promise.resolve().then(() => __importStar(require('temporalio/worker')));
        const { activities } = await Promise.resolve().then(() => __importStar(require('./lib/activities.js')));
        const { default: workflowsPath } = await Promise.resolve().then(() => __importStar(require('./lib/workflows-path.js')));
        const worker = await temporal.Worker.create({
            workflowsPath,
            activities,
            taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'maestro-core',
            namespace: process.env.TEMPORAL_NAMESPACE || 'default',
            connection: await (await Promise.resolve().then(() => __importStar(require('temporalio')))).Connection.connect(),
        });
        logger.info('Temporal worker created');
        const runPromise = worker.run();
        return {
            stop: async () => {
                try {
                    await worker.shutdown();
                }
                catch { }
                try {
                    await runPromise;
                }
                catch { }
            },
        };
    }
    catch (e) {
        logger.warn({ err: e?.message || String(e) }, 'Temporal not available; continuing without it');
        return { stop: async () => { } };
    }
}
async function getTemporalClient() {
    if (process.env.TEMPORAL_ENABLED !== 'true')
        return null;
    try {
        const { Connection, Client } = await Promise.resolve().then(() => __importStar(require('temporalio')));
        const connection = await Connection.connect();
        return new Client({ connection });
    }
    catch (e) {
        logger.warn('Temporal client not available');
        return null;
    }
}
