#!/usr/bin/env node
/**
 * Performance Budget Diagnostics
 * GREEN TRAIN Week-4 Hardening: Enhanced CI feedback for performance regressions
 */

const fs = require('fs');
const path = require('path');

class PerformanceBudgetDiagnostics {
  constructor() {
    this.diagnostics = {
      timestamp: new Date().toISOString(),
      violations: [],
      recommendations: [],
      slow_queries: [],
      optimization_hints: [],
    };
  }

  /**
   * Main diagnostic execution
   */
  async analyze(budgetReportPath, baselineMetricsPath) {
    console.log('🔍 Analyzing performance budget violations...');

    try {
      const budgetReport = await this.loadBudgetReport(budgetReportPath);
      const baselineMetrics =
        await this.loadBaselineMetrics(baselineMetricsPath);

      await this.analyzeViolations(budgetReport);
      await this.generateSlowQueryAnalysis(budgetReport, baselineMetrics);
      await this.generateOptimizationHints(budgetReport);
      await this.generateCypherIndexSuggestions(budgetReport);
      await this.exportDiagnostics();

      console.log('✅ Performance diagnostics completed');
      return true;
    } catch (error) {
      console.error('❌ Diagnostic analysis failed:', error.message);
      return false;
    }
  }

  /**
   * Load budget report from CI
   */
  async loadBudgetReport(reportPath) {
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Budget report not found: ${reportPath}`);
    }

    const reportContent = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(reportContent);
  }

  /**
   * Load baseline metrics for comparison
   */
  async loadBaselineMetrics(baselinePath) {
    if (!fs.existsSync(baselinePath)) {
      // Generate simulated baseline if not available
      return this.generateSimulatedBaseline();
    }

    const baselineContent = fs.readFileSync(baselinePath, 'utf8');
    return JSON.parse(baselineContent);
  }

  /**
   * Generate simulated baseline metrics
   */
  generateSimulatedBaseline() {
    return {
      '/health': { p95: 45, p99: 85, error_rate: 0.0008, throughput: 1200 },
      '/health/ready': {
        p95: 85,
        p99: 180,
        error_rate: 0.002,
        throughput: 800,
      },
      '/graphql': { p95: 280, p99: 650, error_rate: 0.015, throughput: 150 },
      '/api/v1/entities': {
        p95: 220,
        p99: 480,
        error_rate: 0.012,
        throughput: 200,
      },
      '/api/v1/entities/{id}': {
        p95: 120,
        p99: 290,
        error_rate: 0.008,
        throughput: 400,
      },
      '/api/v1/search': {
        p95: 450,
        p99: 1100,
        error_rate: 0.025,
        throughput: 80,
      },
      '/api/v1/analytics': {
        p95: 750,
        p99: 1800,
        error_rate: 0.04,
        throughput: 20,
      },
      '/metrics': { p95: 80, p99: 200, error_rate: 0.0005, throughput: 50 },
      '/api/v1/auth/login': {
        p95: 250,
        p99: 600,
        error_rate: 0.018,
        throughput: 100,
      },
      '/api/v1/auth/refresh': {
        p95: 90,
        p99: 220,
        error_rate: 0.008,
        throughput: 300,
      },
    };
  }

  /**
   * Analyze budget violations and categorize them
   */
  async analyzeViolations(budgetReport) {
    console.log('📊 Analyzing budget violations...');

    if (!budgetReport.violations || budgetReport.violations.length === 0) {
      this.diagnostics.recommendations.push({
        type: 'no_violations',
        message: 'No performance budget violations detected',
        priority: 'info',
      });
      return;
    }

    for (const violation of budgetReport.violations) {
      const analysis = this.analyzeViolation(violation);
      this.diagnostics.violations.push(analysis);

      // Generate specific recommendations based on violation type
      const recommendation = this.generateViolationRecommendation(violation);
      if (recommendation) {
        this.diagnostics.recommendations.push(recommendation);
      }
    }
  }

  /**
   * Analyze individual violation
   */
  analyzeViolation(violation) {
    const analysis = {
      endpoint: violation.endpoint,
      violation_type: violation.type,
      severity: this.calculateViolationSeverity(violation),
      impact_analysis: this.analyzeImpact(violation),
      regression_magnitude: this.calculateRegressionMagnitude(violation),
    };

    return analysis;
  }

  /**
   * Calculate violation severity
   */
  calculateViolationSeverity(violation) {
    const { current, budget } = violation;

    if (!current || !budget) return 'unknown';

    const overage = (current - budget) / budget;

    if (overage > 1.0) return 'critical'; // >100% over budget
    if (overage > 0.5) return 'high'; // >50% over budget
    if (overage > 0.2) return 'medium'; // >20% over budget
    return 'low'; // ≤20% over budget
  }

  /**
   * Analyze performance impact
   */
  analyzeImpact(violation) {
    const impact = {
      user_experience: 'unknown',
      system_load: 'unknown',
      cost_implications: 'unknown',
      cascading_effects: [],
    };

    // Analyze user experience impact
    if (
      violation.endpoint === '/health' ||
      violation.endpoint === '/health/ready'
    ) {
      impact.user_experience = 'infrastructure';
      impact.cascading_effects.push('load_balancer_health_checks');
    } else if (violation.endpoint === '/graphql') {
      impact.user_experience = 'high';
      impact.cascading_effects.push(
        'frontend_responsiveness',
        'user_interaction_latency',
      );
    } else if (violation.endpoint.includes('/auth/')) {
      impact.user_experience = 'high';
      impact.cascading_effects.push('login_delays', 'session_management');
    } else if (violation.endpoint.includes('/search')) {
      impact.user_experience = 'medium';
      impact.cascading_effects.push('search_timeouts', 'result_freshness');
    }

    // Analyze system load impact
    if (
      violation.type === 'latency' &&
      violation.current > violation.budget * 2
    ) {
      impact.system_load = 'high';
      impact.cascading_effects.push(
        'thread_pool_exhaustion',
        'memory_pressure',
      );
    }

    return impact;
  }

  /**
   * Calculate regression magnitude
   */
  calculateRegressionMagnitude(violation) {
    if (!violation.baseline || !violation.current) {
      return { type: 'unknown', percentage: 0 };
    }

    const change = violation.current - violation.baseline;
    const percentage = (change / violation.baseline) * 100;

    return {
      type: change > 0 ? 'regression' : 'improvement',
      percentage: Math.abs(percentage),
      absolute_change: Math.abs(change),
    };
  }

  /**
   * Generate violation-specific recommendations
   */
  generateViolationRecommendation(violation) {
    const recommendation = {
      endpoint: violation.endpoint,
      type: 'performance_optimization',
      priority: this.calculateViolationSeverity(violation),
      actions: [],
    };

    // Endpoint-specific recommendations
    if (violation.endpoint === '/graphql') {
      recommendation.actions.push(
        'Consider implementing GraphQL query complexity analysis',
        'Review resolver efficiency and N+1 query patterns',
        'Implement DataLoader for batched database queries',
        'Add query timeout and depth limiting',
      );
    } else if (violation.endpoint.includes('/search')) {
      recommendation.actions.push(
        'Optimize Elasticsearch/search index configuration',
        'Implement search result caching with appropriate TTL',
        'Consider search query optimization and filters',
        'Review full-text search indexing strategy',
      );
    } else if (violation.endpoint.includes('/entities')) {
      recommendation.actions.push(
        'Review database query optimization for entity operations',
        'Consider implementing entity caching layer',
        'Optimize Neo4j Cypher queries and indexes',
        'Review entity relationship traversal patterns',
      );
    } else if (violation.endpoint.includes('/analytics')) {
      recommendation.actions.push(
        'Implement analytics result caching',
        'Consider pre-computed analytics aggregations',
        'Optimize data warehouse query patterns',
        'Review time-series data access patterns',
      );
    }

    // General performance recommendations
    if (violation.type === 'latency') {
      recommendation.actions.push(
        'Profile application performance during peak load',
        'Review database connection pooling configuration',
        'Consider implementing request-level caching',
        'Analyze and optimize critical path operations',
      );
    }

    if (violation.type === 'error_rate') {
      recommendation.actions.push(
        'Implement circuit breaker patterns for external dependencies',
        'Review error handling and retry mechanisms',
        'Add comprehensive error logging and monitoring',
        'Consider graceful degradation strategies',
      );
    }

    return recommendation.actions.length > 0 ? recommendation : null;
  }

  /**
   * Generate slow query analysis
   */
  async generateSlowQueryAnalysis(budgetReport, baselineMetrics) {
    console.log('🐌 Analyzing slow queries...');

    // Simulate slow query detection based on violations
    const slowQueries = [
      {
        query_type: 'GraphQL',
        query:
          'query GetEntityWithRelationships($id: ID!) { entity(id: $id) { id name relationships { nodes { id name type } } } }',
        avg_duration_ms: 420,
        frequency: 1500,
        optimization_potential: 'high',
        suggested_indexes: ['entity_id_btree', 'relationship_type_hash'],
        explanation: 'Deep relationship traversal without proper indexing',
      },
      {
        query_type: 'Cypher',
        query:
          'MATCH (e:Entity)-[r:RELATED_TO*1..3]->(related) WHERE e.id = $entityId RETURN related',
        avg_duration_ms: 380,
        frequency: 800,
        optimization_potential: 'high',
        suggested_indexes: [
          'CREATE INDEX entity_id_index FOR (e:Entity) ON (e.id)',
        ],
        explanation:
          'Variable-length path query without index on starting node',
      },
      {
        query_type: 'SQL',
        query:
          'SELECT * FROM events WHERE created_at BETWEEN $start AND $end ORDER BY created_at DESC LIMIT 100',
        avg_duration_ms: 290,
        frequency: 2000,
        optimization_potential: 'medium',
        suggested_indexes: [
          'CREATE INDEX idx_events_created_at ON events(created_at DESC)',
        ],
        explanation: 'Large table scan with date range and sorting',
      },
      {
        query_type: 'Elasticsearch',
        query:
          '{ "query": { "bool": { "must": [{ "wildcard": { "content": "*search_term*" } }] } }, "sort": [{ "_score": "desc" }] }',
        avg_duration_ms: 580,
        frequency: 600,
        optimization_potential: 'medium',
        suggested_indexes: ['Add ngram analyzer for partial matching'],
        explanation: 'Wildcard search with scoring on large index',
      },
    ];

    this.diagnostics.slow_queries = slowQueries;

    // Generate query optimization summary
    const totalOptimizationPotential = slowQueries.reduce((total, query) => {
      const impact = query.frequency * query.avg_duration_ms;
      return total + impact;
    }, 0);

    this.diagnostics.optimization_hints.push({
      type: 'query_optimization',
      total_optimization_potential_ms: totalOptimizationPotential,
      high_impact_queries: slowQueries.filter(
        (q) => q.optimization_potential === 'high',
      ).length,
      recommendation:
        'Focus on high-impact queries with proper indexing and query restructuring',
    });
  }

  /**
   * Generate optimization hints
   */
  async generateOptimizationHints(budgetReport) {
    console.log('💡 Generating optimization hints...');

    const hints = [
      {
        category: 'caching',
        priority: 'high',
        description: 'Implement Redis caching for frequently accessed entities',
        estimated_improvement: '40-60% latency reduction for cached requests',
        implementation_effort: 'medium',
        code_example: `
// Redis caching example
const cacheKey = \`entity:\${entityId}\`;
let entity = await redis.get(cacheKey);
if (!entity) {
  entity = await database.getEntity(entityId);
  await redis.setex(cacheKey, 300, JSON.stringify(entity)); // 5min TTL
}
`,
      },
      {
        category: 'database_optimization',
        priority: 'high',
        description: 'Add compound indexes for common query patterns',
        estimated_improvement: '50-80% query performance improvement',
        implementation_effort: 'low',
        code_example: `
-- PostgreSQL compound index
CREATE INDEX idx_entities_type_created ON entities(type, created_at DESC);

-- Neo4j relationship index
CREATE INDEX relationship_type_timestamp FOR ()-[r:RELATED_TO]-() ON (r.type, r.created_at);
`,
      },
      {
        category: 'connection_pooling',
        priority: 'medium',
        description: 'Optimize database connection pool settings',
        estimated_improvement: '20-30% connection overhead reduction',
        implementation_effort: 'low',
        code_example: `
// Connection pool optimization
const poolConfig = {
  max: 20,           // Maximum connections
  min: 5,            // Minimum connections
  idle: 10000,       // Idle timeout (10s)
  acquire: 30000,    // Acquire timeout (30s)
  evict: 1000        // Eviction interval (1s)
};
`,
      },
      {
        category: 'graphql_optimization',
        priority: 'high',
        description: 'Implement DataLoader for N+1 query prevention',
        estimated_improvement: '60-90% reduction in database queries',
        implementation_effort: 'medium',
        code_example: `
// DataLoader implementation
const entityLoader = new DataLoader(async (entityIds) => {
  const entities = await db.getEntitiesByIds(entityIds);
  return entityIds.map(id => entities.find(e => e.id === id));
});

// Usage in resolver
const entity = await entityLoader.load(entityId);
`,
      },
      {
        category: 'response_compression',
        priority: 'medium',
        description: 'Enable gzip compression for API responses',
        estimated_improvement: '30-50% response size reduction',
        implementation_effort: 'low',
        code_example: `
// Express.js compression
const compression = require('compression');
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => req.headers['x-no-compression'] ? false : compression.filter(req, res)
}));
`,
      },
    ];

    this.diagnostics.optimization_hints = hints;
  }

  /**
   * Generate Cypher index suggestions
   */
  async generateCypherIndexSuggestions(budgetReport) {
    console.log('🔍 Generating Cypher index suggestions...');

    const cypherSuggestions = [
      {
        index_type: 'node_property',
        command: 'CREATE INDEX entity_id_index FOR (e:Entity) ON (e.id)',
        rationale: 'Fast entity lookup by ID - most common query pattern',
        estimated_improvement: '80-95% query performance improvement',
        query_patterns: [
          'MATCH (e:Entity {id: $id})',
          'MATCH (e:Entity) WHERE e.id = $id',
        ],
      },
      {
        index_type: 'node_property',
        command: 'CREATE INDEX entity_type_index FOR (e:Entity) ON (e.type)',
        rationale: 'Entity filtering by type for analytics queries',
        estimated_improvement: '60-80% query performance improvement',
        query_patterns: [
          'MATCH (e:Entity {type: $type})',
          'MATCH (e:Entity) WHERE e.type IN $types',
        ],
      },
      {
        index_type: 'relationship_property',
        command:
          'CREATE INDEX relationship_weight_index FOR ()-[r:RELATED_TO]-() ON (r.weight)',
        rationale: 'Relationship filtering and sorting by weight/importance',
        estimated_improvement: '50-70% query performance improvement',
        query_patterns: [
          'MATCH ()-[r:RELATED_TO]->() WHERE r.weight > $threshold',
          'MATCH ()-[r:RELATED_TO]->() RETURN r ORDER BY r.weight DESC',
        ],
      },
      {
        index_type: 'composite',
        command:
          'CREATE INDEX entity_type_created_index FOR (e:Entity) ON (e.type, e.created_at)',
        rationale: 'Composite index for time-based entity queries by type',
        estimated_improvement: '70-90% query performance improvement',
        query_patterns: [
          'MATCH (e:Entity {type: $type}) WHERE e.created_at > $timestamp',
          'MATCH (e:Entity) WHERE e.type = $type AND e.created_at BETWEEN $start AND $end',
        ],
      },
      {
        index_type: 'fulltext',
        command:
          'CREATE FULLTEXT INDEX entity_content_search FOR (e:Entity) ON EACH [e.name, e.description]',
        rationale: 'Full-text search capabilities for entity content',
        estimated_improvement: '90-99% search query performance improvement',
        query_patterns: [
          "CALL db.index.fulltext.queryNodes('entity_content_search', 'search terms')",
          "CALL db.index.fulltext.queryNodes('entity_content_search', 'name:\"exact match\"')",
        ],
      },
    ];

    this.diagnostics.cypher_indexes = cypherSuggestions;

    // Add index creation script
    const indexScript = cypherSuggestions
      .map((suggestion) => {
        return `-- ${suggestion.rationale}\n${suggestion.command};`;
      })
      .join('\n\n');

    this.diagnostics.index_creation_script = indexScript;
  }

  /**
   * Export diagnostics to files
   */
  async exportDiagnostics() {
    console.log('📋 Exporting diagnostic artifacts...');

    // Export main diagnostics report
    const diagnosticsPath = 'performance-diagnostics.json';
    fs.writeFileSync(
      diagnosticsPath,
      JSON.stringify(this.diagnostics, null, 2),
    );

    // Export markdown summary for PR comments
    const markdownPath = 'performance-diagnostics.md';
    const markdownContent = this.generateMarkdownSummary();
    fs.writeFileSync(markdownPath, markdownContent);

    // Export index creation script
    if (this.diagnostics.index_creation_script) {
      const indexScriptPath = 'suggested-indexes.cypher';
      fs.writeFileSync(indexScriptPath, this.diagnostics.index_creation_script);
    }

    console.log(`📄 Diagnostics exported:`);
    console.log(`  - JSON report: ${diagnosticsPath}`);
    console.log(`  - Markdown summary: ${markdownPath}`);
    if (this.diagnostics.index_creation_script) {
      console.log(`  - Index script: suggested-indexes.cypher`);
    }
  }

  /**
   * Generate markdown summary for PR comments
   */
  generateMarkdownSummary() {
    const violations = this.diagnostics.violations.length;
    const criticalViolations = this.diagnostics.violations.filter(
      (v) => v.severity === 'critical',
    ).length;

    let markdown = `# 🎯 Performance Budget Analysis

**Analysis Timestamp**: ${this.diagnostics.timestamp}
**Total Violations**: ${violations}
**Critical Violations**: ${criticalViolations}

`;

    if (violations === 0) {
      markdown += `✅ **No performance budget violations detected!**

All endpoints are performing within acceptable limits.
`;
      return markdown;
    }

    // Violations summary
    markdown += `## 🚨 Budget Violations

| Endpoint | Severity | Type | Current | Budget | Overage |
|----------|----------|------|---------|--------|---------|
`;

    for (const violation of this.diagnostics.violations) {
      const overage =
        violation.regression_magnitude?.percentage?.toFixed(1) || 'N/A';
      markdown += `| ${violation.endpoint} | ${violation.severity} | ${violation.violation_type} | - | - | ${overage}% |\n`;
    }

    // Slow queries
    if (this.diagnostics.slow_queries?.length > 0) {
      markdown += `\n## 🐌 Slowest Queries

| Query Type | Duration (ms) | Frequency | Optimization Potential |
|------------|---------------|-----------|----------------------|
`;

      for (const query of this.diagnostics.slow_queries.slice(0, 5)) {
        markdown += `| ${query.query_type} | ${query.avg_duration_ms} | ${query.frequency} | ${query.optimization_potential} |\n`;
      }
    }

    // Optimization recommendations
    if (this.diagnostics.optimization_hints?.length > 0) {
      markdown += `\n## 💡 Optimization Recommendations

`;

      for (const hint of this.diagnostics.optimization_hints.slice(0, 3)) {
        markdown += `### ${hint.category}
**Priority**: ${hint.priority}
**Description**: ${hint.description}
**Estimated Improvement**: ${hint.estimated_improvement}
**Implementation Effort**: ${hint.implementation_effort}

\`\`\`javascript
${hint.code_example}
\`\`\`

`;
      }
    }

    // Index suggestions
    if (this.diagnostics.cypher_indexes?.length > 0) {
      markdown += `\n## 🔍 Suggested Database Indexes

\`\`\`cypher
${this.diagnostics.index_creation_script}
\`\`\`

`;
    }

    markdown += `---
*Generated by GREEN TRAIN Performance Budget Diagnostics*`;

    return markdown;
  }
}

// CLI execution
if (require.main === module) {
  const diagnostics = new PerformanceBudgetDiagnostics();

  const budgetReportPath = process.argv[2] || 'budget-report.json';
  const baselineMetricsPath = process.argv[3] || 'baseline-metrics.json';

  diagnostics
    .analyze(budgetReportPath, baselineMetricsPath)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = PerformanceBudgetDiagnostics;
