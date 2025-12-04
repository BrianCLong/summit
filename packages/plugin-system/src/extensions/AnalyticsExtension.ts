import { BaseExtension } from './BaseExtension.js';
import { PluginContext, PluginManifest } from '../types/plugin.js';

/**
 * Base class for analytics plugins
 * Analytics plugins have read-only access to graph data and provide insights
 */
export abstract class AnalyticsExtension extends BaseExtension {
  constructor(manifest: PluginManifest) {
    super(manifest);
  }

  /**
   * Execute analytics on provided data
   */
  abstract analyze(input: AnalyticsInput): Promise<AnalyticsResult>;

  /**
   * Get analytics metadata (name, description, parameters)
   */
  abstract getMetadata(): AnalyticsMetadata;

  protected async onInitialize(context: PluginContext): Promise<void> {
    // Verify analytics plugin has required permissions
    const metadata = this.getMetadata();
    this.log.info(`Initializing analytics plugin: ${metadata.name}`);

    await this.validatePermissions(context);
  }

  protected async onStart(): Promise<void> {
    this.log.info('Analytics plugin started and ready to process requests');
  }

  protected async onStop(): Promise<void> {
    this.log.info('Analytics plugin stopped');
  }

  protected async onDestroy(): Promise<void> {
    this.log.info('Analytics plugin cleaned up');
  }

  /**
   * Validate plugin has necessary permissions
   */
  private async validatePermissions(_context: PluginContext): Promise<void> {
    const requiredPermissions = ['read:data', 'access:graph'];
    const hasPermissions = requiredPermissions.every(perm =>
      this.manifest.permissions.map(p => p.toString()).includes(perm)
    );

    if (!hasPermissions) {
      throw new Error(
        `Analytics plugin ${this.manifest.id} missing required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }
}

/**
 * Input data for analytics
 */
export interface AnalyticsInput {
  /**
   * Query to execute against graph
   */
  query?: GraphQuery;

  /**
   * Direct data input (alternative to query)
   */
  data?: AnalyticsData;

  /**
   * Analysis parameters
   */
  parameters?: Record<string, any>;

  /**
   * Context about the analysis request
   */
  context?: {
    userId?: string;
    investigationId?: string;
    timestamp?: Date;
  };
}

export interface GraphQuery {
  /**
   * Cypher query for Neo4j
   */
  cypher?: string;

  /**
   * Parameters for the query
   */
  parameters?: Record<string, any>;

  /**
   * Maximum number of results
   */
  limit?: number;
}

export interface AnalyticsData {
  entities?: Entity[];
  relationships?: Relationship[];
  metadata?: Record<string, any>;
}

export interface Entity {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface Relationship {
  id: string;
  type: string;
  source: string;
  target: string;
  properties: Record<string, any>;
}

/**
 * Result from analytics execution
 */
export interface AnalyticsResult {
  /**
   * Insights discovered
   */
  insights: Insight[];

  /**
   * Entities discovered or enriched
   */
  entities?: Entity[];

  /**
   * Relationships discovered
   */
  relationships?: Relationship[];

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Execution metadata
   */
  metadata: {
    executionTimeMs: number;
    dataPointsAnalyzed: number;
    algorithm?: string;
    version?: string;
  };

  /**
   * Visualizations for the results
   */
  visualizations?: Visualization[];
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  recommendations?: string[];
}

export interface Visualization {
  type: 'chart' | 'graph' | 'table' | 'heatmap' | 'timeline';
  title: string;
  config: Record<string, any>;
  data: any;
}

/**
 * Analytics plugin metadata
 */
export interface AnalyticsMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags?: string[];
  parameters: AnalyticsParameter[];
  supportedDataTypes: string[];
  outputTypes: string[];
}

export interface AnalyticsParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
}
