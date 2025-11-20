/**
 * @intelgraph/data-integration
 * Enterprise data integration framework with ETL/ELT capabilities
 */

// Types
export * from './types';
export * from './types/connector.types';
export * from './types/pipeline.types';

// Interfaces
export * from './interfaces/IConnector';
export * from './interfaces/IPipeline';

// Core implementations
export * from './core/BaseConnector';
export * from './core/BasePipeline';

// Version
export const VERSION = '0.1.0';
