/**
 * CLI Constants
 */

export const VERSION = '1.0.0';

export const DEFAULT_NEO4J_URI = 'bolt://localhost:7687';
export const DEFAULT_NEO4J_USER = 'neo4j';
export const DEFAULT_POSTGRES_HOST = 'localhost';
export const DEFAULT_POSTGRES_PORT = 5432;
export const DEFAULT_POSTGRES_DB = 'intelgraph';

export const EXPORT_FORMATS = ['json', 'csv', 'parquet', 'graphml'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const AGENT_TYPES = [
  'investigation',
  'enrichment',
  'analysis',
  'correlation',
  'report',
] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const QUERY_LANGUAGES = ['cypher', 'gremlin', 'sparql'] as const;
export type QueryLanguage = (typeof QUERY_LANGUAGES)[number];

export const CONFIG_FILE_NAME = '.intelgraphrc';
export const CONFIG_DIR = '.intelgraph';

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENT: 2,
  CONNECTION_ERROR: 3,
  AUTHENTICATION_ERROR: 4,
  NOT_FOUND: 5,
  TIMEOUT: 6,
  EXPORT_ERROR: 7,
  SYNC_ERROR: 8,
} as const;

export const MAX_QUERY_RESULTS = 10000;
export const DEFAULT_QUERY_LIMIT = 100;
export const DEFAULT_TIMEOUT_MS = 30000;

export const CHECKSUM_ALGORITHM = 'sha256';
export const MANIFEST_VERSION = '1.0';
