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
exports.GovernedQueueProvider = void 0;
const crypto = __importStar(require("crypto"));
class GovernedQueueProvider {
    baseProvider;
    config;
    constructor(baseProvider, config) {
        this.baseProvider = baseProvider;
        this.config = config;
    }
    hashPayload(payload) {
        return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }
    async enqueue(job) {
        if ((job.retries || 0) > this.config.maxRetries) {
            throw new Error(`Retry cap hit. Max retries: ${this.config.maxRetries}`);
        }
        const payloadCost = this.estimateCost(job.payload);
        if (payloadCost > this.config.maxCostPerJob) {
            throw new Error(`Cost budget exceeded: ${payloadCost} > ${this.config.maxCostPerJob}`);
        }
        const idempotencyKey = `EVID-ASYNC-${this.hashPayload(job.payload)}`;
        // Inject idempotency key if supported by the provider, else rely on this wrapper
        job.metadata = { ...job.metadata, idempotencyKey };
        return this.baseProvider.enqueue(job);
    }
    async getStatus(jobId) {
        return this.baseProvider.getStatus(jobId);
    }
    estimateCost(payload) {
        // Basic stub logic: $.001 per KB of payload
        const bytes = Buffer.byteLength(JSON.stringify(payload));
        return (bytes / 1024) * 0.001;
    }
}
exports.GovernedQueueProvider = GovernedQueueProvider;
