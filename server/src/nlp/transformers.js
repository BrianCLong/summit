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
exports.TransformerInferenceService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class TransformerInferenceService {
    modelName;
    maxBatchSize;
    cacheTtlMs;
    cache;
    queue = [];
    queueResolvers = [];
    constructor(options = {}) {
        this.modelName = options.modelName || 'domain-transformer-small';
        this.maxBatchSize = options.maxBatchSize || 16;
        this.cacheTtlMs = options.cacheTtlMs || 5 * 60 * 1000;
        this.cache = new Map();
        setInterval(() => this.flushQueue(), 50).unref();
    }
    get selectedModel() {
        return this.modelName;
    }
    toContextString(payload) {
        return Object.entries(payload)
            .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
            .join('\n');
    }
    async annotate(request) {
        const cacheKey = this.buildCacheKey(request);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        const resultPromise = new Promise((resolve) => {
            this.queue.push(request);
            this.queueResolvers.push(resolve);
        });
        const result = await resultPromise;
        this.cache.set(cacheKey, { value: result, expiresAt: Date.now() + this.cacheTtlMs });
        return result;
    }
    async flushQueue() {
        if (this.queue.length === 0)
            return;
        const batch = this.queue.splice(0, this.maxBatchSize);
        const resolvers = this.queueResolvers.splice(0, this.maxBatchSize);
        try {
            // Process requests sequentially or in parallel depending on Python script capability
            // Here we process sequentially for simplicity as the script is single-shot
            const results = await Promise.all(batch.map((item) => this.runPythonInference(item)));
            results.forEach((result, idx) => resolvers[idx](result));
        }
        catch (error) {
            // Fallback or error handling
            console.error("NER Inference failed", error);
            resolvers.forEach(resolve => resolve({ error: "Inference failed" }));
        }
    }
    async runPythonInference(request) {
        const { PythonShell } = await Promise.resolve().then(() => __importStar(require('python-shell')));
        const options = {
            mode: 'json',
            pythonPath: 'python', // Assumes python is in PATH and has spacy installed
            scriptPath: 'src/nlp/scripts',
            args: [JSON.stringify({ text: request.context, language: request.language || 'en' })]
        };
        return new Promise((resolve, reject) => {
            PythonShell.run('ner.py', options).then((messages) => {
                if (messages && messages.length > 0) {
                    const output = messages[0];
                    resolve({
                        model: this.modelName,
                        tokenCount: request.context.split(/\s+/).length,
                        coreferenceChains: request.coref,
                        ...output
                    });
                }
                else {
                    resolve({ error: "No output from NER script" });
                }
            }).catch((err) => {
                reject(err);
            });
        });
    }
    buildCacheKey(request) {
        return crypto_1.default
            .createHash('sha1')
            .update(`${this.modelName}:${request.context}:${JSON.stringify(request.coref)}`)
            .digest('hex');
    }
}
exports.TransformerInferenceService = TransformerInferenceService;
