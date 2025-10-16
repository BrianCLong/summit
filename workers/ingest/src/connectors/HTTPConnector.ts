import { trace } from '@opentelemetry/api';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
  protected config: HTTPConfig;
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
            if (typeof record !== 'object' || record === null || Array.isArray(record)) {
              this.logger.warn({ msg: 'Skipping non-object HTTP record' });
              continue;
            }
            const transformed = this.transformRecord(record as Record<string, unknown>);

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
            if (typeof lastRecord === 'object' && lastRecord !== null && !Array.isArray(lastRecord)) {
              const lr = lastRecord as Record<string, unknown>;
              const field = lr[this.config.checkpoint_field];
              if (typeof field === 'string') this.lastCheckpoint = field;
            }
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

  private extractRecords(data: unknown): unknown[] {
    // Handle different response formats
    if (Array.isArray(data)) {
      return data as unknown[];
    }

    // Common API response patterns
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results as unknown[];
      if (Array.isArray(obj.data)) return obj.data as unknown[];
      if (Array.isArray(obj.items)) return obj.items as unknown[];
      // For Topicality insights API
      if (Array.isArray(obj.insights as unknown[])) return obj.insights as unknown[];
    }

    this.logger.warn({
      msg: 'Unexpected response format, treating as single record',
      data: typeof data,
      keys: typeof data === 'object' && data !== null ? Object.keys(data as object) : [],
    });

    return [data];
  }

  private transformRecord(record: Record<string, unknown>): Record<string, unknown> {

    // Handle Topicality-specific format
    if (this.config.name === 'topicality') {
      return {
        insight_id: (record.id as string) || (record.insight_id as string),
        insight_type: (record.type as string) || 'insight',
        relevance_score: (record.score as number) || (record.relevance_score as number),
        related_entities: (record.entities as unknown[]) || (record.related_entities as unknown[]) || [],
        topic_tags: (record.topics as string[]) || (record.topic_tags as string[]) || [],
        timestamp: (record.timestamp as string) || (record.created_at as string),
        ...record,
      };
    }

    // Handle threat intel format
    if (this.config.purpose === 'threat-intel') {
      return {
        ioc_id: (record.id as string) || (record.ioc_id as string),
        indicator_type: (record.type as string) || (record.indicator_type as string),
        ioc_value: (record.value as string) || (record.indicator as string),
        confidence_score: (record.confidence as number) || (record.confidence_score as number),
        ...record,
      };
    }

    return record;
  }

  private extractId(record: Record<string, unknown>): string {
    const r = record as Record<string, unknown>;
    return (
      (r.insight_id as string) ||
      (r.ioc_id as string) ||
      (r.id as string) ||
      `http-${Date.now()}-${Math.random()}`
    );
  }

  private extractType(record: Record<string, unknown>): string {
    const r = record as Record<string, unknown>;
    return (
      (r.insight_type as string) || (r.indicator_type as string) || (r.type as string) || 'unknown'
    );
  }

  private extractName(record: Record<string, unknown>): string {
    const r = record as Record<string, unknown>;
    return (
      (r.name as string) || (r.title as string) || (r.ioc_value as string) || (r.insight_id as string) || ''
    );
  }

  private detectPII(record: Record<string, unknown>): Record<string, boolean> {
    const piiFlags: Record<string, boolean> = {};

    // More conservative PII detection for API data
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        piiFlags[key] =
          lowerKey.includes('email') ||
          lowerKey.includes('name') ||
          lowerKey.includes('address') ||
          /\b[\w.-]+@[\w.-]+\.\w+\b/.test(value);
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

  private hasMorePages(data: unknown, recordsCount: number): boolean {
    // Check various pagination indicators
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (typeof obj.has_more === 'boolean') return obj.has_more as boolean;
      const pagination = obj.pagination as { has_next?: boolean } | undefined;
      if (pagination && typeof pagination.has_next === 'boolean') return pagination.has_next;
    }

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
      this.logger.info({ msg: 'Rate limit reached, sleeping', sleep_ms: sleepTime });
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  private isRetryableError(error: unknown): boolean {
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
      this.logger.error({
        msg: 'HTTP health check failed',
        url: this.config.url,
        error: (error as Error).message,
      });
      return false;
    }
  }
}
