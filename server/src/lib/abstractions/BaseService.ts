import logger from '../../config/logger.js';
import { PrometheusMetrics } from '../../utils/metrics.js';

export interface BaseServiceConfig {
  enabled?: boolean;
  [key: string]: any;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: Record<string, any>;
}

/**
 * BaseService: The canonical abstraction for all domain services.
 * Enforces consistent logging, metrics, and health checks.
 */
export abstract class BaseService<TConfig extends BaseServiceConfig = BaseServiceConfig> {
  protected readonly config: TConfig;
  protected readonly logger: typeof logger;
  protected readonly metrics: PrometheusMetrics;
  protected readonly serviceName: string;

  constructor(serviceName: string, config: TConfig) {
    this.serviceName = serviceName;
    this.config = config;
    this.logger = logger.child({ service: serviceName });
    // Normalize service name for metrics (e.g. 'AuthService' -> 'auth')
    const metricName = serviceName.toLowerCase().replace(/service$/i, '');
    this.metrics = new PrometheusMetrics(metricName);
  }

  /**
   * Return the health status of the service.
   */
  public abstract getHealth(): Promise<ServiceHealth> | ServiceHealth;

  /**
   * Standardized error logging helper.
   */
  protected logError(message: string, error: unknown, context: Record<string, any> = {}) {
    const errObj = error instanceof Error ? { message: error.message, stack: error.stack, ...error } : { message: String(error) };
    this.logger.error({ err: errObj, ...context }, message);
  }
}
