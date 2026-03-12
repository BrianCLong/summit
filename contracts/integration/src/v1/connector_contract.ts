/**
 * Connector Contract v1
 * Defines the standard interface for IntelGraph data connectors.
 */

import { z } from 'zod';

/**
 * Connector Configuration Schema
 */
export const ConnectorConfigV1 = z.object({
  url: z.string().url().describe('The URL to fetch data from'),
  method: z.enum(['GET', 'POST', 'PUT']).default('GET').describe('HTTP method'),
  headers: z.record(z.string()).optional().describe('HTTP headers'),
  auth: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'api-key']),
    credentials: z.record(z.string()).optional(),
  }).optional(),
  timeout: z.number().int().positive().default(30000).describe('Timeout in milliseconds'),
});

export type ConnectorConfigV1 = z.infer<typeof ConnectorConfigV1>;

/**
 * Connector Record Schema (Output)
 */
export const ConnectorRecordV1 = z.object({
  id: z.string().describe('Deterministic record ID'),
  source_id: z.string().optional().describe('Original ID from source'),
  entity_type: z.string().describe('IntelGraph entity type'),
  properties: z.record(z.any()).describe('Entity properties'),
  pii_detections: z.array(z.object({
    field: z.string(),
    type: z.string(),
    severity: z.string(),
    action: z.enum(['allow', 'redact', 'block']),
  })).optional(),
  lineage: z.object({
    source_connector: z.string(),
    ingestion_timestamp: z.string().datetime(),
    connector_version: z.string(),
  }),
});

export type ConnectorRecordV1 = z.infer<typeof ConnectorRecordV1>;

/**
 * Connector Error Schema
 */
export const ConnectorErrorV1 = z.object({
  code: z.enum([
    'FETCH_ERROR',
    'PARSE_ERROR',
    'MAPPING_ERROR',
    'RATE_LIMIT_EXCEEDED',
    'UNAUTHORIZED',
    'VALIDATION_ERROR',
  ]),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
});

export type ConnectorErrorV1 = z.infer<typeof ConnectorErrorV1>;

/**
 * Connector Runtime Contract
 */
export const ConnectorRuntimeContractV1 = z.object({
  manifest: z.object({
    name: z.string(),
    version: z.string(),
    ingestion_type: z.enum(['batch', 'streaming', 'hybrid']),
  }),
  inputs: ConnectorConfigV1,
  outputs: z.array(ConnectorRecordV1),
  errors: z.array(ConnectorErrorV1),
});

export type ConnectorRuntimeContractV1 = z.infer<typeof ConnectorRuntimeContractV1>;
