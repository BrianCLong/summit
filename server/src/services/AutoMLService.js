import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { trackError } from '../monitoring/middleware.js';

class AutoMLService {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    this.defaultTimeout = 60000;
  }

  async runEntityAutoML(params) {
    const {
      examples,
      metric = 'f1',
      backendPreference,
      maxRuntimeSeconds = 60,
      testSize = 0.2,
      token,
    } = params;

    const jobId = uuidv4();

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.mlServiceUrl}/automl/entity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          examples,
          metric,
          backend_preference: backendPreference,
          max_runtime_seconds: maxRuntimeSeconds,
          test_size: testSize,
        }),
        timeout: this.defaultTimeout,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `AutoML service error (${response.status})`);
      }

      const result = await response.json();

      logger.info('Entity AutoML job completed', {
        jobId,
        backend: result.backend,
        metric: result.metric,
        bestScore: result.best_score,
      });

      return {
        success: true,
        jobId,
        job: result,
      };
    } catch (error) {
      trackError('automl_service', 'AutoMLRequestError');
      logger.error('Entity AutoML job failed', {
        jobId,
        error: error.message,
      });

      return {
        success: false,
        jobId,
        error: error.message,
      };
    }
  }
}

module.exports = AutoMLService;
