/**
 * IntelGraph ETL Package
 * Multi-source data fusion and ETL pipeline
 */

// Export types
export * from './types.js';

// Export connectors
export * from './connectors/index.js';

// Export transformers
export * from './transformers/index.js';

// Export pipeline orchestration
export * from './pipeline/orchestrator.js';

// Export lineage tracking
export * from './lineage/tracker.js';

import { registerAllConnectors } from './connectors/index.js';
import { registerAllTransformers } from './transformers/index.js';

/**
 * Initialize ETL package
 * Registers all connectors and transformers
 */
export function initializeETL(): void {
  registerAllConnectors();
  registerAllTransformers();
}

// Auto-initialize on import
initializeETL();
