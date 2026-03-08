"use strict";
/**
 * CLI Constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANIFEST_VERSION = exports.CHECKSUM_ALGORITHM = exports.DEFAULT_TIMEOUT_MS = exports.DEFAULT_QUERY_LIMIT = exports.MAX_QUERY_RESULTS = exports.EXIT_CODES = exports.CONFIG_DIR = exports.CONFIG_FILE_NAME = exports.QUERY_LANGUAGES = exports.AGENT_TYPES = exports.EXPORT_FORMATS = exports.DEFAULT_POSTGRES_DB = exports.DEFAULT_POSTGRES_PORT = exports.DEFAULT_POSTGRES_HOST = exports.DEFAULT_NEO4J_USER = exports.DEFAULT_NEO4J_URI = exports.VERSION = void 0;
exports.VERSION = '1.0.0';
exports.DEFAULT_NEO4J_URI = 'bolt://localhost:7687';
exports.DEFAULT_NEO4J_USER = 'neo4j';
exports.DEFAULT_POSTGRES_HOST = 'localhost';
exports.DEFAULT_POSTGRES_PORT = 5432;
exports.DEFAULT_POSTGRES_DB = 'intelgraph';
exports.EXPORT_FORMATS = ['json', 'csv', 'parquet', 'graphml'];
exports.AGENT_TYPES = [
    'investigation',
    'enrichment',
    'analysis',
    'correlation',
    'report',
];
exports.QUERY_LANGUAGES = ['cypher', 'gremlin', 'sparql'];
exports.CONFIG_FILE_NAME = '.intelgraphrc';
exports.CONFIG_DIR = '.intelgraph';
exports.EXIT_CODES = {
    SUCCESS: 0,
    GENERAL_ERROR: 1,
    INVALID_ARGUMENT: 2,
    CONNECTION_ERROR: 3,
    AUTHENTICATION_ERROR: 4,
    NOT_FOUND: 5,
    TIMEOUT: 6,
    EXPORT_ERROR: 7,
    SYNC_ERROR: 8,
    POLICY_ERROR: 2, // Policy/sandbox violations use exit code 2
    SANDBOX_ERROR: 2, // Policy/sandbox violations use exit code 2
    GIT_WORKFLOW_ERROR: 2, // Git workflow errors use exit code 2
    PROVIDER_ERROR: 3, // Provider errors after retries use exit code 3
};
exports.MAX_QUERY_RESULTS = 10000;
exports.DEFAULT_QUERY_LIMIT = 100;
exports.DEFAULT_TIMEOUT_MS = 30000;
exports.CHECKSUM_ALGORITHM = 'sha256';
exports.MANIFEST_VERSION = '1.0';
