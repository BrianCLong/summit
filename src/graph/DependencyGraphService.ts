/**
 * Dependency Graph Indexer - Composer vNext+1
 * Always-on incremental service with file watcher and sub-500ms queries
 */

import { promises as fs } from 'fs';
import { watch, FSWatcher } from 'chokidar';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface GraphNode {
  id: string;
  type: 'file' | 'target' | 'package';
  path: string;
  lastModified: number;
  checksum: string;
  metadata: {
    language?: string;
    size: number;
    exports?: string[];
    imports?: string[];
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'depends' | 'imports' | 'generates' | 'tests';
  weight: number;
  metadata?: Record<string, any>;
}

export interface QueryResult {
  nodes: GraphNode[];
  duration: number;
  cached: boolean;
  confidence: number;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  indexSize: number;
  lastUpdate: number;
  queryCache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  fileWatcher: {
    watchedPaths: number;
    eventsProcessed: number;
    lastEvent: number;
  };
}

export class DependencyGraphService extends EventEmitter {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private reverseEdges = new Map<string, Set<string>>(); // target -> sources
  private forwardEdges = new Map<string, Set<string>>(); // source -> targets
  private queryCache = new Map<
    string,
    { result: QueryResult; timestamp: number }
  >();
  private fileWatcher?: FSWatcher;
  private isIndexing = false;
  private indexingQueue: string[] = [];
  private stats: GraphStats;

  constructor(private projectRoot: string) {
    super();

    this.stats = {
      totalNodes: 0,
      totalEdges: 0,
      indexSize: 0,
      lastUpdate: 0,
      queryCache: { hits: 0, misses: 0, hitRate: 0 },
      fileWatcher: { watchedPaths: 0, eventsProcessed: 0, lastEvent: 0 },
    };

    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    console.log('🕸️ Initializing Dependency Graph Service...');

    // Load existing index if available
    await this.loadPersistedIndex();

    // Start file watcher
    await this.startFileWatcher();

    // Perform initial full scan if index is empty
    if (this.nodes.size === 0) {
      console.log('📊 Performing initial full scan...');
      await this.performFullScan();
    }

    // Start background maintenance
    this.startBackgroundTasks();

    console.log(
      `✅ Graph service initialized: ${this.nodes.size} nodes, ${this.edges.size} edges`,
    );
  }

  /**
   * Query dependency graph with sub-500ms response time
   */
  async query(queryString: string): Promise<QueryResult> {
    const startTime = performance.now();
    const cacheKey = this.hashQuery(queryString);

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      // 30s cache TTL
      this.stats.queryCache.hits++;
      this.updateCacheHitRate();

      return {
        ...cached.result,
        duration: performance.now() - startTime,
        cached: true,
      };
    }

    // Parse and execute query
    const result = await this.executeQuery(queryString);
    const duration = performance.now() - startTime;

    // Cache result
    const queryResult: QueryResult = {
      nodes: result,
      duration,
      cached: false,
      confidence: this.calculateQueryConfidence(queryString, result),
    };

    this.queryCache.set(cacheKey, {
      result: queryResult,
      timestamp: Date.now(),
    });

    this.stats.queryCache.misses++;
    this.updateCacheHitRate();

    console.log(
      `🔍 Query executed: "${queryString}" (${duration.toFixed(1)}ms, ${result.length} results)`,
    );

    return queryResult;
  }

  /**
   * Find all dependencies of a target (what does X depend on?)
   */
  async deps(targetId: string): Promise<QueryResult> {
    return this.query(`deps ${targetId}`);
  }

  /**
   * Find all reverse dependencies (what depends on X?)
   */
  async rdeps(targetId: string): Promise<QueryResult> {
    return this.query(`rdeps ${targetId}`);
  }

  /**
   * Find path between two targets
   */
  async path(from: string, to: string): Promise<QueryResult> {
    return this.query(`path ${from} ${to}`);
  }

  /**
   * Find all targets affected by file changes
   */
  async impactedBy(filePaths: string[]): Promise<QueryResult> {
    const queryString = `impacted ${filePaths.join(' ')}`;
    return this.query(queryString);
  }

  private async executeQuery(queryString: string): Promise<GraphNode[]> {
    const parts = queryString.trim().split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'deps':
        return this.findDependencies(parts[1]);

      case 'rdeps':
        return this.findReverseDependencies(parts[1]);

      case 'path':
        return this.findPath(parts[1], parts[2]);

      case 'impacted':
        return this.findImpactedTargets(parts.slice(1));

      case 'files':
        return this.findFilesByPattern(parts[1]);

      case 'targets':
        return this.findTargetsByPattern(parts[1]);

      default:
        throw new Error(`Unknown query command: ${command}`);
    }
  }

  private findDependencies(nodeId: string): GraphNode[] {
    const dependencies = this.forwardEdges.get(nodeId);
    if (!dependencies) return [];

    const result: GraphNode[] = [];
    for (const depId of dependencies) {
      const node = this.nodes.get(depId);
      if (node) result.push(node);
    }

    return result;
  }

  private findReverseDependencies(nodeId: string): GraphNode[] {
    const rdeps = this.reverseEdges.get(nodeId);
    if (!rdeps) return [];

    const result: GraphNode[] = [];
    for (const rdepId of rdeps) {
      const node = this.nodes.get(rdepId);
      if (node) result.push(node);
    }

    return result;
  }

  private findPath(fromId: string, toId: string): GraphNode[] {
    // BFS to find shortest path
    const queue: Array<{ node: string; path: string[] }> = [
      { node: fromId, path: [fromId] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === toId) {
        return path.map((id) => this.nodes.get(id)!).filter(Boolean);
      }

      if (visited.has(node)) continue;
      visited.add(node);

      const neighbors = this.forwardEdges.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push({ node: neighbor, path: [...path, neighbor] });
          }
        }
      }
    }

    return []; // No path found
  }

  private findImpactedTargets(filePaths: string[]): GraphNode[] {
    const impacted = new Set<string>();

    for (const filePath of filePaths) {
      const normalizedPath = this.normalizePath(filePath);

      // Find direct targets for this file
      const fileNode = Array.from(this.nodes.values()).find(
        (n) => n.path === normalizedPath,
      );

      if (fileNode) {
        // Add all reverse dependencies
        const rdeps = this.findReverseDependencies(fileNode.id);
        rdeps.forEach((n) => impacted.add(n.id));
      }
    }

    return Array.from(impacted)
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  private findFilesByPattern(pattern: string): GraphNode[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    return Array.from(this.nodes.values()).filter(
      (n) => n.type === 'file' && regex.test(n.path),
    );
  }

  private findTargetsByPattern(pattern: string): GraphNode[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    return Array.from(this.nodes.values()).filter(
      (n) => n.type === 'target' && regex.test(n.id),
    );
  }

  private async startFileWatcher(): Promise<void> {
    console.log('👀 Starting file watcher...');

    const watchPatterns = [
      '**/*.ts',
      '**/*.js',
      '**/*.tsx',
      '**/*.jsx',
      '**/package.json',
      '**/tsconfig.json',
      '**/Makefile',
      '**/BUILD',
      '**/BUILD.bazel',
    ];

    this.fileWatcher = watch(watchPatterns, {
      cwd: this.projectRoot,
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**',
      ],
      persistent: true,
      ignoreInitial: true,
    });

    this.fileWatcher.on('change', (filePath) => {
      this.handleFileChange(filePath);
    });

    this.fileWatcher.on('add', (filePath) => {
      this.handleFileChange(filePath);
    });

    this.fileWatcher.on('unlink', (filePath) => {
      this.handleFileDelete(filePath);
    });

    const watchedPaths = await this.fileWatcher.getWatched();
    this.stats.fileWatcher.watchedPaths = Object.keys(watchedPaths).length;

    console.log(`👀 Watching ${this.stats.fileWatcher.watchedPaths} paths`);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);
    console.log(`📝 File changed: ${normalizedPath}`);

    this.stats.fileWatcher.eventsProcessed++;
    this.stats.fileWatcher.lastEvent = Date.now();

    // Add to indexing queue
    if (!this.indexingQueue.includes(normalizedPath)) {
      this.indexingQueue.push(normalizedPath);
    }

    // Invalidate related query cache entries
    this.invalidateRelatedCacheEntries(normalizedPath);

    // Process queue if not already processing
    if (!this.isIndexing) {
      this.processIndexingQueue();
    }

    this.emit('fileChanged', { path: normalizedPath });
  }

  private async handleFileDelete(filePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);
    console.log(`🗑️ File deleted: ${normalizedPath}`);

    // Remove from graph
    const nodeToRemove = Array.from(this.nodes.values()).find(
      (n) => n.path === normalizedPath,
    );

    if (nodeToRemove) {
      this.removeNode(nodeToRemove.id);
      this.invalidateRelatedCacheEntries(normalizedPath);
      this.emit('fileDeleted', {
        path: normalizedPath,
        nodeId: nodeToRemove.id,
      });
    }
  }

  private async processIndexingQueue(): Promise<void> {
    if (this.isIndexing || this.indexingQueue.length === 0) return;

    this.isIndexing = true;

    while (this.indexingQueue.length > 0) {
      const filePath = this.indexingQueue.shift()!;

      try {
        await this.indexFile(filePath);
      } catch (error) {
        console.warn(`⚠️ Failed to index ${filePath}:`, error);
      }
    }

    this.isIndexing = false;
    this.updateStats();
  }

  private async indexFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.projectRoot, filePath);

    try {
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');
      const checksum = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');

      // Create or update node
      const nodeId = this.pathToNodeId(filePath);
      const existingNode = this.nodes.get(nodeId);

      // Skip if unchanged
      if (existingNode && existingNode.checksum === checksum) {
        return;
      }

      const node: GraphNode = {
        id: nodeId,
        type: 'file',
        path: filePath,
        lastModified: stats.mtimeMs,
        checksum,
        metadata: {
          language: this.detectLanguage(filePath),
          size: stats.size,
          imports: this.extractImports(content),
          exports: this.extractExports(content),
        },
      };

      // Update node
      this.nodes.set(nodeId, node);

      // Update edges
      await this.updateEdgesForFile(node);

      console.log(
        `📊 Indexed: ${filePath} (${node.metadata.imports?.length || 0} imports)`,
      );
    } catch (error) {
      console.warn(`⚠️ Failed to read ${filePath}:`, error);
    }
  }

  private async updateEdgesForFile(node: GraphNode): Promise<void> {
    const nodeId = node.id;

    // Remove existing edges for this node
    this.removeEdgesForNode(nodeId);

    // Create new edges based on imports
    if (node.metadata.imports) {
      for (const importPath of node.metadata.imports) {
        const targetNodeId = this.resolveImportPath(importPath, node.path);
        if (targetNodeId) {
          this.addEdge(nodeId, targetNodeId, 'imports', 1.0);
        }
      }
    }
  }

  private addEdge(
    source: string,
    target: string,
    type: GraphEdge['type'],
    weight: number,
  ): void {
    const edgeId = `${source}->${target}`;

    const edge: GraphEdge = {
      source,
      target,
      type,
      weight,
    };

    this.edges.set(edgeId, edge);

    // Update forward edges
    if (!this.forwardEdges.has(source)) {
      this.forwardEdges.set(source, new Set());
    }
    this.forwardEdges.get(source)!.add(target);

    // Update reverse edges
    if (!this.reverseEdges.has(target)) {
      this.reverseEdges.set(target, new Set());
    }
    this.reverseEdges.get(target)!.add(source);
  }

  private removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.removeEdgesForNode(nodeId);
  }

  private removeEdgesForNode(nodeId: string): void {
    // Remove forward edges
    const forwardTargets = this.forwardEdges.get(nodeId);
    if (forwardTargets) {
      for (const target of forwardTargets) {
        this.edges.delete(`${nodeId}->${target}`);
        const reverseSet = this.reverseEdges.get(target);
        if (reverseSet) {
          reverseSet.delete(nodeId);
        }
      }
      this.forwardEdges.delete(nodeId);
    }

    // Remove reverse edges
    const reverseSources = this.reverseEdges.get(nodeId);
    if (reverseSources) {
      for (const source of reverseSources) {
        this.edges.delete(`${source}->${nodeId}`);
        const forwardSet = this.forwardEdges.get(source);
        if (forwardSet) {
          forwardSet.delete(nodeId);
        }
      }
      this.reverseEdges.delete(nodeId);
    }
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // TypeScript/JavaScript imports
    const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Export statements
    const exportRegex =
      /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
    };

    return languageMap[ext] || 'unknown';
  }

  private resolveImportPath(
    importPath: string,
    fromFile: string,
  ): string | null {
    // Simplified import resolution
    if (importPath.startsWith('.')) {
      // Relative import
      const resolved = path.resolve(path.dirname(fromFile), importPath);
      return this.pathToNodeId(resolved);
    } else {
      // Node modules import - would need more sophisticated resolution
      return `npm:${importPath}`;
    }
  }

  private pathToNodeId(filePath: string): string {
    return `file:${this.normalizePath(filePath)}`;
  }

  private normalizePath(filePath: string): string {
    return path.posix.normalize(filePath.replace(/\\/g, '/'));
  }

  private async performFullScan(): Promise<void> {
    const startTime = performance.now();
    console.log('🔄 Performing full dependency scan...');

    // Find all source files
    const glob = await import('glob');
    const files = await glob.glob('**/*.{ts,tsx,js,jsx,py,java,go,rs}', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });

    console.log(`📁 Found ${files.length} files to index`);

    // Index files in batches
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map((file) => this.indexFile(file)));

      console.log(
        `📊 Indexed ${Math.min(i + batchSize, files.length)}/${files.length} files`,
      );
    }

    const duration = performance.now() - startTime;
    console.log(`✅ Full scan completed in ${Math.round(duration)}ms`);

    this.updateStats();
  }

  private updateStats(): void {
    this.stats.totalNodes = this.nodes.size;
    this.stats.totalEdges = this.edges.size;
    this.stats.indexSize = this.calculateIndexSize();
    this.stats.lastUpdate = Date.now();
  }

  private calculateIndexSize(): number {
    // Rough estimate of memory usage
    const nodeSize = JSON.stringify([...this.nodes.values()]).length;
    const edgeSize = JSON.stringify([...this.edges.values()]).length;
    return nodeSize + edgeSize;
  }

  private updateCacheHitRate(): void {
    const total = this.stats.queryCache.hits + this.stats.queryCache.misses;
    this.stats.queryCache.hitRate =
      total > 0 ? (this.stats.queryCache.hits / total) * 100 : 0;
  }

  private calculateQueryConfidence(
    query: string,
    results: GraphNode[],
  ): number {
    // Simple confidence scoring based on result count and freshness
    const baseConfidence = Math.min(results.length / 10, 1.0); // More results = higher confidence
    const freshnessBonus = this.stats.lastUpdate > Date.now() - 60000 ? 0.2 : 0; // Recent index = bonus

    return Math.min(baseConfidence + freshnessBonus, 1.0);
  }

  private hashQuery(query: string): string {
    return crypto.createHash('md5').update(query).digest('hex');
  }

  private invalidateRelatedCacheEntries(filePath: string): void {
    // Clear cache entries that might be affected by this file change
    let invalidated = 0;

    for (const [key, entry] of this.queryCache.entries()) {
      const hasRelatedNode = entry.result.nodes.some(
        (n) => n.path === filePath,
      );
      if (hasRelatedNode) {
        this.queryCache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      console.log(
        `🗑️ Invalidated ${invalidated} cache entries for ${filePath}`,
      );
    }
  }

  private startBackgroundTasks(): void {
    // Periodic cache cleanup
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.queryCache.entries()) {
        if (now - entry.timestamp > 300000) {
          // 5 minute TTL
          this.queryCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} stale cache entries`);
      }
    }, 60000); // Every minute

    // Periodic stats update
    setInterval(() => {
      this.updateStats();
    }, 30000); // Every 30 seconds
  }

  private async loadPersistedIndex(): Promise<void> {
    const indexFile = path.join(this.projectRoot, '.maestro-graph-index.json');

    try {
      const content = await fs.readFile(indexFile, 'utf8');
      const data = JSON.parse(content);

      // Load nodes
      for (const [id, node] of Object.entries(
        data.nodes as Record<string, GraphNode>,
      )) {
        this.nodes.set(id, node);
      }

      // Load edges
      for (const [id, edge] of Object.entries(
        data.edges as Record<string, GraphEdge>,
      )) {
        this.edges.set(id, edge);
        this.addEdge(edge.source, edge.target, edge.type, edge.weight);
      }

      console.log(
        `📚 Loaded persisted index: ${this.nodes.size} nodes, ${this.edges.size} edges`,
      );
    } catch (error) {
      console.log('📄 No existing index found, will create new one');
    }
  }

  async persistIndex(): Promise<void> {
    const indexFile = path.join(this.projectRoot, '.maestro-graph-index.json');

    const data = {
      nodes: Object.fromEntries(this.nodes),
      edges: Object.fromEntries(this.edges),
      timestamp: Date.now(),
    };

    await fs.writeFile(indexFile, JSON.stringify(data, null, 2));
    console.log('💾 Index persisted to disk');
  }

  getStats(): GraphStats {
    return { ...this.stats };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down dependency graph service...');

    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }

    await this.persistIndex();

    this.queryCache.clear();
    this.nodes.clear();
    this.edges.clear();
    this.forwardEdges.clear();
    this.reverseEdges.clear();

    console.log('✅ Dependency graph service shutdown complete');
  }
}

// Factory function
export function createDependencyGraphService(
  projectRoot: string,
): DependencyGraphService {
  return new DependencyGraphService(projectRoot);
}

// CLI interface for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = createDependencyGraphService(process.cwd());

  // Wait for initialization then run test queries
  setTimeout(async () => {
    console.log('\n🔍 Testing queries...');

    try {
      const filesResult = await service.query('files *.ts');
      console.log(`Found ${filesResult.nodes.length} TypeScript files`);

      if (filesResult.nodes.length > 0) {
        const firstFile = filesResult.nodes[0].id;
        const depsResult = await service.deps(firstFile);
        console.log(`${firstFile} has ${depsResult.nodes.length} dependencies`);

        const rdepsResult = await service.rdeps(firstFile);
        console.log(
          `${firstFile} is used by ${rdepsResult.nodes.length} files`,
        );
      }

      const stats = service.getStats();
      console.log('\n📊 Service Stats:');
      console.log(`   Nodes: ${stats.totalNodes}`);
      console.log(`   Edges: ${stats.totalEdges}`);
      console.log(`   Cache hit rate: ${stats.queryCache.hitRate.toFixed(1)}%`);
      console.log(`   Watched paths: ${stats.fileWatcher.watchedPaths}`);
    } catch (error) {
      console.error('❌ Query failed:', error);
    }
  }, 3000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    service.shutdown().then(() => process.exit(0));
  });
}
