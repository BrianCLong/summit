import pino from 'pino';
import {
  businessUserSignupsTotal,
  businessApiCallsTotal,
  businessRevenueTotal,
} from './metrics.js';

const logger = pino({ name: 'business-metrics' });

export type BusinessMetricEvent = {
  type: 'user_signup' | 'api_call' | 'revenue';
  tenant?: string;
  plan?: string;
  service?: string;
  route?: string;
  statusCode?: number;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

function normalize(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return value.toLowerCase().replace(/[^a-z0-9-_\.]/g, '-');
}

/**
 * Records a user signup event.
 *
 * @param event - The signup event data.
 * @param event.tenant - The tenant ID.
 * @param event.plan - The subscription plan (e.g., 'free', 'pro').
 * @param event.metadata - Additional metadata.
 */
export function recordUserSignup(
  event: Pick<BusinessMetricEvent, 'tenant' | 'plan' | 'metadata'>,
): void {
  const tenant = normalize(event.tenant, 'unknown');
  const plan = normalize(event.plan, 'unspecified');

  businessUserSignupsTotal.inc({ tenant, plan });
  logger.debug(
    { tenant, plan, metadata: event.metadata },
    'Recorded user signup metric',
  );
}

/**
 * Records an API call event.
 *
 * @param event - The API call event data.
 * @param event.tenant - The tenant ID.
 * @param event.service - The service name.
 * @param event.route - The API route.
 * @param event.statusCode - The HTTP status code.
 * @param event.metadata - Additional metadata.
 */
export function recordApiCall(
  event: Pick<
    BusinessMetricEvent,
    'tenant' | 'service' | 'route' | 'statusCode' | 'metadata'
  >,
): void {
  const tenant = normalize(event.tenant, 'unknown');
  const service = normalize(event.service, 'core');
  const route = event.route ?? 'unknown';
  const statusCode = event.statusCode ?? 200;

  businessApiCallsTotal.inc({
    tenant,
    service,
    route,
    status_code: String(statusCode),
  });
  logger.debug(
    { tenant, service, route, statusCode, metadata: event.metadata },
    'Recorded API call metric',
  );
}

/**
 * Records a revenue event.
 *
 * @param event - The revenue event data.
 * @param event.tenant - The tenant ID.
 * @param event.currency - The currency code (e.g., 'USD').
 * @param event.amount - The revenue amount.
 * @param event.metadata - Additional metadata.
 */
export function recordRevenue(
  event: Pick<
    BusinessMetricEvent,
    'tenant' | 'currency' | 'amount' | 'metadata'
  >,
): void {
  const tenant = normalize(event.tenant, 'unknown');
  const currency = normalize(event.currency, 'usd').toUpperCase();
  const amount = Number(event.amount ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    logger.warn(
      { tenant, currency, amount },
      'Ignored revenue metric with invalid amount',
    );
    return;
  }

  businessRevenueTotal.inc({ tenant, currency }, amount);
  logger.debug(
    { tenant, currency, amount, metadata: event.metadata },
    'Recorded revenue metric',
  );
}

/**
 * Records a generic business event by dispatching to the appropriate handler based on event type.
 *
 * @param event - The business metric event.
 */
export function recordBusinessEvent(event: BusinessMetricEvent): void {
  switch (event.type) {
    case 'user_signup':
      recordUserSignup(event);
      break;
    case 'api_call':
      recordApiCall(event);
      break;
    case 'revenue':
      recordRevenue(event);
      break;
    default:
      logger.warn({ event }, 'Unsupported business metric event type received');
  }
}
