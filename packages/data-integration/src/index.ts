/**
 * IntelGraph Data Integration Framework
 * Enterprise-grade data integration and connector framework
 */

// Core types
export * from './types/index.js';

// Base connector
export { BaseConnector } from './core/BaseConnector.js';

// Database connectors
export { PostgreSQLConnector } from './connectors/PostgreSQLConnector.js';
export { MySQLConnector } from './connectors/MySQLConnector.js';
export { MongoDBConnector } from './connectors/MongoDBConnector.js';

// API and storage connectors
export { RESTAPIConnector } from './connectors/RESTAPIConnector.js';
export { S3Connector } from './connectors/S3Connector.js';

// Re-export commonly used types
export type {
  DataSourceConfig,
  ConnectionConfig,
  ExtractionConfig,
  TransformationConfig,
  LoadConfig,
  ScheduleConfig,
  PipelineRun,
  PipelineMetrics,
  DataQualityReport,
  ConnectorPlugin,
  ConnectorCapabilities
} from './types/index.js';

export {
  SourceType,
  ExtractionStrategy,
  LoadStrategy,
  PipelineStatus
} from './types/index.js';
