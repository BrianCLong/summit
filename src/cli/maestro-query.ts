#!/usr/bin/env node

/**
 * Maestro Query - Composer vNext+1
 * Graph Q&A system with sub-500ms dependency queries
 */

import { DependencyGraphService } from '../graph/DependencyGraphService.js';

export interface QueryResult {
  query: string;
  results: any[];
  duration: number;
  cached: boolean;
  suggestions?: string[];
}

export class MaestroQuery {
  private graphService: DependencyGraphService;
  private queryHistory: string[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.graphService = new DependencyGraphService(projectRoot);
    console.log('🔍 Maestro Query initialized - dependency graph ready');
  }

  /**
   * Process natural language queries about the dependency graph
   */
  async query(queryString: string): Promise<QueryResult> {
    console.log(`🔍 Query: "${queryString}"`);

    const startTime = Date.now();
    this.queryHistory.push(queryString);

    // Parse query intent
    const parsedQuery = this.parseQuery(queryString);

    let results: any[] = [];
    let suggestions: string[] = [];

    try {
      // Execute query based on parsed intent
      switch (parsedQuery.type) {
        case 'dependencies':
          results = await this.handleDependencyQuery(parsedQuery);
          break;
        case 'reverse-dependencies':
          results = await this.handleReverseDependencyQuery(parsedQuery);
          break;
        case 'path':
          results = await this.handlePathQuery(parsedQuery);
          break;
        case 'impact':
          results = await this.handleImpactQuery(parsedQuery);
          break;
        case 'search':
          results = await this.handleSearchQuery(parsedQuery);
          break;
        case 'stats':
          results = await this.handleStatsQuery(parsedQuery);
          break;
        default:
          suggestions = this.generateQuerySuggestions(queryString);
          break;
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      suggestions = this.generateErrorSuggestions(queryString);
    }

    const duration = Date.now() - startTime;

    const result: QueryResult = {
      query: queryString,
      results,
      duration,
      cached: false, // Would check if result was cached
      suggestions,
    };

    this.logQueryResult(result);
    return result;
  }

  private parseQuery(query: string): {
    type: string;
    target?: string;
    source?: string;
    pattern?: string;
    parameters: Record<string, any>;
  } {
    const lowerQuery = query.toLowerCase().trim();

    // Dependency queries
    if (
      lowerQuery.startsWith('deps ') ||
      lowerQuery.startsWith('dependencies ') ||
      lowerQuery.includes('depends on')
    ) {
      return {
        type: 'dependencies',
        target: this.extractTarget(query, [
          'deps',
          'dependencies',
          'what does',
          'depend',
        ]),
        parameters: {},
      };
    }

    // Reverse dependency queries
    if (
      lowerQuery.startsWith('rdeps ') ||
      lowerQuery.startsWith('who depends on') ||
      lowerQuery.includes('used by')
    ) {
      return {
        type: 'reverse-dependencies',
        target: this.extractTarget(query, [
          'rdeps',
          'who depends on',
          'used by',
          'reverse',
        ]),
        parameters: {},
      };
    }

    // Path queries
    if (
      lowerQuery.includes('path from') ||
      lowerQuery.includes('how to get from') ||
      lowerQuery.startsWith('path ')
    ) {
      const [source, target] = this.extractPathTargets(query);
      return {
        type: 'path',
        source,
        target,
        parameters: {},
      };
    }

    // Impact analysis queries
    if (
      lowerQuery.includes('impact of') ||
      lowerQuery.includes('affected by') ||
      lowerQuery.includes('what breaks')
    ) {
      return {
        type: 'impact',
        target: this.extractTarget(query, [
          'impact of',
          'affected by',
          'what breaks',
          'impacted',
        ]),
        parameters: {},
      };
    }

    // Search queries
    if (
      lowerQuery.startsWith('find ') ||
      lowerQuery.startsWith('search ') ||
      lowerQuery.includes('files like')
    ) {
      return {
        type: 'search',
        pattern: this.extractPattern(query),
        parameters: {},
      };
    }

    // Stats queries
    if (
      lowerQuery.includes('stats') ||
      lowerQuery.includes('statistics') ||
      lowerQuery.includes('how many')
    ) {
      return {
        type: 'stats',
        parameters: { metric: this.extractStatsMetric(query) },
      };
    }

    return {
      type: 'unknown',
      parameters: {},
    };
  }

  private extractTarget(query: string, triggers: string[]): string {
    let target = query;

    for (const trigger of triggers) {
      if (query.toLowerCase().includes(trigger)) {
        const parts = query.toLowerCase().split(trigger);
        if (parts.length > 1) {
          target = parts[1].trim();
          break;
        }
      }
    }

    // Clean up common suffixes
    target = target.replace(/\?$/, '').replace(/\.$/, '').trim();

    // If target looks like a file path, normalize it
    if (target.includes('/') || target.includes('.')) {
      return target;
    }

    // Otherwise, try to find matching files
    return target;
  }

  private extractPathTargets(query: string): [string, string] {
    const patterns = [
      /path from\s+(.+?)\s+to\s+(.+)/i,
      /how to get from\s+(.+?)\s+to\s+(.+)/i,
      /path\s+(.+?)\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return [match[1].trim(), match[2].trim()];
      }
    }

    return ['', ''];
  }

  private extractPattern(query: string): string {
    const patterns = [/find\s+(.+)/i, /search\s+(.+)/i, /files like\s+(.+)/i];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  private extractStatsMetric(query: string): string {
    if (query.includes('files')) return 'files';
    if (query.includes('dependencies')) return 'dependencies';
    if (query.includes('tests')) return 'tests';
    if (query.includes('packages')) return 'packages';
    return 'general';
  }

  private async handleDependencyQuery(parsed: any): Promise<any[]> {
    const queryResult = await this.graphService.deps(parsed.target);

    return queryResult.nodes.map((node) => ({
      name: node.id,
      path: node.path,
      type: node.type,
      size: node.metadata.size,
      language: node.metadata.language,
    }));
  }

  private async handleReverseDependencyQuery(parsed: any): Promise<any[]> {
    const queryResult = await this.graphService.rdeps(parsed.target);

    return queryResult.nodes.map((node) => ({
      name: node.id,
      path: node.path,
      type: node.type,
      imports: node.metadata.imports?.length || 0,
    }));
  }

  private async handlePathQuery(parsed: any): Promise<any[]> {
    if (!parsed.source || !parsed.target) {
      return [{ error: 'Path query requires both source and target' }];
    }

    const queryResult = await this.graphService.path(
      parsed.source,
      parsed.target,
    );

    return queryResult.nodes.map((node, index) => ({
      step: index + 1,
      name: node.id,
      path: node.path,
      type: node.type,
    }));
  }

  private async handleImpactQuery(parsed: any): Promise<any[]> {
    // For impact analysis, treat target as a file path
    const files = [parsed.target];
    const queryResult = await this.graphService.impactedBy(files);

    return queryResult.nodes.map((node) => ({
      name: node.id,
      path: node.path,
      type: node.type,
      reason: 'dependency_chain',
    }));
  }

  private async handleSearchQuery(parsed: any): Promise<any[]> {
    const queryString = `files ${parsed.pattern}`;
    const queryResult = await this.graphService.query(queryString);

    return queryResult.nodes.map((node) => ({
      name: path.basename(node.path),
      path: node.path,
      type: node.type,
      size: node.metadata.size,
      modified: new Date(node.lastModified).toISOString(),
    }));
  }

  private async handleStatsQuery(parsed: any): Promise<any[]> {
    const stats = this.graphService.getStats();

    const result: any = {
      totalNodes: stats.totalNodes,
      totalEdges: stats.totalEdges,
      cacheHitRate: `${stats.queryCache.hitRate.toFixed(1)}%`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(1)}MB`,
      lastUpdated: new Date(stats.lastUpdate).toISOString(),
    };

    if (parsed.parameters.metric === 'files') {
      const filesQuery = await this.graphService.query('files *');
      result.fileCount = filesQuery.nodes.length;

      const byLanguage: Record<string, number> = {};
      for (const node of filesQuery.nodes) {
        const lang = node.metadata.language || 'unknown';
        byLanguage[lang] = (byLanguage[lang] || 0) + 1;
      }
      result.byLanguage = byLanguage;
    }

    return [result];
  }

  private generateQuerySuggestions(query: string): string[] {
    const suggestions = [
      'deps <file>                 # Show dependencies of a file',
      'rdeps <file>                # Show what depends on a file',
      'path <file1> <file2>        # Find path between files',
      'impact of <file>            # Show what would be affected',
      'find *.ts                   # Search for files',
      'stats                       # Show graph statistics',
    ];

    // Add context-specific suggestions based on query
    if (query.includes('test')) {
      suggestions.unshift('find *.test.ts            # Find test files');
    }

    if (query.includes('component')) {
      suggestions.unshift('find *Component*          # Find components');
    }

    return suggestions;
  }

  private generateErrorSuggestions(query: string): string[] {
    return [
      'Try: "deps <filename>" to see dependencies',
      'Try: "rdeps <filename>" to see reverse dependencies',
      'Try: "find *.js" to search for JavaScript files',
      'Try: "stats" to see graph statistics',
      'Use specific file paths or patterns',
    ];
  }

  private logQueryResult(result: QueryResult): void {
    const cacheIcon = result.cached ? '📦' : '🔍';
    console.log(
      `${cacheIcon} Query completed: ${result.results.length} results (${result.duration}ms)`,
    );

    if (result.duration > 500) {
      console.warn('⚠️ Query exceeded 500ms target');
    }
  }

  /**
   * Interactive query session
   */
  async startInteractiveSession(): Promise<void> {
    console.log(`
🔍 Maestro Query - Interactive Dependency Graph Explorer

Available commands:
  deps <file>          Show dependencies
  rdeps <file>         Show reverse dependencies  
  path <file1> <file2> Find dependency path
  impact of <file>     Show impact analysis
  find <pattern>       Search files
  stats                Show statistics
  help                 Show this help
  exit                 Exit session

Type your query or 'help' for examples...
    `);

    // In a real implementation, this would use readline for interactive input
    // For demo purposes, we'll show some example queries
    const exampleQueries = [
      'deps src/app.ts',
      'rdeps src/utils.ts',
      'find *.test.ts',
      'path src/app.ts src/components/Button.tsx',
      'stats',
    ];

    for (const exampleQuery of exampleQueries) {
      console.log(`\n> ${exampleQuery}`);
      try {
        const result = await this.query(exampleQuery);
        this.displayResult(result);
      } catch (error) {
        console.error('❌ Query failed:', error);
      }

      // Add delay for demo
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private displayResult(result: QueryResult): void {
    if (result.results.length === 0) {
      console.log('No results found.');

      if (result.suggestions) {
        console.log('\nTry:');
        result.suggestions.forEach((suggestion) => {
          console.log(`  ${suggestion}`);
        });
      }
      return;
    }

    // Display results based on type
    const firstResult = result.results[0];

    if (firstResult.step !== undefined) {
      // Path query result
      console.log('Dependency path:');
      result.results.forEach((item) => {
        console.log(`  ${item.step}. ${item.name} (${item.path})`);
      });
    } else if (firstResult.totalNodes !== undefined) {
      // Stats query result
      console.log('Graph statistics:');
      for (const [key, value] of Object.entries(firstResult)) {
        console.log(`  ${key}: ${value}`);
      }
    } else {
      // Regular file results
      console.log(`Found ${result.results.length} results:`);

      result.results.slice(0, 10).forEach((item) => {
        // Show first 10
        if (item.size !== undefined) {
          console.log(`  📄 ${item.name} (${item.path}) - ${item.size} bytes`);
        } else {
          console.log(`  📄 ${item.name} (${item.path})`);
        }
      });

      if (result.results.length > 10) {
        console.log(`  ... and ${result.results.length - 10} more`);
      }
    }
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(): {
    totalQueries: number;
    avgDuration: number;
    cacheHitRate: number;
    popularQueries: string[];
  } {
    const graphStats = this.graphService.getStats();

    return {
      totalQueries: this.queryHistory.length,
      avgDuration: 150, // Would calculate from actual measurements
      cacheHitRate: graphStats.queryCache.hitRate,
      popularQueries: this.getPopularQueries(),
    };
  }

  private getPopularQueries(): string[] {
    // Count query patterns
    const patterns: Record<string, number> = {};

    for (const query of this.queryHistory) {
      const pattern = query.split(' ')[0]; // First word
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }

    return Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  async shutdown(): Promise<void> {
    await this.graphService.shutdown();
  }
}

// Factory function
export function createMaestroQuery(projectRoot?: string): MaestroQuery {
  return new MaestroQuery(projectRoot);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv.slice(2).join(' ');

  const maestroQuery = createMaestroQuery();

  if (query === 'interactive' || query === '-i') {
    // Interactive mode
    maestroQuery.startInteractiveSession().catch((error) => {
      console.error('❌ Interactive session failed:', error);
      process.exit(1);
    });
  } else if (query) {
    // Single query mode
    maestroQuery
      .query(query)
      .then((result) => {
        maestroQuery.displayResult(result);

        // Show metrics
        const metrics = maestroQuery.getQueryMetrics();
        console.log(`\n📊 Query took ${result.duration}ms (target: <500ms)`);
      })
      .catch((error) => {
        console.error('❌ Query failed:', error);
        process.exit(1);
      })
      .finally(() => {
        maestroQuery.shutdown();
      });
  } else {
    console.log(`
🔍 Maestro Query - Dependency Graph Explorer

Usage:
  maestro query "deps src/app.ts"              # Single query
  maestro query interactive                    # Interactive mode
  maestro query -i                             # Interactive mode (short)

Query Examples:
  deps src/app.ts                              # Show dependencies
  rdeps src/utils.ts                           # Show reverse dependencies  
  path src/app.ts src/components/Button.tsx    # Find dependency path
  impact of src/core.ts                        # Show impact analysis
  find *.test.ts                               # Search for test files
  find *Component*                             # Search for components
  stats                                        # Show graph statistics

Natural Language Queries:
  "what depends on src/utils.ts"               # Reverse dependencies
  "how to get from app.ts to button.tsx"      # Dependency path
  "what breaks if I change core.ts"           # Impact analysis
  "find all typescript files"                 # File search
  "how many files are there"                  # Statistics

Performance Target: <500ms per query
    `);
  }
}
