import { trace, context } from '@opentelemetry/api';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { z } from 'zod';
import { BaseConnector } from './BaseConnector';
import type {
  ConnectorConfig,
  IngestRecord,
  ProvenanceMetadata,
} from '../types';

const tracer = trace.getTracer('intelgraph-http-connector');

interface HTTPConfig extends ConnectorConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  method?: 'GET' | 'POST';
  checkpoint_field?: string;
  rate_limiting?: {
    requests_per_minute: number;
    backoff_strategy: 'linear' | 'exponential';
    max_retries: number;
    circuit_break_duration?: string;
  };
}

export class HTTPConnector extends BaseConnector {
  private httpClient: AxiosInstance;
  private config: HTTPConfig;
  private lastCheckpoint?: string;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(config: HTTPConfig) {
    super(config);
    this.config = config;

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'IntelGraph/1.24.0',
        ...this.resolveHeaders(config.headers || {}),
      },
    });

    // Add request/response interceptors for observability
    this.setupInterceptors();
  }

  async *ingest(): AsyncGenerator<IngestRecord> {
    const span = tracer.startSpan('http-ingest', {
      attributes: {
        'connector.type': 'http',
        'connector.source': this.config.name,
        'connector.url': this.config.url,
        'http.method': this.config.method || 'GET',
      },
    });

    try {
      let hasMore = true;
      let totalRecords = 0;

      while (hasMore) {
        await this.enforceRateLimit();

        const requestSpan = tracer.startSpan('http-request', {
          attributes: {
            'http.url': this.config.url,
            'http.method': this.config.method || 'GET',
          },
        });

        try {
          const response = await this.makeRequest();
          const records = this.extractRecords(response.data);

          requestSpan.setAttributes({
            'http.status_code': response.status,
            'http.response.records_count': records.length,
          });

          for (const record of records) {
            const transformed = this.transformRecord(record);

            yield {
              id: this.extractId(transformed),
              type: this.extractType(transformed),
              name: this.extractName(transformed),
              attributes: transformed,
              pii_flags: this.detectPII(transformed),
              source_id: `http:${this.config.name}`,
              provenance: this.createProvenance(response),
              retention_tier: this.config.retention || 'standard-365d',
              purpose: this.config.purpose || 'enrichment',
              region: 'US',
            };

            totalRecords++;
          }

          // Update checkpoint for next iteration
          if (this.config.checkpoint_field && records.length > 0) {
            const lastRecord = records[records.length - 1];
            this.lastCheckpoint = lastRecord[this.config.checkpoint_field];
          }

          // Determine if there are more pages
          hasMore = this.hasMorePages(response.data, records.length);

          requestSpan.setStatus({ code: 1 }); // OK
        } catch (error) {
          requestSpan.recordException(error as Error);
          requestSpan.setStatus({ code: 2, message: (error as Error).message });

          if (this.isRetryableError(error)) {
            await this.backoff();
            continue;
          }

          throw error;
        } finally {
          requestSpan.end();
        }
      }

      span.setAttributes({
        'ingest.total_records': totalRecords,
      });
      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        const span = trace.getActiveSpan();
        if (span) {
          span.setAttributes({
            'http.method': config.method?.toUpperCase() || 'GET',
            'http.url': config.url || '',
          });
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        const span = trace.getActiveSpan();
        if (span) {
          span.setAttributes({
            'http.status_code': response.status,
            'http.response.size': JSON.stringify(response.data).length,
          });
        }
        return response;
      },
      (error) => {
        const span = trace.getActiveSpan();
        if (span) {
          span.setAttributes({
            'http.status_code': error.response?.status || 0,
            'http.error.message': error.message,
          });
        }
        return Promise.reject(error);
      },
    );
  }

  private async makeRequest(): Promise<AxiosResponse> {
    const params = { ...this.config.params };

    // Add checkpoint parameter if configured
    if (this.config.checkpoint_field && this.lastCheckpoint) {
      params[this.config.checkpoint_field] = this.lastCheckpoint;
    }

    const config = {
      method: this.config.method || 'GET',
      url: this.config.url,
      params,
    };

    return await this.httpClient.request(config);
  }

  private extractRecords(data: any): any[] {
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    }

    // Common API response patterns
    if (data.results && Array.isArray(data.results)) {
      return data.results;
    }

    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    if (data.items && Array.isArray(data.items)) {
      return data.items;
    }

    // For Topicality insights API
    if (data.insights && Array.isArray(data.insights)) {
      return data.insights;
    }

    this.logger.warn('Unexpected response format, treating as single record', {
      data: typeof data,
      keys: Object.keys(data || {}),
    });

    return [data];
  }

  private transformRecord(record: any): any {
    const rules = this.config.transform_rules || {};

    // Handle Topicality-specific format
    if (this.config.name === 'topicality') {
      return {
        insight_id: record.id || record.insight_id,
        insight_type: record.type || 'insight',
        relevance_score: record.score || record.relevance_score,
        related_entities: record.entities || record.related_entities || [],
        topic_tags: record.topics || record.topic_tags || [],
        timestamp: record.timestamp || record.created_at,
        ...record,
      };
    }

    // Handle threat intel format
    if (this.config.purpose === 'threat-intel') {
      return {
        ioc_id: record.id || record.ioc_id,
        indicator_type: record.type || record.indicator_type,
        ioc_value: record.value || record.indicator,
        confidence_score: record.confidence || record.confidence_score,
        ...record,
      };
    }

    return record;
  }

  private extractId(record: any): string {
    return (
      record.insight_id ||
      record.ioc_id ||
      record.id ||
      `http-${Date.now()}-${Math.random()}`
    );
  }

  private extractType(record: any): string {
    return (
      record.insight_type || record.indicator_type || record.type || 'unknown'
    );
  }

  private extractName(record: any): string {
    return (
      record.name || record.title || record.ioc_value || record.insight_id || ''
    );
  }

  private detectPII(record: any): Record<string, boolean> {
    const piiFlags: Record<string, boolean> = {};

    // More conservative PII detection for API data
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        piiFlags[key] =
          lowerKey.includes('email') ||
          lowerKey.includes('name') ||
          lowerKey.includes('address') ||
          /\b[\w\.-]+@[\w\.-]+\.\w+\b/.test(value);
      }
    }

    return piiFlags;
  }

  private createProvenance(response: AxiosResponse): ProvenanceMetadata {
    return {
      source_system:
        this.config.name === 'topicality'
          ? 'topicality-insights'
          : 'threat-intel-feed',
      collection_method:
        this.config.name === 'topicality' ? 'streaming_api' : 'http_polling',
      source_url: response.config.url || this.config.url,
      collected_at: new Date().toISOString(),
      response_headers: {
        'content-type': response.headers['content-type'],
        'x-rate-limit-remaining': response.headers['x-rate-limit-remaining'],
      },
    };
  }

  private hasMorePages(data: any, recordsCount: number): boolean {
    // Check various pagination indicators
    if (data.has_more !== undefined) return data.has_more;
    if (data.pagination?.has_next !== undefined)
      return data.pagination.has_next;

    // For streaming APIs, continue if we got records
    if (this.config.name === 'topicality') {
      return recordsCount > 0;
    }

    return false;
  }

  private async enforceRateLimit(): Promise<void> {
    if (!this.config.rate_limiting) return;

    const now = Date.now();
    const windowDuration = 60000; // 1 minute

    // Reset window if needed
    if (now - this.windowStart >= windowDuration) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if we've hit the limit
    if (this.requestCount >= this.config.rate_limiting.requests_per_minute) {
      const sleepTime = windowDuration - (now - this.windowStart);
      this.logger.info('Rate limit reached, sleeping', { sleep_ms: sleepTime });
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      return (
        status === 429 || status === 502 || status === 503 || status === 504
      );
    }
    return false;
  }

  private async backoff(): Promise<void> {
    const strategy =
      this.config.rate_limiting?.backoff_strategy || 'exponential';
    const baseDelay = 1000;

    if (strategy === 'exponential') {
      const delay = baseDelay * Math.pow(2, Math.min(this.requestCount, 6));
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      await new Promise((resolve) => setTimeout(resolve, baseDelay));
    }
  }

  private resolveHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value.startsWith('${') && value.endsWith('}')) {
        const envVar = value.slice(2, -1);
        resolved[key] = process.env[envVar] || value;
      } else if (value.startsWith('secretref://')) {
        // In production, integrate with actual secret resolution
        resolved[key] = process.env.TOPICALITY_API_KEY || 'demo-api-key';
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.head(this.config.url);
      return response.status < 400;
    } catch (error) {
      this.logger.error('HTTP health check failed', {
        url: this.config.url,
        error: (error as Error).message,
      });
      return false;
    }
  }
}
