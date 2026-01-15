import { createHash } from 'crypto';

// --- Data Structures ---

/**
 * Represents a single cost-related operation.
 * This event is designed to be privacy-safe, avoiding PII.
 */
export interface CostEvent {
  id: string; // Unique, deterministic ID for idempotency
  timestamp: string;
  tenantHash: string; // Hashed tenant ID
  scopeHash: string; // Hashed case/project/scope ID
  operationType: 'query' | 'ingest' | 'export' | 'storage_growth';
  units: number; // Calculated cost units
  dimensions: CostDimensions;
  correlationId: string; // ID linking to the original request
}

/**
 * Quantitative, non-sensitive dimensions of an operation used for cost calculation.
 * All dimensions are optional and bounded to prevent high cardinality.
 */
export interface CostDimensions {
  // For queries
  query_complexity?: number; // Abstract measure of query complexity
  rows_scanned?: number;
  rows_returned?: number;
  // For ingest/export
  io_bytes?: number;
  objects_written?: number;
  // Common
  cpu_ms?: number;
}

/**
 * Input for the unit calculator.
 */
export interface CostCalculationInput {
  operationType: CostEvent['operationType'];
  dimensions: CostDimensions;
  tenantId: string; // Raw tenant ID for hashing
  scopeId: string; // Raw scope ID for hashing
  correlationId: string;
}

// --- Unit Calculator ---

const LATEST_WEIGHTS_VERSION = 'v1';

const WEIGHTS = {
  v1: {
    query: {
      base: 10,
      complexity_factor: 2,
      rows_scanned_factor: 0.01,
      rows_returned_factor: 0.1,
      cpu_ms_factor: 0.5,
    },
    ingest: {
      base: 5,
      io_bytes_factor: 0.0001,
      objects_written_factor: 1,
    },
    export: {
      base: 20,
      io_bytes_factor: 0.0002,
      objects_written_factor: 2,
    },
    storage_growth: {
        base: 1,
        io_bytes_factor: 0.0001,
    }
  },
};

/**
 * Calculates a deterministic cost in abstract units.
 * @param input - The details of the operation.
 * @param version - The version of the weights to use.
 * @returns The calculated cost in units.
 */
export function calculateCostUnits(
  input: Omit<CostCalculationInput, 'tenantId'|'scopeId'|'correlationId'>,
  version: string = LATEST_WEIGHTS_VERSION
): number {
  const weights = WEIGHTS[version];
  if (!weights) {
    throw new Error(`Unknown cost calculation version: ${version}`);
  }

  const { operationType, dimensions } = input;
  const opWeights = weights[operationType];
  let units = opWeights.base;

  if (operationType === 'query') {
    units += (dimensions.query_complexity ?? 0) * opWeights.complexity_factor;
    units += (dimensions.rows_scanned ?? 0) * opWeights.rows_scanned_factor;
    units += (dimensions.rows_returned ?? 0) * opWeights.rows_returned_factor;
    units += (dimensions.cpu_ms ?? 0) * opWeights.cpu_ms_factor;
  } else if (operationType === 'ingest' || operationType === 'export' || operationType === 'storage_growth') {
    units += (dimensions.io_bytes ?? 0) * opWeights.io_bytes_factor;
    if ('objects_written_factor' in opWeights) {
        units += (dimensions.objects_written ?? 0) * opWeights.objects_written_factor;
    }
  }

  return Math.round(units);
}

// --- Emitter ---

/**
 * Hashes an identifier using a stable, non-reversible algorithm.
 * @param identifier - The raw string to hash.
 * @returns A hex-encoded SHA256 hash.
 */
function hashIdentifier(identifier: string): string {
  return createHash('sha256').update(identifier).digest('hex');
}

/**
 * Generates a deterministic, idempotent ID for the cost event.
 * Format: `<correlationId>:<operationType>`
 * @param correlationId - The unique ID of the triggering request.
 * @param operationType - The type of operation.
 * @returns A unique, deterministic event ID.
 */
function generateEventId(correlationId: string, operationType: CostEvent['operationType']): string {
  const hash = createHash('sha256')
    .update(correlationId)
    .update(operationType)
    .digest('hex');
  return `cost-${hash.substring(0, 16)}`;
}


/**
 * Constructs and "emits" a cost event.
 * In a real system, this would send the event to a logging pipeline,
 * a message queue (Kafka/SQS), or a metrics backend (Prometheus/DataDog).
 *
 * For this implementation, it logs to the console.
 *
 * @param input - The raw inputs for the cost event.
 */
export function emitCostEvent(input: CostCalculationInput): void {
  const { operationType, dimensions, tenantId, scopeId, correlationId } = input;

  const units = calculateCostUnits({ operationType, dimensions });

  const event: CostEvent = {
    id: generateEventId(correlationId, operationType),
    timestamp: new Date().toISOString(),
    tenantHash: hashIdentifier(tenantId),
    scopeHash: hashIdentifier(scopeId),
    operationType,
    units,
    dimensions,
    correlationId,
  };

  // In a real implementation, this would be a more robust emitter.
  // For now, we log to stdout in a structured JSON format.
  process.stdout.write(`${JSON.stringify({ type: 'CostEvent', ...event })}\n`);
}
