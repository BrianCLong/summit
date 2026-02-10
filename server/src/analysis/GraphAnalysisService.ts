import { getNeo4jDriver } from '../db/neo4j.ts';
import {
  Graph,
  GraphNode,
  GraphEdge,
  GraphAnalysisJob,
  GraphAlgorithmKey,
  ShortestPathParams,
  KHopParams,
  DegreeCentralityParams
} from './graphTypes.ts';
import { shortestPath } from './algorithms/shortestPath.ts';
import { kHopNeighborhood } from './algorithms/traversal.ts';
import { degreeCentrality } from './algorithms/centrality.ts';
import { connectedComponents } from './algorithms/community.ts';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.ts';

export class GraphAnalysisService {
  private static instance: GraphAnalysisService;

  private constructor() { }

  public static getInstance(): GraphAnalysisService {
    if (!GraphAnalysisService.instance) {
      GraphAnalysisService.instance = new GraphAnalysisService();
    }
    return GraphAnalysisService.instance;
  }

  // In-memory job storage for this pass (could be Redis/DB later)
  private jobs: Map<string, GraphAnalysisJob> = new Map();

  /**
   * Load graph slice from Neo4j into memory
   */
  private async loadGraphSlice(tenantId: string, nodeLabels: string[] = [], edgeTypes: string[] = []): Promise<Graph> {
    const start = Date.now();

    // Default to all nodes/edges for the tenant if not specified
    // In a real scenario, we'd want stronger limits or pagination
    const nodeQuery = `
      MATCH (n)
      WHERE n.tenantId = $tenantId
      ${nodeLabels.length > 0 ? `AND any(l IN labels(n) WHERE l IN $nodeLabels)` : ''}
      RETURN n, labels(n) as lbls
      LIMIT 10000
    `;

    const edgeQuery = `
      MATCH (n)-[r]->(m)
      WHERE n.tenantId = $tenantId AND m.tenantId = $tenantId
      ${edgeTypes.length > 0 ? `AND type(r) IN $edgeTypes` : ''}
      RETURN n.id as source, m.id as target, r, type(r) as type
      LIMIT 50000
    `;

    try {
      const driver = getNeo4jDriver();
      const session = driver.session();

      const nodeResult = await session.run(nodeQuery, { tenantId, nodeLabels });
      const edgeResult = await session.run(edgeQuery, { tenantId, edgeTypes });

      const nodes: GraphNode[] = nodeResult.records.map((record: any) => {
        const n = record.get('n').properties;
        const lbls = record.get('lbls');
        return {
          id: n.id,
          type: lbls[0] || 'Unknown', // Primary label
          label: n.label || n.name || n.id,
          tenantId: n.tenantId,
          properties: n
        };
      });

      const edges: GraphEdge[] = edgeResult.records.map((record: any) => {
        const r = record.get('r').properties;
        return {
          id: r.id || `${record.get('source')}-${record.get('type')}-${record.get('target')}`, // Fallback ID
          source: record.get('source'),
          target: record.get('target'),
          type: record.get('type'),
          tenantId: tenantId, // Assumed from context
          properties: r,
          weight: r.weight ? Number(r.weight) : undefined
        };
      });

      logger.info(`Loaded graph slice for tenant ${tenantId}: ${nodes.length} nodes, ${edges.length} edges in ${Date.now() - start}ms`);

      await session.close();
      return { nodes, edges };

    } catch (error: any) {
      logger.error('Error loading graph slice', { error, tenantId });
      throw error;
    }
  }

  public async createJob(
    tenantId: string,
    algorithm: GraphAlgorithmKey,
    params: Record<string, unknown>
  ): Promise<GraphAnalysisJob> {
    const job: GraphAnalysisJob = {
      id: uuidv4(),
      tenantId,
      algorithm,
      params,
      status: 'pending'
    };
    this.jobs.set(job.id, job);
    return job;
  }

  public async runJob(jobId: string): Promise<GraphAnalysisJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'running';
    job.startTime = new Date();
    this.jobs.set(jobId, job);

    try {
      // 1. Load Data
      // For MVP, we load the "whole" tenant graph (up to limit).
      // Future: parse params to filter loading.
      const graph = await this.loadGraphSlice(job.tenantId);

      // 2. Run Algorithm
      let result: unknown;

      switch (job.algorithm) {
        case 'shortestPath': {
          const p = job.params as unknown as ShortestPathParams;
          if (!p.sourceNodeId || !p.targetNodeId) throw new Error("Missing sourceNodeId or targetNodeId");
          result = shortestPath(graph, p.sourceNodeId, p.targetNodeId, p.maxDepth);
          break;
        }
        case 'kHopNeighborhood': {
          const p = job.params as unknown as KHopParams;
          if (!p.sourceNodeId || !p.k) throw new Error("Missing sourceNodeId or k");
          result = kHopNeighborhood(graph, p.sourceNodeId, p.k, p.direction);
          break;
        }
        case 'degreeCentrality': {
          const p = job.params as unknown as DegreeCentralityParams;
          result = degreeCentrality(graph, p.direction, p.topK);
          break;
        }
        case 'connectedComponents': {
          result = connectedComponents(graph);
          break;
        }
        default:
          throw new Error(`Unknown algorithm: ${job.algorithm}`);
      }

      job.result = result;
      job.status = 'completed';
    } catch (error: any) {
      logger.error(`Graph analysis job ${jobId} failed`, error);
      job.status = 'failed';
      job.error = error.message;
    } finally {
      job.endTime = new Date();
      this.jobs.set(jobId, job);
    }

    return job;
  }

  public getJob(jobId: string, tenantId: string): GraphAnalysisJob | undefined {
    const job = this.jobs.get(jobId);
    if (job && job.tenantId === tenantId) return job;
    return undefined;
  }
}
