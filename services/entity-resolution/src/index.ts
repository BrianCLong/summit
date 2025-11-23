/**
 * Entity Resolution Service - Main Entry Point
 *
 * Export all public APIs
 */

// Domain models
export * from './domain/EntityRecord.js';

// Feature extraction and matching
export * from './features/normalization.js';
export * from './features/similarity.js';
export * from './features/extraction.js';
export * from './matching/blocking.js';
export * from './matching/classifier.js';

// Services
export * from './services/ErService.js';

// Repositories
export * from './repositories/EntityRecordRepository.js';
export * from './repositories/InMemoryRepositories.js';

// API
export * from './api/routes.js';
