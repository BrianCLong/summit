/**
 * IOC Manager Package
 * Comprehensive IOC management with deduplication and enrichment
 */

export * from './types.js';
export * from './ioc-manager.js';
export * from './enrichment.js';

// Re-export key classes
export { IOCManager } from './ioc-manager.js';
export { IOCEnrichmentService } from './enrichment.js';
