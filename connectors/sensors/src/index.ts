/**
 * Sensor Connectors Package
 *
 * Framework for building sensor connectors that ingest signals
 * into the Signal Bus streaming pipeline.
 *
 * @packageDocumentation
 */

// Base connector
export {
  BaseConnector,
  type BaseConnectorConfig,
  type ConnectorStatus,
  type ConnectorEvents,
  type ConnectorMetrics,
} from './base-connector.js';

// Connector manager
export {
  ConnectorManager,
  createConnectorManager,
  type ConnectorManagerConfig,
  type ConnectorManagerEvents,
} from './connector-manager.js';

// HTTP connector
export {
  HttpConnector,
  createHttpConnector,
  type HttpConnectorConfig,
} from './http-connector.js';

// Polling connector
export {
  PollingConnector,
  createPollingConnector,
  type PollingConnectorConfig,
} from './polling-connector.js';
