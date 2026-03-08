"use strict";
/**
 * Client for ML threat detection service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLThreatClient = void 0;
const axios_1 = __importDefault(require("axios"));
class MLThreatClient {
    client;
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: config.endpoint,
            timeout: config.timeout || 30000,
            headers: config.apiKey ? {
                'Authorization': `Bearer ${config.apiKey}`
            } : {}
        });
    }
    async predictThreat(request) {
        const response = await this.client.post('/predict', request);
        return response.data;
    }
    async predictBatch(requests) {
        const response = await this.client.post('/predict/batch', { requests });
        return response.data;
    }
    async detectAnomaly(features) {
        const response = await this.client.post('/anomaly/detect', { features });
        return response.data;
    }
    async trainModel(modelId, trainingData) {
        const response = await this.client.post(`/models/${modelId}/train`, trainingData);
        return response.data;
    }
    async getModelHealth(modelId) {
        const response = await this.client.get(`/models/${modelId}/health`);
        return response.data;
    }
    async getModelMetrics(modelId) {
        const response = await this.client.get(`/models/${modelId}/metrics`);
        return response.data;
    }
}
exports.MLThreatClient = MLThreatClient;
exports.default = MLThreatClient;
