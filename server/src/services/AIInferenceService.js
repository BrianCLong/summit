"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiInferenceService = void 0;
const uuid_1 = require("uuid");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class AIInferenceService {
    queueName = 'ai_inference_queue';
    resultPrefix = 'ai_result:';
    /**
     * Submit an inference request and wait for the result.
     * @param modelType The type of model to use.
     * @param input The input data (text, image path, etc.).
     * @param timeoutMs Timeout in milliseconds.
     */
    async infer(modelType, input, timeoutMs = 5000) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis is not available for AI inference');
        }
        const id = (0, uuid_1.v4)();
        const request = {
            id,
            model_type: modelType,
            input,
        };
        // Push request to queue
        await redis.lpush(this.queueName, JSON.stringify(request));
        logger_js_1.default.debug(`Enqueued AI request ${id} for ${modelType}`);
        // Poll for result
        const startTime = Date.now();
        const resultKey = `${this.resultPrefix}${id}`;
        while (Date.now() - startTime < timeoutMs) {
            const result = await redis.get(resultKey);
            if (result) {
                // Cleanup result (optional, or let TTL handle it)
                // await redis.del(resultKey);
                try {
                    return JSON.parse(result);
                }
                catch (e) {
                    logger_js_1.default.error(`Failed to parse AI result for ${id}:`, e);
                    throw new Error('Invalid response format from AI service');
                }
            }
            // Wait 50ms before retrying
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error(`AI Inference timed out after ${timeoutMs}ms`);
    }
    /**
     * Fire and forget inference request (async).
     */
    async dispatch(modelType, input) {
        const redis = (0, database_js_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis is not available');
        }
        const id = (0, uuid_1.v4)();
        const request = {
            id,
            model_type: modelType,
            input,
        };
        await redis.lpush(this.queueName, JSON.stringify(request));
        return id;
    }
}
exports.aiInferenceService = new AIInferenceService();
