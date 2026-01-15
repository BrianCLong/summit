import { QueryAnalysis, OptimizationContext, OptimizationRule } from './types.js';

export class QueryAnalyzer {
  public analyze(query: string, context: OptimizationContext): QueryAnalysis {
    if (context.queryType === 'cypher') {
      return this.analyzeCypherQuery(query);
    } else {
      // Basic fallback
      return this.analyzeCypherQuery(query);
    }
  }

  private analyzeCypherQuery(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();

    // Regex-based analysis (could be replaced by AST parser later)
    const nodeCount = (query.match(/\([^)]*\)/g) || []).length;
    const relationshipCount = (query.match(/-\[[^\]]*\]-/g) || []).length;
    const filterCount = (query.match(/\bwhere\b/gi) || []).length;
    const aggregationCount = (
      query.match(/\b(count|sum|avg|max|min|collect)\s*\(/gi) || []
    ).length;
    const joinCount = (query.match(/\bwith\b/gi) || []).length;

    const hasWildcard =
      lowerQuery.includes('*') || lowerQuery.includes('collect(');
    const isRead =
      lowerQuery.includes('match') || lowerQuery.includes('return');
    const isWrite =
      lowerQuery.includes('create') ||
      lowerQuery.includes('merge') ||
      lowerQuery.includes('delete') ||
      lowerQuery.includes('set') ||
      lowerQuery.includes('remove');

    // Extract affected labels
    const labelMatches = query.match(/:(\w+)/g) || [];
    const affectedLabels = [...new Set(labelMatches.map((match) => match.substring(1)))];

    // Determine required indexes
    const requiredIndexes = this.analyzeRequiredIndexes(query, affectedLabels);

    const complexity = this.calculateComplexity({
      nodeCount,
      relationshipCount,
      filterCount,
      aggregationCount,
      joinCount,
      hasWildcard,
    });

    return {
      complexity,
      nodeCount,
      relationshipCount,
      filterCount,
      aggregationCount,
      joinCount,
      hasWildcard,
      isRead,
      isWrite,
      affectedLabels,
      requiredIndexes,
    };
  }

  private calculateComplexity(factors: {
    nodeCount: number;
    relationshipCount: number;
    filterCount: number;
    aggregationCount: number;
    joinCount: number;
    hasWildcard: boolean;
  }): number {
    let score = 0;
    score += factors.nodeCount * 2;
    score += factors.relationshipCount * 3;
    score += factors.filterCount * 1;
    score += factors.aggregationCount * 4;
    score += factors.joinCount * 5;
    score += factors.hasWildcard ? 10 : 0;
    return score;
  }

  private analyzeRequiredIndexes(query: string, labels: string[]): string[] {
    const indexes: string[] = [];
    const lowerQuery = query.toLowerCase();

    const patterns = [
      { pattern: /where\s+(\w+)\.(\w+)\s*=/gi, type: 'equality' },
      { pattern: /where\s+(\w+)\.(\w+)\s*in/gi, type: 'in' },
      { pattern: /where\s+(\w+)\.(\w+)\s*(?:<=|>=|<|>)/gi, type: 'range' },
      { pattern: /order\s+by\s+(\w+)\.(\w+)/gi, type: 'sort' },
    ];

    for (const { pattern } of patterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[2]) {
          const varName = match[1];
          const labelMatch = new RegExp(`\\(${varName}:(\\w+)`).exec(query);
          if (labelMatch) {
             indexes.push(`${labelMatch[1]}.${match[2]}`);
          }
        }
      }
    }

    return [...new Set(indexes)];
  }
}
