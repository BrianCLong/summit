/**
 * Client for ML threat detection service
 */

import axios, { AxiosInstance } from 'axios';
import { PredictionRequest, PredictionResult } from '@intelgraph/threat-detection-core';

export interface MLClientConfig {
  endpoint: string;
  timeout?: number;
  apiKey?: string;
}

export class MLThreatClient {
  private client: AxiosInstance;

  constructor(config: MLClientConfig) {
    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout || 30000,
      headers: config.apiKey ? {
        'Authorization': `Bearer ${config.apiKey}`
      } : {}
    });
  }

  async predictThreat(request: PredictionRequest): Promise<PredictionResult> {
    const response = await this.client.post('/predict', request);
    return response.data;
  }

  async predictBatch(requests: PredictionRequest[]): Promise<PredictionResult[]> {
    const response = await this.client.post('/predict/batch', { requests });
    return response.data;
  }

  async detectAnomaly(features: Record<string, any>): Promise<{
    score: number;
    isAnomaly: boolean;
    explanation?: string;
  }> {
    const response = await this.client.post('/anomaly/detect', { features });
    return response.data;
  }

  async trainModel(modelId: string, trainingData: any): Promise<{
    success: boolean;
    modelVersion: string;
    metrics: any;
  }> {
    const response = await this.client.post(`/models/${modelId}/train`, trainingData);
    return response.data;
  }

  async getModelHealth(modelId: string): Promise<{
    healthy: boolean;
    driftDetected: boolean;
    accuracy: number;
    recommendRetrain: boolean;
  }> {
    const response = await this.client.get(`/models/${modelId}/health`);
    return response.data;
  }

  async getModelMetrics(modelId: string): Promise<any> {
    const response = await this.client.get(`/models/${modelId}/metrics`);
    return response.data;
  }
}

export default MLThreatClient;
