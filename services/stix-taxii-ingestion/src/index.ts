/**
 * STIX 2.1 / TAXII 2.1 Feed Ingestion Service
 *
 * A comprehensive ingestion service for threat intelligence feeds with support for:
 * - STIX 2.1 object parsing and validation
 * - TAXII 2.1 client with proxy support for air-gapped environments
 * - pgvector storage for semantic IOC search
 * - Neo4j graph storage for threat actor relationship analysis
 * - AI-powered enrichment with embedding generation
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// Client
export * from './client/index.js';

// Storage
export * from './storage/index.js';

// Enrichment
export * from './enrichment/index.js';

// Services
export * from './services/index.js';

// Version
export const VERSION = '1.0.0';
