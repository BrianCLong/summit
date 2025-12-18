/**
 * IntelGraph CLI - Public API
 * Export modules for programmatic usage
 */

export { GraphClient, type GraphQueryResult } from './lib/graph-client.js';
export { AgentClient, type AgentConfig, type AgentStatus } from './lib/agent-client.js';
export { ExportManager, type ExportOptions, type ExportManifest } from './lib/export-manager.js';
export { PgVectorSync, type SyncOptions, type SyncStatus } from './lib/pgvector-sync.js';
export { loadConfig, type CLIConfig } from './lib/config.js';
export { VERSION } from './lib/constants.js';
