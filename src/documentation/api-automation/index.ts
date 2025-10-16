/**
 * API Documentation Automation Module
 *
 * Exports all API documentation automation components
 */

export {
  OpenAPIGenerator,
  APIEndpointDiscovery,
  type APIDocumentationConfig,
  type APIEndpoint,
  type ContentMetrics,
} from './OpenAPIGenerator.js';

export {
  DocumentationPipeline,
  type PipelineConfig,
  type PipelineResult,
} from './DocumentationPipeline.js';
