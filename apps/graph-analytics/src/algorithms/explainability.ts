import {
  PathResult,
  CommunityAnalysisResult,
  CentralityAnalysisResult,
  PatternAnalysisResult,
  CentralityResult,
  CommunitySummary,
  PatternInstance,
  Path,
} from '../types/analytics';

/**
 * Explainability Module
 *
 * Generates human-readable explanations for graph analytics results
 */

/**
 * Generate explanation for path analysis results
 */
export function explainPathAnalysis(
  source: string,
  target: string,
  paths: Path[],
  stats: {
    totalPaths: number;
    averageLength: number;
    minLength: number;
    maxLength: number;
    policyFilteredNodes: number;
    policyFilteredEdges: number;
  },
): string {
  if (paths.length === 0) {
    return `No paths found between ${source} and ${target}. ${
      stats.policyFilteredNodes > 0 || stats.policyFilteredEdges > 0
        ? `Policy filters excluded ${stats.policyFilteredNodes} nodes and ${stats.policyFilteredEdges} edges, which may have blocked potential paths.`
        : 'The nodes may not be connected in the graph.'
    }`;
  }

  const parts: string[] = [];

  parts.push(
    `Found ${paths.length} path${paths.length > 1 ? 's' : ''} from ${source} to ${target}.`,
  );

  parts.push(
    `Shortest path length is ${stats.minLength} hop${stats.minLength !== 1 ? 's' : ''}.`,
  );

  if (paths.length > 1) {
    parts.push(
      `Longest returned path is ${stats.maxLength} hop${stats.maxLength !== 1 ? 's' : ''}.`,
    );
    parts.push(
      `Average path length is ${stats.averageLength.toFixed(1)} hops.`,
    );
  }

  if (stats.policyFilteredNodes > 0 || stats.policyFilteredEdges > 0) {
    parts.push(
      `Policy filters excluded ${stats.policyFilteredNodes} node${stats.policyFilteredNodes !== 1 ? 's' : ''} and ${stats.policyFilteredEdges} edge${stats.policyFilteredEdges !== 1 ? 's' : ''} from consideration.`,
    );
  }

  // Describe relationship diversity
  if (paths.length > 0 && paths[0].relationships.length > 0) {
    const relationshipTypes = new Set<string>();
    for (const path of paths) {
      path.relationships.forEach((rel) => relationshipTypes.add(rel));
    }

    if (relationshipTypes.size > 1) {
      parts.push(
        `Paths traverse ${relationshipTypes.size} different relationship types: ${Array.from(relationshipTypes).slice(0, 5).join(', ')}${relationshipTypes.size > 5 ? ', ...' : ''}.`,
      );
    }
  }

  return parts.join(' ');
}

/**
 * Generate explanation for community detection results
 */
export function explainCommunityAnalysis(
  communities: CommunitySummary,
  algorithm: string,
): string {
  const parts: string[] = [];

  parts.push(
    `Detected ${communities.numCommunities} communit${communities.numCommunities !== 1 ? 'ies' : 'y'} using ${algorithm} algorithm.`,
  );

  // Get community sizes
  const sizes = Object.values(communities.sizes).sort((a, b) => b - a);

  if (sizes.length > 0) {
    parts.push(
      `Largest community contains ${sizes[0]} node${sizes[0] !== 1 ? 's' : ''}.`,
    );
    parts.push(
      `Smallest community contains ${sizes[sizes.length - 1]} node${sizes[sizes.length - 1] !== 1 ? 's' : ''}.`,
    );

    const avgSize =
      sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    parts.push(
      `Average community size is ${avgSize.toFixed(1)} nodes.`,
    );
  }

  // Discuss modularity if available
  if (communities.modularityScore !== undefined) {
    const modularityPercent = (communities.modularityScore * 100).toFixed(1);
    parts.push(
      `Modularity score of ${modularityPercent}% indicates ${
        communities.modularityScore > 0.3
          ? 'strong'
          : communities.modularityScore > 0.1
            ? 'moderate'
            : 'weak'
      } community structure.`,
    );
  }

  // Discuss densities
  const densities = Object.values(communities.densities);
  if (densities.length > 0) {
    const avgDensity =
      densities.reduce((sum, d) => sum + d, 0) / densities.length;
    parts.push(
      `Communities have an average internal density of ${(avgDensity * 100).toFixed(1)}%, suggesting ${
        avgDensity > 0.3
          ? 'tightly-knit'
          : avgDensity > 0.1
            ? 'moderately connected'
            : 'loosely connected'
      } groups.`,
    );
  }

  return parts.join(' ');
}

/**
 * Generate explanation for centrality analysis results
 */
export function explainCentralityAnalysis(
  centrality: CentralityResult,
  algorithm: string,
): string {
  const parts: string[] = [];

  parts.push(
    `Computed centrality metrics using ${algorithm} for network analysis.`,
  );

  // Degree centrality
  const degreeValues = Object.values(centrality.scores.degree);
  if (degreeValues.length > 0) {
    parts.push(
      `Average degree is ${centrality.stats.avgDegree.toFixed(1)}, with maximum degree of ${centrality.stats.maxDegree}.`,
    );

    const topDegreeNodes = centrality.summaries.topByDegree.slice(0, 3);
    if (topDegreeNodes.length > 0) {
      parts.push(
        `Top nodes by degree centrality are ${topDegreeNodes.join(', ')}, indicating they are the most connected hubs.`,
      );
    }
  }

  // Betweenness centrality
  const betweennessValues = Object.values(centrality.scores.betweenness);
  if (betweennessValues.length > 0) {
    const topBetweennessNodes = centrality.summaries.topByBetweenness.slice(
      0,
      3,
    );

    if (topBetweennessNodes.length > 0) {
      // Calculate what % of paths go through top nodes (rough estimate)
      const topBetweenness = topBetweennessNodes
        .map((nodeId) => centrality.scores.betweenness[nodeId] || 0)
        .reduce((sum, val) => sum + val, 0);

      const totalBetweenness = betweennessValues.reduce(
        (sum, val) => sum + val,
        0,
      );
      const topPercent =
        totalBetweenness > 0 ? (topBetweenness / totalBetweenness) * 100 : 0;

      parts.push(
        `Top ${topBetweennessNodes.length} nodes by betweenness centrality (${topBetweennessNodes.join(', ')}) account for ${topPercent.toFixed(0)}% of shortest paths, highlighting key broker positions.`,
      );
    }
  }

  // Eigenvector centrality
  if (centrality.scores.eigenvector) {
    const topEigenvectorNodes =
      centrality.summaries.topByEigenvector?.slice(0, 3) || [];
    if (topEigenvectorNodes.length > 0) {
      parts.push(
        `Eigenvector centrality identifies ${topEigenvectorNodes.join(', ')} as highly influential, being connected to other well-connected nodes.`,
      );
    }
  }

  return parts.join(' ');
}

/**
 * Generate explanation for pattern analysis results
 */
export function explainPatternAnalysis(
  patterns: PatternInstance[],
): string {
  if (patterns.length === 0) {
    return 'No significant patterns detected in the graph.';
  }

  const parts: string[] = [];

  parts.push(
    `Detected ${patterns.length} structural pattern${patterns.length !== 1 ? 's' : ''} in the graph.`,
  );

  // Count by pattern type
  const byType = patterns.reduce(
    (acc, pattern) => {
      acc[pattern.patternType] = (acc[pattern.patternType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const typeDescriptions = Object.entries(byType).map(
    ([type, count]) => `${count} ${type.toLowerCase().replace(/_/g, ' ')}${count > 1 ? 's' : ''}`,
  );

  parts.push(`Pattern breakdown: ${typeDescriptions.join(', ')}.`);

  // Highlight most significant patterns
  const topPatterns = patterns
    .sort((a, b) => {
      const aSize = a.nodes.length;
      const bSize = b.nodes.length;
      return bSize - aSize;
    })
    .slice(0, 3);

  if (topPatterns.length > 0) {
    parts.push('Notable findings:');
    for (const pattern of topPatterns) {
      parts.push(`• ${pattern.summary}`);
    }
  }

  // Insights based on pattern types
  const insights: string[] = [];

  if (byType.STAR) {
    insights.push(
      `Star patterns suggest centralized control or hub-and-spoke communication structures.`,
    );
  }

  if (byType.BIPARTITE_FAN) {
    insights.push(
      `Bipartite fan patterns may indicate structuring activities, layered money flows, or intermediary operations.`,
    );
  }

  if (byType.REPEATED_INTERACTION) {
    insights.push(
      `Repeated interaction patterns reveal persistent relationships or coordinated behavior over time.`,
    );
  }

  if (insights.length > 0) {
    parts.push(insights.join(' '));
  }

  return parts.join(' ');
}

/**
 * Describe centrality result in plain language
 */
export function describeCentrality(
  result: CentralityResult,
  maxItems: number = 5,
): string {
  const parts: string[] = [];

  const topDegree = result.summaries.topByDegree.slice(0, maxItems);
  const topBetweenness = result.summaries.topByBetweenness.slice(0, maxItems);

  parts.push(
    `Top ${maxItems} nodes by degree centrality are [${topDegree.join(', ')}].`,
  );
  parts.push(
    `Top ${maxItems} nodes by betweenness centrality are [${topBetweenness.join(', ')}], indicating they act as key brokers in this subgraph.`,
  );

  if (result.summaries.topByEigenvector) {
    const topEigenvector = result.summaries.topByEigenvector.slice(0, maxItems);
    parts.push(
      `Top ${maxItems} by eigenvector centrality are [${topEigenvector.join(', ')}], showing high influence through connections.`,
    );
  }

  return parts.join(' ');
}

/**
 * Generate a comprehensive summary for multiple analytics results
 */
export function generateComprehensiveSummary(data: {
  paths?: PathResult;
  communities?: CommunityAnalysisResult;
  centrality?: CentralityAnalysisResult;
  patterns?: PatternAnalysisResult;
}): string {
  const sections: string[] = [];

  sections.push('# Graph Analytics Summary\n');

  if (data.paths) {
    sections.push('## Path Analysis');
    sections.push(data.paths.explanation);
    sections.push('');
  }

  if (data.communities) {
    sections.push('## Community Structure');
    sections.push(data.communities.explanation);
    sections.push('');
  }

  if (data.centrality) {
    sections.push('## Centrality Metrics');
    sections.push(data.centrality.explanation);
    sections.push('');
  }

  if (data.patterns) {
    sections.push('## Pattern Detection');
    sections.push(data.patterns.explanation);
    sections.push('');
  }

  return sections.join('\n');
}
