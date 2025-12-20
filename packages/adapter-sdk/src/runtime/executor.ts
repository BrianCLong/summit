import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';
import { Kafka, Producer } from 'kafkajs';
import pino from 'pino';
import {
  AdapterExecutionContext,
  AdapterExecutionRequest,
  AdapterExecutionResult,
  CircuitBreakerConfig,
  DlqConfig,
  DlqEvent,
  DlqPublisher,
  EgressProfile,
  ExecutorConfig,
  RetryPolicy,
} from './types';

const logger = pino({ name: 'adapter-executor' });

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 250,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
  jitterMs: 50,
  retryableErrorCodes: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH'],
};

const defaultCircuitBreaker: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxSuccesses: 2,
};

const defaultEgressProfile: EgressProfile = {
  name: 'default-deny',
  allow: [],
  defaultAction: 'deny',
};

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  openedAt?: number;
  halfOpenSuccesses: number;
}

interface CachedResult<T> {
  expiresAt: number;
  result: AdapterExecutionResult<T>;
}

export class AdapterExecutor {
  private readonly retryPolicy: RetryPolicy;
  private readonly circuitConfig: CircuitBreakerConfig;
  private readonly egressProfile: EgressProfile;
  private readonly defaultTimeoutMs: number;
  private readonly idempotencyTtlMs: number;
  private readonly idempotencyCache = new Map<string, CachedResult<unknown>>();
  private circuitState: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    halfOpenSuccesses: 0,
  };
  private readonly meter;
  private readonly tracer;
  private readonly latency;
  private readonly successCounter;
  private readonly errorCounter;
  private readonly retryCounter;
  private readonly dlqCounter;
  private readonly circuitOpenCounter;
  private readonly dlqPublisher: DlqPublisher | null;

  constructor(private readonly config: ExecutorConfig = {}) {
    this.retryPolicy = { ...defaultRetryPolicy, ...(config.retryPolicy ?? {}) };
    this.circuitConfig = { ...defaultCircuitBreaker, ...(config.circuitBreaker ?? {}) };
    this.egressProfile = config.egressProfile ?? defaultEgressProfile;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 30_000;
    this.idempotencyTtlMs = config.idempotencyTtlMs ?? 10 * 60 * 1000;
    const meterName = config.meterName ?? '@intelgraph/adapter-sdk';
    this.meter = metrics.getMeter(meterName, '1.0.0');
    this.tracer = trace.getTracer(meterName, '1.0.0');
    this.latency = this.meter.createHistogram('adapter_execution_latency_ms', {
      description: 'Execution latency per adapter operation',
    });
    this.successCounter = this.meter.createCounter('adapter_execution_success_total', {
      description: 'Successful adapter executions',
    });
    this.errorCounter = this.meter.createCounter('adapter_execution_error_total', {
      description: 'Failed adapter executions',
    });
    this.retryCounter = this.meter.createCounter('adapter_execution_retry_total', {
      description: 'Retries attempted for adapter executions',
    });
    this.dlqCounter = this.meter.createCounter('adapter_execution_dlq_total', {
      description: 'Messages published to the DLQ',
    });
    this.circuitOpenCounter = this.meter.createCounter('adapter_execution_circuit_open_total', {
      description: 'Times the circuit breaker opened for an adapter',
    });
    this.dlqPublisher = config.dlqPublisher ?? (config.dlq ? new KafkaDlqPublisher(config.dlq) : null);
  }

  async execute<T>(request: AdapterExecutionRequest<T>): Promise<AdapterExecutionResult<T>> {
    const idempotencyKey =
      request.idempotencyKey ?? `${request.adapterId}:${request.operation}:${JSON.stringify(request.payload ?? '')}`;

    const cached = this.getCachedResult<T>(idempotencyKey);
    if (cached) {
      logger.debug({ adapterId: request.adapterId, operation: request.operation }, 'Serving from idempotency cache');
      return { ...cached, fromCache: true };
    }

    if (this.isCircuitOpen()) {
      const error = new Error('Circuit breaker open for adapter');
      await this.publishToDlq(request, error, 0, 'open', idempotencyKey);
      this.errorCounter.add(1, this.metricAttributes(request, error));
      this.circuitOpenCounter.add(1, this.metricAttributes(request, error));
      return {
        success: false,
        error,
        attempts: 0,
        durationMs: 0,
        fromCache: false,
      };
    }

    try {
      this.validateEgress(request.target);
    } catch (error) {
      const egressError = error as Error;
      await this.publishToDlq(request, egressError, 0, this.circuitState.state, idempotencyKey);
      this.errorCounter.add(1, this.metricAttributes(request, egressError));

      return {
        success: false,
        attempts: 0,
        durationMs: 0,
        error: egressError,
        fromCache: false,
      };
    }

    const start = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt++) {
      const span = this.tracer.startSpan('adapter.execute', {
        attributes: {
          'adapter.id': request.adapterId,
          'adapter.operation': request.operation,
          'adapter.attempt': attempt,
        },
      });

      try {
        const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
        const result = await this.runWithTimeout(request, attempt, timeoutMs, idempotencyKey);

        const durationMs = Date.now() - start;
        const executionResult: AdapterExecutionResult<T> = {
          success: true,
          result,
          attempts: attempt,
          durationMs,
          fromCache: false,
        };

        this.recordSuccess(request, durationMs);
        this.resetCircuit();
        this.cacheResult(idempotencyKey, executionResult);

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        return executionResult;
      } catch (error) {
        lastError = error as Error;
        this.recordFailure();
        this.errorCounter.add(1, this.metricAttributes(request, lastError));

        span.setStatus({ code: SpanStatusCode.ERROR, message: String(lastError) });
        span.recordException(lastError);
        span.end();

        const shouldRetry =
          attempt < this.retryPolicy.maxAttempts && this.isRetryable(lastError, request.operation);

        if (!shouldRetry) {
          const durationMs = Date.now() - start;
          await this.publishToDlq(request, lastError, attempt, this.circuitState.state, idempotencyKey);

          return {
            success: false,
            attempts: attempt,
            durationMs,
            error: lastError,
            fromCache: false,
          };
        }

        this.retryCounter.add(1, this.metricAttributes(request, lastError));
        await this.delay(this.backoffDelay(attempt));
      }
    }

    throw lastError ?? new Error('Adapter execution failed');
  }

  async shutdown(): Promise<void> {
    if (this.dlqPublisher?.shutdown) {
      await this.dlqPublisher.shutdown();
    }
  }

  private async runWithTimeout<T>(
    request: AdapterExecutionRequest<T>,
    attempt: number,
    timeoutMs: number,
    idempotencyKey: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutError = new Error(`Adapter execution timed out after ${timeoutMs}ms`);
    timeoutError.name = 'TimeoutError';

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(timeoutError);
      }, timeoutMs);
    });

    try {
      const context: AdapterExecutionContext = {
        attempt,
        signal: controller.signal,
        idempotencyKey,
        metadata: request.metadata,
      };
      return await Promise.race([request.execute(context), timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private isRetryable(error: Error, operation: string): boolean {
    if (error.name === 'TimeoutError') {
      return true;
    }

    const code = (error as { code?: string }).code;
    if (code && this.retryPolicy.retryableErrorCodes?.includes(code)) {
      return true;
    }

    logger.warn(
      { operation, code: code ?? 'unknown', error: error.message },
      'Not retrying adapter operation',
    );
    return false;
  }

  private backoffDelay(attempt: number): number {
    const exponential = this.retryPolicy.initialDelayMs * Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1);
    const capped = Math.min(exponential, this.retryPolicy.maxDelayMs);
    const jitter = this.retryPolicy.jitterMs
      ? Math.floor(Math.random() * this.retryPolicy.jitterMs)
      : 0;
    return capped + jitter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isCircuitOpen(): boolean {
    if (this.circuitState.state === 'open' && this.circuitState.openedAt) {
      const now = Date.now();
      if (now - this.circuitState.openedAt >= this.circuitConfig.resetTimeoutMs) {
        this.circuitState.state = 'half-open';
        this.circuitState.failures = 0;
        this.circuitState.halfOpenSuccesses = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private recordFailure(): void {
    this.circuitState.failures += 1;

    const threshold = this.circuitConfig.failureThreshold;
    if (this.circuitState.state === 'half-open') {
      this.tripCircuit();
      return;
    }

    if (this.circuitState.failures >= threshold && this.circuitState.state === 'closed') {
      this.tripCircuit();
    }
  }

  private resetCircuit(): void {
    if (this.circuitState.state === 'closed') {
      this.circuitState.failures = 0;
      return;
    }

    if (this.circuitState.state === 'half-open') {
      this.circuitState.halfOpenSuccesses += 1;
      const successesNeeded = this.circuitConfig.halfOpenMaxSuccesses ?? 1;
      if (this.circuitState.halfOpenSuccesses >= successesNeeded) {
        this.circuitState = {
          state: 'closed',
          failures: 0,
          halfOpenSuccesses: 0,
        };
      }
    } else {
      this.circuitState = {
        state: 'closed',
        failures: 0,
        halfOpenSuccesses: 0,
      };
    }
  }

  private tripCircuit(): void {
    this.circuitState = {
      state: 'open',
      failures: 0,
      openedAt: Date.now(),
      halfOpenSuccesses: 0,
    };
    this.circuitOpenCounter.add(1);
    logger.warn('Circuit breaker opened for adapter executor');
  }

  private validateEgress(target?: string): void {
    if (!target) {
      return;
    }

    const profile = this.egressProfile ?? defaultEgressProfile;
    const url = new URL(target);
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;

    const allowed = profile.allow.some((rule) => {
      const hostMatch =
        rule.host === url.hostname ||
        (rule.host.startsWith('*.') && url.hostname.endsWith(rule.host.replace('*.', '')));

      if (!hostMatch) {
        return false;
      }

      const protocolAllowed = !rule.protocols || rule.protocols.includes(url.protocol.replace(':', ''));
      const portAllowed = !rule.ports || rule.ports.includes(port);
      return protocolAllowed && portAllowed;
    });

    if (!allowed && profile.defaultAction === 'deny') {
      throw new Error(`Network egress denied for ${url.hostname}:${port} under profile ${profile.name}`);
    }
  }

  private metricAttributes(request: AdapterExecutionRequest, error?: Error) {
    return {
      adapter: request.adapterId,
      operation: request.operation,
      ...(error ? { error: error.name } : {}),
    };
  }

  private recordSuccess(request: AdapterExecutionRequest, durationMs: number): void {
    this.successCounter.add(1, this.metricAttributes(request));
    this.latency.record(durationMs, this.metricAttributes(request));
  }

  private cacheResult<T>(key: string, result: AdapterExecutionResult<T>): void {
    const expiresAt = Date.now() + this.idempotencyTtlMs;
    this.idempotencyCache.set(key, { expiresAt, result });
  }

  private getCachedResult<T>(key: string): AdapterExecutionResult<T> | null {
    const cached = this.idempotencyCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.idempotencyCache.delete(key);
      return null;
    }

    return cached.result as AdapterExecutionResult<T>;
  }

  private async publishToDlq(
    request: AdapterExecutionRequest,
    error: Error,
    attempts: number,
    circuitState: CircuitState,
    idempotencyKey: string,
  ): Promise<void> {
    if (!this.dlqPublisher) {
      return;
    }

    const event: DlqEvent = {
      adapterId: request.adapterId,
      operation: request.operation,
      idempotencyKey,
      error: error.message,
      payload: request.payload,
      attempts,
      metadata: request.metadata,
      circuitState,
      timestamp: Date.now(),
    };

    await this.dlqPublisher.publish(event);
    this.dlqCounter.add(1, this.metricAttributes(request, error));
  }
}

class KafkaDlqPublisher implements DlqPublisher {
  private readonly kafka: Kafka;
  private producer: Producer | null = null;
  private readonly topic: string;

  constructor(config: DlqConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId ?? 'adapter-sdk',
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
      logLevel: config.logLevel,
    });
    this.topic = config.topic;
  }

  async publish(event: DlqEvent): Promise<void> {
    if (!this.producer) {
      this.producer = this.kafka.producer({ allowAutoTopicCreation: false, idempotent: true });
      await this.producer.connect();
    }

    const payload = JSON.stringify(event);
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: event.idempotencyKey ?? `${event.adapterId}:${event.operation}`,
          value: payload,
          headers: {
            'dlq.original-adapter': event.adapterId,
            'dlq.original-operation': event.operation,
            'dlq.attempts': String(event.attempts),
            'dlq.timestamp': String(event.timestamp),
          },
        },
      ],
    });
  }

  async shutdown(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
  }
}

export { KafkaDlqPublisher };
