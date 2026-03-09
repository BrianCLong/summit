/**
 * Represents a single cost-related operation.
 * This event is designed to be privacy-safe, avoiding PII.
 */
export interface CostEvent {
  id: string;
  timestamp: string;
  tenantHash: string;
  scopeHash: string;
  operationType: "query" | "ingest" | "export" | "storage_growth";
  units: number;
  dimensions: CostDimensions;
  correlationId: string;
}
/**
 * Quantitative, non-sensitive dimensions of an operation used for cost calculation.
 * All dimensions are optional and bounded to prevent high cardinality.
 */
export interface CostDimensions {
  query_complexity?: number;
  rows_scanned?: number;
  rows_returned?: number;
  io_bytes?: number;
  objects_written?: number;
  cpu_ms?: number;
}
/**
 * Input for the unit calculator.
 */
export interface CostCalculationInput {
  operationType: CostEvent["operationType"];
  dimensions: CostDimensions;
  tenantId: string;
  scopeId: string;
  correlationId: string;
}
/**
 * Calculates a deterministic cost in abstract units.
 * @param input - The details of the operation.
 * @param version - The version of the weights to use.
 * @returns The calculated cost in units.
 */
export declare function calculateCostUnits(
  input: Omit<CostCalculationInput, "tenantId" | "scopeId" | "correlationId">,
  version?: string
): number;
/**
 * Constructs and "emits" a cost event.
 * In a real system, this would send the event to a logging pipeline,
 * a message queue (Kafka/SQS), or a metrics backend (Prometheus/DataDog).
 *
 * For this implementation, it logs to the console.
 *
 * @param input - The raw inputs for the cost event.
 */
export declare function emitCostEvent(input: CostCalculationInput): void;
//# sourceMappingURL=index.d.ts.map
