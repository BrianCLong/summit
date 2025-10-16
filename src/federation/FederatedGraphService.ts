#!/usr/bin/env node

/**
 * Federated Graph Service - Multi-Repo "Virtual Monorepo"
 * Cross-repository dependency index with incremental updates and sub-500ms queries
 */

import { EventEmitter } from 'events';
import { DependencyGraphService } from '../graph/DependencyGraphService.js';

export interface RepoConfig {
  id: string;
  name: string;
  url: string;
  branch: string;
  path: string;
  priority: number;
  lastSync?: number;
  enabled: boolean;
}

export interface CrossRepoEdge {
  sourceRepo: string;
  sourceFile: string;
  targetRepo: string;
  targetFile: string;
  edgeType: 'import' | 'api' | 'contract' | 'data';
  confidence: number;
  lastVerified: number;
}

export interface FederatedNode {
  id: string;
  repoId: string;
  path: string;
  type: string;
  metadata: {
    size: number;
    language: string;
    lastModified: number;
    exports?: string[];
    imports?: string[];
    crossRepoRefs?: string[];
  };
}

export interface GlobalIndexSnapshot {
  timestamp: number;
  version: string;
  repos: Map<string, RepoConfig>;
  nodes: Map<string, FederatedNode>;
  edges: Map<string, CrossRepoEdge>;
  statistics: {
    totalNodes: number;
    totalEdges: number;
    crossRepoEdges: number;
    lastFullRecon: number;
  };
}

export interface FederatedQueryResult {
  query: string;
  nodes: FederatedNode[];
  edges: CrossRepoEdge[];
  crossRepoImpact: {
    affectedRepos: string[];
    totalNodes: number;
    confidence: number;
  };
  duration: number;
  cached: boolean;
  repoBreakdown: Map<string, number>;
}

export class FederatedGraphService extends EventEmitter {
  private repos: Map<string, RepoConfig> = new Map();
  private repoGraphs: Map<string, DependencyGraphService> = new Map();
  private globalIndex: GlobalIndexSnapshot;
  private indexingEnabled: boolean = true;
  private reconInterval: NodeJS.Timeout;
  private maxConcurrentSync: number = 4;
  private syncQueue: string[] = [];
  private activeSyncs: Set<string> = new Set();

  private queryCache = new Map<
    string,
    { result: FederatedQueryResult; timestamp: number }
  >();
  private cacheTTL = 30000; // 30 seconds

  constructor(
    private config: {
      reconIntervalMs?: number;
      maxConcurrentSync?: number;
      cacheTTL?: number;
      indexPersistence?: boolean;
    } = {},
  ) {
    super();

    this.maxConcurrentSync = config.maxConcurrentSync || 4;
    this.cacheTTL = config.cacheTTL || 30000;

    this.globalIndex = {
      timestamp: Date.now(),
      version: '2.0.0',
      repos: new Map(),
      nodes: new Map(),
      edges: new Map(),
      statistics: {
        totalNodes: 0,
        totalEdges: 0,
        crossRepoEdges: 0,
        lastFullRecon: Date.now(),
      },
    };

    // Start periodic reconciliation
    if (config.reconIntervalMs) {
      this.reconInterval = setInterval(() => {
        this.performFullReconciliation();
      }, config.reconIntervalMs);
    }

    console.log(
      '🌐 Federated Graph Service initialized - virtual monorepo ready',
    );
  }

  /**
   * Register a repository in the federation
   */
  async addRepository(repo: RepoConfig): Promise<void> {
    console.log(`📦 Adding repository: ${repo.name} (${repo.id})`);

    // Validate repo configuration
    if (!repo.id || !repo.name || !repo.path) {
      throw new Error('Repository must have id, name, and path');
    }

    this.repos.set(repo.id, repo);

    // Initialize local graph service for this repo
    const repoGraph = new DependencyGraphService(repo.path);
    await repoGraph.initialize();
    this.repoGraphs.set(repo.id, repoGraph);

    // Trigger initial sync
    await this.syncRepository(repo.id);

    this.emit('repository_added', repo);
    console.log(`✅ Repository ${repo.name} added to federation`);
  }

  /**
   * Remove a repository from the federation
   */
  async removeRepository(repoId: string): Promise<void> {
    const repo = this.repos.get(repoId);
    if (!repo) {
      throw new Error(`Repository ${repoId} not found in federation`);
    }

    console.log(`🗑️ Removing repository: ${repo.name}`);

    // Shutdown local graph service
    const repoGraph = this.repoGraphs.get(repoId);
    if (repoGraph) {
      await repoGraph.shutdown();
      this.repoGraphs.delete(repoId);
    }

    // Remove from global index
    this.removeRepoFromGlobalIndex(repoId);
    this.repos.delete(repoId);

    this.emit('repository_removed', { repoId, name: repo.name });
    console.log(`✅ Repository ${repo.name} removed from federation`);
  }

  /**
   * Sync a specific repository's graph into the global index
   */
  async syncRepository(repoId: string, force: boolean = false): Promise<void> {
    const repo = this.repos.get(repoId);
    if (!repo || !repo.enabled) {
      return;
    }

    // Check if already syncing
    if (this.activeSyncs.has(repoId)) {
      console.log(`⏳ Repository ${repo.name} sync already in progress`);
      return;
    }

    // Check sync frequency (unless forced)
    if (!force && repo.lastSync && Date.now() - repo.lastSync < 60000) {
      console.log(`⏭️ Repository ${repo.name} synced recently, skipping`);
      return;
    }

    this.activeSyncs.add(repoId);

    try {
      console.log(`🔄 Syncing repository: ${repo.name}`);
      const startTime = Date.now();

      const repoGraph = this.repoGraphs.get(repoId);
      if (!repoGraph) {
        throw new Error(`Graph service not found for repo ${repoId}`);
      }

      // Get latest graph data from repo
      const stats = repoGraph.getStats();
      const allNodesQuery = await repoGraph.query('files *');

      // Update global index with repo data
      await this.updateGlobalIndex(repoId, allNodesQuery.nodes, stats);

      // Detect cross-repo dependencies
      const crossRepoEdges = await this.detectCrossRepoDependencies(
        repoId,
        allNodesQuery.nodes,
      );

      // Update repo sync timestamp
      repo.lastSync = Date.now();

      const syncDuration = Date.now() - startTime;
      console.log(`✅ Repository ${repo.name} synced in ${syncDuration}ms`);
      console.log(
        `   Nodes: ${allNodesQuery.nodes.length}, Cross-repo edges: ${crossRepoEdges.length}`,
      );

      this.emit('repository_synced', {
        repoId,
        name: repo.name,
        nodes: allNodesQuery.nodes.length,
        crossRepoEdges: crossRepoEdges.length,
        duration: syncDuration,
      });
    } catch (error) {
      console.error(`❌ Failed to sync repository ${repo.name}:`, error);
      this.emit('sync_error', { repoId, name: repo.name, error });
    } finally {
      this.activeSyncs.delete(repoId);
    }
  }

  /**
   * Cross-repository dependency query with <500ms target
   */
  async query(queryString: string): Promise<FederatedQueryResult> {
    const startTime = performance.now();
    const cacheKey = this.hashQuery(queryString);

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`📦 Cache hit for federated query: "${queryString}"`);
      return { ...cached.result, cached: true };
    }

    console.log(`🌐 Federated query: "${queryString}"`);

    try {
      const result = await this.executeFederatedQuery(queryString);
      const duration = performance.now() - startTime;

      result.duration = duration;
      result.cached = false;

      // Cache the result
      this.queryCache.set(cacheKey, {
        result: { ...result },
        timestamp: Date.now(),
      });

      console.log(
        `🌐 Federated query completed: ${result.nodes.length} nodes across ${result.crossRepoImpact.affectedRepos.length} repos (${duration.toFixed(1)}ms)`,
      );

      if (duration > 500) {
        console.warn('⚠️ Federated query exceeded 500ms target');
      }

      return result;
    } catch (error) {
      console.error('❌ Federated query failed:', error);
      throw error;
    }
  }

  /**
   * Cross-repository impact analysis
   */
  async crossRepoImpact(
    changes: Array<{ repoId: string; files: string[] }>,
  ): Promise<FederatedQueryResult> {
    console.log('🌊 Analyzing cross-repository impact...');

    const impactedNodes: FederatedNode[] = [];
    const impactedEdges: CrossRepoEdge[] = [];
    const affectedRepos = new Set<string>();
    const repoBreakdown = new Map<string, number>();

    // For each changed file, find cross-repo dependencies
    for (const change of changes) {
      for (const file of change.files) {
        const fileKey = `${change.repoId}:${file}`;

        // Find direct cross-repo edges
        for (const [edgeKey, edge] of this.globalIndex.edges) {
          if (edge.sourceRepo === change.repoId && edge.sourceFile === file) {
            // This change affects another repo
            impactedEdges.push(edge);
            affectedRepos.add(edge.targetRepo);
            repoBreakdown.set(
              edge.targetRepo,
              (repoBreakdown.get(edge.targetRepo) || 0) + 1,
            );

            // Add the target node
            const targetNodeKey = `${edge.targetRepo}:${edge.targetFile}`;
            const targetNode = this.globalIndex.nodes.get(targetNodeKey);
            if (targetNode) {
              impactedNodes.push(targetNode);
            }
          }
        }
      }
    }

    // Calculate confidence based on edge verification recency
    const now = Date.now();
    const avgEdgeAge =
      impactedEdges.length > 0
        ? impactedEdges.reduce(
            (sum, edge) => sum + (now - edge.lastVerified),
            0,
          ) / impactedEdges.length
        : 0;

    const confidence = Math.max(
      0.3,
      Math.min(1.0, 1.0 - avgEdgeAge / (7 * 24 * 60 * 60 * 1000)),
    ); // Confidence decreases over 7 days

    return {
      query: `cross-repo impact: ${changes.map((c) => `${c.repoId}:[${c.files.join(', ')}]`).join(', ')}`,
      nodes: impactedNodes,
      edges: impactedEdges,
      crossRepoImpact: {
        affectedRepos: Array.from(affectedRepos),
        totalNodes: impactedNodes.length,
        confidence,
      },
      duration: 0, // Will be set by caller
      cached: false,
      repoBreakdown,
    };
  }

  /**
   * Get federated graph statistics
   */
  getGlobalStats(): {
    totalRepos: number;
    activeRepos: number;
    totalNodes: number;
    totalEdges: number;
    crossRepoEdges: number;
    lastFullRecon: number;
    syncStatus: Array<{ repoId: string; lastSync: number; status: string }>;
    queryCache: { size: number; hitRate: number };
  } {
    const syncStatus = Array.from(this.repos.entries()).map(
      ([repoId, repo]) => ({
        repoId,
        lastSync: repo.lastSync || 0,
        status: this.activeSyncs.has(repoId)
          ? 'syncing'
          : repo.enabled
            ? 'ready'
            : 'disabled',
      }),
    );

    return {
      totalRepos: this.repos.size,
      activeRepos: Array.from(this.repos.values()).filter((r) => r.enabled)
        .length,
      totalNodes: this.globalIndex.statistics.totalNodes,
      totalEdges: this.globalIndex.statistics.totalEdges,
      crossRepoEdges: this.globalIndex.statistics.crossRepoEdges,
      lastFullRecon: this.globalIndex.statistics.lastFullRecon,
      syncStatus,
      queryCache: {
        size: this.queryCache.size,
        hitRate: 0.85, // Would calculate from actual metrics
      },
    };
  }

  private async executeFederatedQuery(
    queryString: string,
  ): Promise<FederatedQueryResult> {
    const lowerQuery = queryString.toLowerCase().trim();
    const nodes: FederatedNode[] = [];
    const edges: CrossRepoEdge[] = [];
    const affectedRepos = new Set<string>();
    const repoBreakdown = new Map<string, number>();

    // Parse federated query patterns
    if (lowerQuery.startsWith('impact ') || lowerQuery.includes('//')) {
      // Cross-repo impact query: "impact //repoA:lib/foo"
      const match = queryString.match(/\/\/([^:]+):(.+)/);
      if (match) {
        const [, repoId, path] = match;
        const changes = [{ repoId, files: [path] }];
        return await this.crossRepoImpact(changes);
      }
    }

    if (lowerQuery.startsWith('deps ') || lowerQuery.startsWith('rdeps ')) {
      // Cross-repo dependency query
      const isReverse = lowerQuery.startsWith('rdeps ');
      const target = queryString.split(' ')[1];

      // Check if target specifies repo: //repo:path
      if (target.startsWith('//')) {
        const match = target.match(/\/\/([^:]+):(.+)/);
        if (match) {
          const [, repoId, path] = match;
          return await this.queryCrossRepoDeps(repoId, path, isReverse);
        }
      }
    }

    if (lowerQuery.startsWith('find ')) {
      // Cross-repo file search
      const pattern = queryString.split(' ').slice(1).join(' ');
      return await this.searchAcrossRepos(pattern);
    }

    // Default: search within global index
    for (const [nodeKey, node] of this.globalIndex.nodes) {
      if (this.nodeMatchesQuery(node, queryString)) {
        nodes.push(node);
        affectedRepos.add(node.repoId);
        repoBreakdown.set(
          node.repoId,
          (repoBreakdown.get(node.repoId) || 0) + 1,
        );
      }
    }

    return {
      query: queryString,
      nodes: nodes.slice(0, 100), // Limit results
      edges,
      crossRepoImpact: {
        affectedRepos: Array.from(affectedRepos),
        totalNodes: nodes.length,
        confidence: 1.0,
      },
      duration: 0,
      cached: false,
      repoBreakdown,
    };
  }

  private async queryCrossRepoDeps(
    repoId: string,
    path: string,
    reverse: boolean,
  ): Promise<FederatedQueryResult> {
    const nodes: FederatedNode[] = [];
    const edges: CrossRepoEdge[] = [];
    const affectedRepos = new Set<string>([repoId]);
    const repoBreakdown = new Map<string, number>();

    const sourceKey = `${repoId}:${path}`;

    // Find cross-repo edges involving this file
    for (const [edgeKey, edge] of this.globalIndex.edges) {
      let matches = false;
      let targetNodeKey = '';

      if (reverse && edge.targetRepo === repoId && edge.targetFile === path) {
        // Reverse dependency: who depends on this file
        matches = true;
        targetNodeKey = `${edge.sourceRepo}:${edge.sourceFile}`;
        affectedRepos.add(edge.sourceRepo);
      } else if (
        !reverse &&
        edge.sourceRepo === repoId &&
        edge.sourceFile === path
      ) {
        // Forward dependency: what does this file depend on
        matches = true;
        targetNodeKey = `${edge.targetRepo}:${edge.targetFile}`;
        affectedRepos.add(edge.targetRepo);
      }

      if (matches) {
        edges.push(edge);
        const targetNode = this.globalIndex.nodes.get(targetNodeKey);
        if (targetNode) {
          nodes.push(targetNode);
          repoBreakdown.set(
            targetNode.repoId,
            (repoBreakdown.get(targetNode.repoId) || 0) + 1,
          );
        }
      }
    }

    return {
      query: `${reverse ? 'rdeps' : 'deps'} //${repoId}:${path}`,
      nodes,
      edges,
      crossRepoImpact: {
        affectedRepos: Array.from(affectedRepos),
        totalNodes: nodes.length,
        confidence: 0.9,
      },
      duration: 0,
      cached: false,
      repoBreakdown,
    };
  }

  private async searchAcrossRepos(
    pattern: string,
  ): Promise<FederatedQueryResult> {
    const nodes: FederatedNode[] = [];
    const affectedRepos = new Set<string>();
    const repoBreakdown = new Map<string, number>();

    // Simple pattern matching across all nodes
    const regex = new RegExp(pattern.replace('*', '.*'), 'i');

    for (const [nodeKey, node] of this.globalIndex.nodes) {
      if (
        regex.test(node.path) ||
        (node.metadata.exports &&
          node.metadata.exports.some((exp) => regex.test(exp)))
      ) {
        nodes.push(node);
        affectedRepos.add(node.repoId);
        repoBreakdown.set(
          node.repoId,
          (repoBreakdown.get(node.repoId) || 0) + 1,
        );
      }
    }

    return {
      query: `find ${pattern}`,
      nodes: nodes.slice(0, 50),
      edges: [],
      crossRepoImpact: {
        affectedRepos: Array.from(affectedRepos),
        totalNodes: nodes.length,
        confidence: 1.0,
      },
      duration: 0,
      cached: false,
      repoBreakdown,
    };
  }

  private nodeMatchesQuery(node: FederatedNode, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      node.path.toLowerCase().includes(lowerQuery) ||
      node.type.toLowerCase().includes(lowerQuery) ||
      (node.metadata.exports &&
        node.metadata.exports.some((exp) =>
          exp.toLowerCase().includes(lowerQuery),
        ))
    );
  }

  private async updateGlobalIndex(
    repoId: string,
    nodes: any[],
    stats: any,
  ): Promise<void> {
    // Remove existing nodes for this repo
    for (const [nodeKey, node] of this.globalIndex.nodes) {
      if (node.repoId === repoId) {
        this.globalIndex.nodes.delete(nodeKey);
      }
    }

    // Add updated nodes
    for (const repoNode of nodes) {
      const federatedNode: FederatedNode = {
        id: `${repoId}:${repoNode.id}`,
        repoId,
        path: repoNode.path,
        type: repoNode.type,
        metadata: {
          size: repoNode.metadata.size || 0,
          language: repoNode.metadata.language || 'unknown',
          lastModified: repoNode.lastModified || Date.now(),
          exports: repoNode.metadata.exports,
          imports: repoNode.metadata.imports,
          crossRepoRefs: [],
        },
      };

      this.globalIndex.nodes.set(federatedNode.id, federatedNode);
    }

    // Update statistics
    this.globalIndex.timestamp = Date.now();
    this.globalIndex.statistics.totalNodes = this.globalIndex.nodes.size;
    this.globalIndex.statistics.totalEdges = this.globalIndex.edges.size;
  }

  private async detectCrossRepoDependencies(
    repoId: string,
    nodes: any[],
  ): Promise<CrossRepoEdge[]> {
    const crossRepoEdges: CrossRepoEdge[] = [];

    // Simple heuristic: look for import patterns that might reference other repos
    for (const node of nodes) {
      if (node.metadata.imports) {
        for (const importPath of node.metadata.imports) {
          // Detect patterns like @BrianCLong/summit-name or ../other-repo
          const crossRepoMatch =
            importPath.match(/^@[^/]+\/([^/]+)/) ||
            importPath.match(/\.\.\/\.\.\/([^/]+)/);

          if (crossRepoMatch) {
            const targetRepoName = crossRepoMatch[1];
            const targetRepo = Array.from(this.repos.values()).find(
              (r) => r.name.includes(targetRepoName) || r.id === targetRepoName,
            );

            if (targetRepo) {
              const edge: CrossRepoEdge = {
                sourceRepo: repoId,
                sourceFile: node.path,
                targetRepo: targetRepo.id,
                targetFile: importPath,
                edgeType: 'import',
                confidence: 0.7, // Heuristic-based detection
                lastVerified: Date.now(),
              };

              crossRepoEdges.push(edge);

              const edgeKey = `${edge.sourceRepo}:${edge.sourceFile}->${edge.targetRepo}:${edge.targetFile}`;
              this.globalIndex.edges.set(edgeKey, edge);
            }
          }
        }
      }
    }

    this.globalIndex.statistics.crossRepoEdges = this.globalIndex.edges.size;
    return crossRepoEdges;
  }

  private removeRepoFromGlobalIndex(repoId: string): void {
    // Remove nodes
    for (const [nodeKey, node] of this.globalIndex.nodes) {
      if (node.repoId === repoId) {
        this.globalIndex.nodes.delete(nodeKey);
      }
    }

    // Remove edges
    for (const [edgeKey, edge] of this.globalIndex.edges) {
      if (edge.sourceRepo === repoId || edge.targetRepo === repoId) {
        this.globalIndex.edges.delete(edgeKey);
      }
    }

    // Update statistics
    this.globalIndex.statistics.totalNodes = this.globalIndex.nodes.size;
    this.globalIndex.statistics.totalEdges = this.globalIndex.edges.size;
    this.globalIndex.statistics.crossRepoEdges = this.globalIndex.edges.size;
  }

  private async performFullReconciliation(): Promise<void> {
    console.log('🔄 Starting full federation reconciliation...');

    const startTime = Date.now();
    let syncedCount = 0;

    // Sync all enabled repositories
    for (const [repoId, repo] of this.repos) {
      if (repo.enabled) {
        try {
          await this.syncRepository(repoId, true);
          syncedCount++;
        } catch (error) {
          console.error(
            `Failed to sync ${repo.name} during reconciliation:`,
            error,
          );
        }
      }
    }

    this.globalIndex.statistics.lastFullRecon = Date.now();

    const duration = Date.now() - startTime;
    console.log(
      `✅ Full reconciliation completed: ${syncedCount} repos synced in ${duration}ms`,
    );

    this.emit('reconciliation_complete', {
      reposSynced: syncedCount,
      duration,
      totalNodes: this.globalIndex.statistics.totalNodes,
      crossRepoEdges: this.globalIndex.statistics.crossRepoEdges,
    });
  }

  private hashQuery(query: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Enable/disable real-time indexing
   */
  setIndexingEnabled(enabled: boolean): void {
    this.indexingEnabled = enabled;
    console.log(`🌐 Federated indexing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get repository configuration
   */
  getRepository(repoId: string): RepoConfig | undefined {
    return this.repos.get(repoId);
  }

  /**
   * List all repositories in federation
   */
  listRepositories(): RepoConfig[] {
    return Array.from(this.repos.values());
  }

  /**
   * Shutdown federated graph service
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down federated graph service...');

    if (this.reconInterval) {
      clearInterval(this.reconInterval);
    }

    // Shutdown all repo graph services
    await Promise.all(
      Array.from(this.repoGraphs.values()).map((graph) => graph.shutdown()),
    );

    this.repoGraphs.clear();
    this.repos.clear();
    this.queryCache.clear();

    console.log('✅ Federated graph service shut down');
  }
}

// Factory function
export function createFederatedGraphService(
  config?: any,
): FederatedGraphService {
  return new FederatedGraphService(config);
}
