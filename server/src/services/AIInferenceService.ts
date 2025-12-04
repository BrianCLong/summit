import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';

interface InferenceRequest {
  id: string;
  model_type: 'yolo' | 'whisper' | 'spacy' | 'sentence_transformer';
  input: any;
  options?: any;
}

interface InferenceResult {
  [key: string]: any;
  error?: string;
}

class AIInferenceService {
  private queueName = 'ai_inference_queue';
  private resultPrefix = 'ai_result:';

  /**
   * Submit an inference request and wait for the result.
   * @param modelType The type of model to use.
   * @param input The input data (text, image path, etc.).
   * @param timeoutMs Timeout in milliseconds.
   */
  async infer(
    modelType: InferenceRequest['model_type'],
    input: any,
    timeoutMs: number = 5000
  ): Promise<InferenceResult> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis is not available for AI inference');
    }

    const id = uuidv4();
    const request: InferenceRequest = {
      id,
      model_type: modelType,
      input,
    };

    // Push request to queue
    await redis.lpush(this.queueName, JSON.stringify(request));
    logger.debug(`Enqueued AI request ${id} for ${modelType}`);

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
        } catch (e) {
          logger.error(`Failed to parse AI result for ${id}:`, e);
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
  async dispatch(
    modelType: InferenceRequest['model_type'],
    input: any
  ): Promise<string> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis is not available');
    }

    const id = uuidv4();
    const request: InferenceRequest = {
      id,
      model_type: modelType,
      input,
    };

    await redis.lpush(this.queueName, JSON.stringify(request));
    return id;
  }
}

export const aiInferenceService = new AIInferenceService();
