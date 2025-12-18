/**
 * DataLab Service
 *
 * Provides secure sandbox data operations including synthetic data generation,
 * data cloning with anonymization, scenario simulation, and promotion workflows.
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// API
export { DataLabAPI, getDataLabAPI } from './api/DataLabAPI.js';

// Data Operations
export {
  DataCloneService,
  getDataCloneService,
} from './data/DataCloneService.js';

// Anonymization
export {
  DataAnonymizer,
  getDataAnonymizer,
  type AnonymizationResult,
} from './anonymization/DataAnonymizer.js';

// Synthetic Data
export {
  SyntheticDataGenerator,
  getSyntheticDataGenerator,
} from './synthetic/SyntheticDataGenerator.js';

// Promotion
export {
  PromotionWorkflow,
  getPromotionWorkflow,
  ValidationCheckType,
  type ValidationCheckResult,
  type PromotionWorkflowConfig,
} from './promotion/PromotionWorkflow.js';

// Utilities
export { createLogger, logger } from './utils/logger.js';
