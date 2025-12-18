/**
 * Signal Bus Service
 *
 * Real-time signal ingestion, validation, enrichment, and routing service.
 *
 * @packageDocumentation
 */

// Main service
export { SignalBusService, createSignalBusService } from './server.js';

// Configuration
export { loadConfig, getConfig, type Config } from './config.js';

// Types
export * from './types.js';

// Pipeline components
export {
  SignalValidatorService,
  createSignalValidator,
  SignalNormalizerService,
  createSignalNormalizer,
  SignalRouterService,
  createSignalRouter,
} from './pipeline/index.js';

// Enrichment components
export {
  EnrichmentPipeline,
  createEnrichmentPipeline,
  GeoIpEnricherService,
  createGeoIpEnricher,
  DeviceEnricherService,
  createDeviceEnricher,
} from './enrichment/index.js';

// Rule engine
export {
  RuleEvaluatorService,
  createRuleEvaluator,
} from './rules/index.js';

// Backpressure handling
export {
  BackpressureHandler,
  createBackpressureHandler,
} from './backpressure/index.js';
