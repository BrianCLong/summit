import {
  Connector,
  ConnectorContext,
  RateLimiter,
  ConnectorResult,
  ConnectorAction,
} from '@intelgraph/connector-sdk';
import { logger } from '../utils/logger.js';
import Ajv from 'ajv';

const ajv = new Ajv();

export class ToolbusExecutionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ToolbusExecutionError';
  }
}

export class SimpleRateLimiter implements RateLimiter {
  private lastRequest = 0;
  private tokens: number;

  constructor(
    private requestsPerMinute: number,
    private burstLimit: number
  ) {
    this.tokens = burstLimit;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = (60000 / this.requestsPerMinute);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens -= 1;
  }

  isLimited(): boolean {
    this.refill();
    return this.tokens < 1;
  }

  remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    // Simple token bucket refill
    const newTokens = (elapsed / 60000) * this.requestsPerMinute;
    this.tokens = Math.min(this.burstLimit, this.tokens + newTokens);
    this.lastRequest = now;
  }
}

export class ToolbusService {
  private connectors: Map<string, Connector> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    logger.info('ToolbusService initialized');
  }

  registerConnector(connector: Connector) {
    this.connectors.set(connector.manifest.id, connector);

    // Initialize rate limiter if configured
    if (connector.manifest.rateLimit) {
      this.rateLimiters.set(
        connector.manifest.id,
        new SimpleRateLimiter(
          connector.manifest.rateLimit.requestsPerMinute,
          connector.manifest.rateLimit.burstLimit
        )
      );
    }

    logger.info({ connectorId: connector.manifest.id }, 'Connector registered');
  }

  async executeTool(
    connectorId: string,
    actionName: string,
    params: Record<string, unknown>,
    context: Partial<ConnectorContext>
  ): Promise<ConnectorResult> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new ToolbusExecutionError(`Connector ${connectorId} not found`, 'CONNECTOR_NOT_FOUND');
    }

    // Check capability
    if (!connector.manifest.capabilities.includes('action')) {
      throw new ToolbusExecutionError(`Connector ${connectorId} does not support actions`, 'CAPABILITY_MISSING');
    }

    if (!connector.execute) {
      throw new ToolbusExecutionError(`Connector ${connectorId} has no execute method`, 'IMPLEMENTATION_MISSING');
    }

    // Rate Limiting
    const limiter = this.rateLimiters.get(connectorId);
    if (limiter) {
      await limiter.acquire();
    }

    // Validation
    const actions = connector.getActions ? await connector.getActions() : [];
    const actionDef = actions.find(a => a.name === actionName);

    if (actionDef && actionDef.inputSchema) {
      const validate = ajv.compile(actionDef.inputSchema);
      if (!validate(params)) {
        throw new ToolbusExecutionError(
          `Invalid parameters: ${ajv.errorsText(validate.errors)}`,
          'INVALID_PARAMS'
        );
      }
    } else {
        // Warning if action definition not found but trying to execute anyway?
        // Or strict mode? strict mode is safer.
        // But for MVP if getActions is missing we might skip validation.
        logger.warn({ connectorId, actionName }, 'Action definition not found or getActions not implemented, skipping schema validation');
    }

    // Execution with Retry (Exponential Backoff)
    let attempt = 0;
    const maxRetries = 3;
    let lastError: any;

    while (attempt <= maxRetries) {
      try {
        const fullContext: ConnectorContext = {
            logger: context.logger as any, // Cast or provide default
            metrics: context.metrics as any,
            rateLimiter: limiter || new SimpleRateLimiter(100, 10),
            stateStore: context.stateStore as any,
            emitter: context.emitter as any,
            signal: context.signal || new AbortController().signal
        };

        // SANDBOXING:
        // In a real implementation, this would run in a separate process or isolate.
        // Here we just wrap in a try-catch and maybe a timeout promise.
        return await Promise.race([
            connector.execute(actionName, params, fullContext),
            new Promise<ConnectorResult>((_, reject) =>
                setTimeout(() => reject(new Error('Tool execution timed out')), 30000)
            )
        ]);

      } catch (error: any) {
        lastError = error;
        // Check if retryable
        // Assuming error might have property 'retryable' or we decide based on type
        // BaseConnector wraps errors in ConnectorResult if it fails inside, but here we might catch thrown errors

        const isRetryable = error.retryable || error.message.includes('timeout') || error.code === 'ECONNRESET';

        if (!isRetryable || attempt === maxRetries) {
          throw new ToolbusExecutionError(
            `Execution failed: ${error.message}`,
            'EXECUTION_FAILED'
          );
        }

        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        logger.warn({ connectorId, actionName, attempt, error: error.message }, 'Retrying tool execution');
      }
    }

    throw new ToolbusExecutionError('Max retries exceeded', 'MAX_RETRIES');
  }
}

export const toolbus = new ToolbusService();
