import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import {
  DiscoveredSource,
  DataSourceType,
  DiscoveryEvent,
} from '../types.js';
import { logger } from '../utils/logger.js';

export interface ScannerConfig {
  scanInterval: number; // ms
  endpoints: ScanEndpoint[];
  autoIngestThreshold: number; // confidence threshold for auto-ingest
}

export interface ScanEndpoint {
  type: DataSourceType;
  uri: string;
  credentials?: Record<string, string>;
  scanPattern?: string;
}

export interface ScanResult {
  sources: DiscoveredSource[];
  errors: Array<{ endpoint: string; error: string }>;
  duration: number;
}

/**
 * Automated Source Scanner
 * Continuously scans configured endpoints for new data sources
 */
export class SourceScanner extends EventEmitter {
  private config: ScannerConfig;
  private discoveredSources: Map<string, DiscoveredSource> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;

  constructor(config: ScannerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start automated scanning
   */
  start(): void {
    if (this.scanInterval) return;

    logger.info('Starting automated source scanner', {
      interval: this.config.scanInterval,
      endpoints: this.config.endpoints.length,
    });

    // Initial scan
    this.scan();

    // Schedule periodic scans
    this.scanInterval = setInterval(() => {
      this.scan();
    }, this.config.scanInterval);
  }

  /**
   * Stop automated scanning
   */
  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    logger.info('Source scanner stopped');
  }

  /**
   * Perform a full scan of all configured endpoints
   */
  async scan(): Promise<ScanResult> {
    if (this.isScanning) {
      logger.warn('Scan already in progress, skipping');
      return { sources: [], errors: [], duration: 0 };
    }

    this.isScanning = true;
    const startTime = Date.now();
    const results: DiscoveredSource[] = [];
    const errors: Array<{ endpoint: string; error: string }> = [];

    try {
      for (const endpoint of this.config.endpoints) {
        try {
          const sources = await this.scanEndpoint(endpoint);
          results.push(...sources);
        } catch (error) {
          errors.push({
            endpoint: endpoint.uri,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Process newly discovered sources
      for (const source of results) {
        const existing = this.discoveredSources.get(source.connectionUri);
        if (!existing) {
          this.discoveredSources.set(source.connectionUri, source);
          this.emitEvent('source_discovered', source);

          // Auto-ingest if confidence meets threshold
          if (source.confidenceScore >= this.config.autoIngestThreshold) {
            source.autoIngestEnabled = true;
            this.emit('auto_ingest', source);
          }
        } else {
          // Update last scanned timestamp
          existing.lastScannedAt = new Date();
        }
      }

      return {
        sources: results,
        errors,
        duration: Date.now() - startTime,
      };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan a specific endpoint based on its type
   */
  private async scanEndpoint(endpoint: ScanEndpoint): Promise<DiscoveredSource[]> {
    switch (endpoint.type) {
      case 'database':
        return this.scanDatabase(endpoint);
      case 'api':
        return this.scanApi(endpoint);
      case 'file':
        return this.scanFileSystem(endpoint);
      case 's3':
        return this.scanS3(endpoint);
      case 'kafka':
        return this.scanKafka(endpoint);
      default:
        return [];
    }
  }

  /**
   * Scan database for tables/schemas
   */
  private async scanDatabase(endpoint: ScanEndpoint): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];

    // Detect database type from URI
    const dbType = this.detectDatabaseType(endpoint.uri);

    try {
      // Query information_schema for available tables
      const tables = await this.queryDatabaseTables(endpoint);

      for (const table of tables) {
        sources.push({
          id: uuid(),
          name: `${dbType}:${table.schema}.${table.name}`,
          type: 'database',
          connectionUri: `${endpoint.uri}/${table.schema}.${table.name}`,
          status: 'discovered',
          discoveredAt: new Date(),
          confidenceScore: this.calculateSourceConfidence(table),
          tags: [dbType, table.schema],
          autoIngestEnabled: false,
          metadata: {
            schema: table.schema,
            tableName: table.name,
            estimatedRows: table.rowCount,
            columns: table.columns,
          },
        });
      }
    } catch (error) {
      logger.error('Database scan failed', { endpoint: endpoint.uri, error });
    }

    return sources;
  }

  /**
   * Scan REST API endpoints for available resources
   */
  private async scanApi(endpoint: ScanEndpoint): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];

    try {
      // Try to fetch OpenAPI/Swagger spec
      const specUrls = [
        `${endpoint.uri}/openapi.json`,
        `${endpoint.uri}/swagger.json`,
        `${endpoint.uri}/api-docs`,
      ];

      for (const specUrl of specUrls) {
        try {
          const response = await fetch(specUrl);
          if (response.ok) {
            const spec = await response.json();
            const endpoints = this.extractApiEndpoints(spec);

            for (const ep of endpoints) {
              sources.push({
                id: uuid(),
                name: `API:${ep.path}`,
                type: 'api',
                connectionUri: `${endpoint.uri}${ep.path}`,
                status: 'discovered',
                discoveredAt: new Date(),
                confidenceScore: 0.8,
                tags: ['api', ep.method],
                autoIngestEnabled: false,
                metadata: {
                  method: ep.method,
                  parameters: ep.parameters,
                  responseSchema: ep.responseSchema,
                },
              });
            }
            break;
          }
        } catch {
          // Continue to next spec URL
        }
      }
    } catch (error) {
      logger.error('API scan failed', { endpoint: endpoint.uri, error });
    }

    return sources;
  }

  /**
   * Scan filesystem for data files
   */
  private async scanFileSystem(endpoint: ScanEndpoint): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];
    const pattern = endpoint.scanPattern || '**/*.{csv,json,parquet,xlsx}';

    // In production, use glob to find matching files
    // For now, return placeholder
    logger.info('Scanning filesystem', { path: endpoint.uri, pattern });

    return sources;
  }

  /**
   * Scan S3 bucket for data objects
   */
  private async scanS3(endpoint: ScanEndpoint): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];

    // Parse S3 URI
    const match = endpoint.uri.match(/s3:\/\/([^/]+)(\/.*)?/);
    if (!match) return sources;

    const bucket = match[1];
    const prefix = match[2] || '/';

    logger.info('Scanning S3 bucket', { bucket, prefix });

    // In production, use AWS SDK to list objects
    // Return discovered data sources

    return sources;
  }

  /**
   * Scan Kafka for available topics
   */
  private async scanKafka(endpoint: ScanEndpoint): Promise<DiscoveredSource[]> {
    const sources: DiscoveredSource[] = [];

    logger.info('Scanning Kafka', { brokers: endpoint.uri });

    // In production, use Kafka admin client to list topics
    // Return discovered topics as sources

    return sources;
  }

  /**
   * Helper methods
   */
  private detectDatabaseType(uri: string): string {
    if (uri.startsWith('postgresql://') || uri.startsWith('postgres://')) return 'postgresql';
    if (uri.startsWith('mysql://')) return 'mysql';
    if (uri.startsWith('mongodb://')) return 'mongodb';
    if (uri.startsWith('neo4j://') || uri.startsWith('bolt://')) return 'neo4j';
    return 'unknown';
  }

  private async queryDatabaseTables(
    endpoint: ScanEndpoint
  ): Promise<Array<{ schema: string; name: string; rowCount: number; columns: string[] }>> {
    // Placeholder - implement actual database queries
    return [];
  }

  private extractApiEndpoints(
    spec: unknown
  ): Array<{ path: string; method: string; parameters: unknown[]; responseSchema: unknown }> {
    // Extract endpoints from OpenAPI spec
    const endpoints: Array<{ path: string; method: string; parameters: unknown[]; responseSchema: unknown }> = [];

    if (spec && typeof spec === 'object' && 'paths' in spec) {
      const paths = (spec as { paths: Record<string, unknown> }).paths;
      for (const [path, methods] of Object.entries(paths)) {
        if (methods && typeof methods === 'object') {
          for (const [method, def] of Object.entries(methods as Record<string, unknown>)) {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
              endpoints.push({
                path,
                method: method.toUpperCase(),
                parameters: [],
                responseSchema: null,
              });
            }
          }
        }
      }
    }

    return endpoints;
  }

  private calculateSourceConfidence(table: { schema: string; name: string; rowCount: number }): number {
    // Calculate confidence based on source characteristics
    let confidence = 0.5;

    // Higher confidence for tables with data
    if (table.rowCount > 0) confidence += 0.2;
    if (table.rowCount > 1000) confidence += 0.1;

    // Lower confidence for system schemas
    if (['pg_catalog', 'information_schema', 'sys'].includes(table.schema)) {
      confidence -= 0.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private emitEvent(type: DiscoveryEvent['type'], payload: unknown): void {
    const event: DiscoveryEvent = {
      type,
      payload,
      timestamp: new Date(),
      correlationId: uuid(),
    };
    this.emit('event', event);
  }

  /**
   * Get all discovered sources
   */
  getDiscoveredSources(): DiscoveredSource[] {
    return Array.from(this.discoveredSources.values());
  }

  /**
   * Get source by ID
   */
  getSource(id: string): DiscoveredSource | undefined {
    return Array.from(this.discoveredSources.values()).find(s => s.id === id);
  }

  /**
   * Add endpoint for scanning
   */
  addEndpoint(endpoint: ScanEndpoint): void {
    this.config.endpoints.push(endpoint);
    logger.info('Added scan endpoint', { type: endpoint.type, uri: endpoint.uri });
  }
}
