import { getNeo4jDriver, registerQueryObserver } from '../db/neo4j.js';
import pino from 'pino';

const logger = pino({ name: 'GraphIndexAdvisorService' });

interface AccessPattern {
  label: string;
  property: string;
  count: number;
}

interface Recommendation {
  label: string;
  property: string;
  reason: string;
  cypher: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

class GraphIndexAdvisorService {
  private static instance: GraphIndexAdvisorService;
  private accessPatterns: Map<string, number> = new Map();
  private querySampleCount = 0;
  private sampleRate = 0.1; // Analyze 10% of queries by default

  private constructor() {
    registerQueryObserver(this.recordQuery.bind(this));
  }

  public static getInstance(): GraphIndexAdvisorService {
    if (!GraphIndexAdvisorService.instance) {
      GraphIndexAdvisorService.instance = new GraphIndexAdvisorService();
    }
    return GraphIndexAdvisorService.instance;
  }

  /**
   * Records a Cypher query for analysis.
   * Parses simple patterns to identify property access.
   * Applies sampling to minimize performance overhead.
   */
  public recordQuery(cypher: string): void {
    // Simple random sampling
    if (Math.random() > this.sampleRate) {
      return;
    }

    this.querySampleCount++;

    // Normalize: remove extra whitespace and newlines to simplify regex matching
    const normalized = cypher.replace(/\s+/g, ' ');

    // We need to map variables to labels
    const variableMap = new Map<string, string>();

    // 1. Identify MATCH patterns: MATCH (n:Label), (m:Other)
    // We scan for `(var:Label)` anywhere in the string.
    // This is safer than relying on "MATCH" prefix for everything, though slightly less precise (might catch comments)
    // Regex: `\((\w+):(\w+)\)`
    const matchRegex = /\((\w+):(\w+)\)/g;
    let matchMatch;
    while ((matchMatch = matchRegex.exec(normalized)) !== null) {
      variableMap.set(matchMatch[1], matchMatch[2]);
    }

    // 2. Identify Inline Properties: (n:Label {prop: val, prop2: val})
    // Regex matches `(var:Label { ... })` and captures the inner props
    const inlinePropsRegex = /\(\w+:(\w+)\s*\{([^}]+)\}\)/g;
    let inlineMatch;
    while ((inlineMatch = inlinePropsRegex.exec(normalized)) !== null) {
      const label = inlineMatch[1];
      const propsString = inlineMatch[2];
      // simplistic property parser: propName:
      const propNameRegex = /(\w+)\s*:/g;
      let propMatch;
      while ((propMatch = propNameRegex.exec(propsString)) !== null) {
        this.incrementPattern(label, propMatch[1]);
      }
    }

    // 3. Identify WHERE clauses and property access
    // We look for `variable.property operator` pattern.
    // The operator context helps ensure it's a filter, not just a return.
    // Operators: =, <>, <, >, <=, >=, IN, STARTS WITH, ENDS WITH, CONTAINS, =~
    // Note: We don't rely on `WHERE` keyword prefixing immediately because of `AND`/`OR`.
    // We just look for the pattern `var.prop op` which is a strong signal of filtering.

    const conditionRegex = /\b(\w+)\.(\w+)\s*(=|<>|<|>|<=|>=|\bIN\b|\bSTARTS WITH\b|\bENDS WITH\b|\bCONTAINS\b|=~)/gi;
    let match;

    while ((match = conditionRegex.exec(normalized)) !== null) {
      const variable = match[1];
      const property = match[2];
      const label = variableMap.get(variable);

      if (label) {
        this.incrementPattern(label, property);
      }
    }
  }

  private incrementPattern(label: string, property: string) {
    const key = `${label}:${property}`;
    const current = this.accessPatterns.get(key) || 0;
    this.accessPatterns.set(key, current + 1);
  }

  /**
   * Generates index recommendations based on recorded usage and existing indexes.
   */
  public async getRecommendations(): Promise<Recommendation[]> {
    // Lazy load driver to avoid circular dependency issues at import time
    // though the singleton pattern usually handles this, importing getNeo4jDriver dynamically is safer if feasible,
    // or just rely on the import being available when this method is CALLED.
    const driver = getNeo4jDriver();
    const session = driver.session();
    const recommendations: Recommendation[] = [];
    const existingIndexes = new Set<string>();

    try {
      // Fetch existing indexes
      let result;
      try {
        result = await session.run('SHOW INDEXES YIELD labelsOrTypes, properties');
      } catch (e) {
        // Fallback for older versions
        result = await session.run('CALL db.indexes() YIELD labelsOrTypes, properties');
      }

      result.records.forEach(record => {
        const labels = record.get('labelsOrTypes');
        const properties = record.get('properties');

        if (Array.isArray(labels) && Array.isArray(properties) && properties.length > 0) {
          labels.forEach(label => {
            // For single property index: properties = ['email'] -> covers 'email'
            // For composite index: properties = ['email', 'status'] -> covers 'email' (prefix)
            // It does NOT efficiently cover 'status' alone.

            // We only mark the FIRST property as covered for single-property lookups.
            // If we had smarter logic, we could track composite lookups, but for now we track single prop usage.
            const primaryProp = properties[0];
            existingIndexes.add(`${label}:${primaryProp}`);
          });
        }
      });

      // Analyze patterns
      for (const [key, count] of this.accessPatterns.entries()) {
        const [label, property] = key.split(':');

        // If index exists, skip
        if (existingIndexes.has(key)) continue;

        // Skip internal properties often indexed by ID constraints anyway (like id, uuid) if handled elsewhere.
        if (property === 'id' || property === 'uuid') continue;

        // Heuristic: Suggest if accessed frequently
        if (count >= 5) {
          let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
          if (count > 50) priority = 'HIGH';
          else if (count > 20) priority = 'MEDIUM';

          recommendations.push({
            label,
            property,
            priority,
            reason: `Property '${property}' on Label '${label}' was filtered ${count} times (sampled) but has no index.`,
            cypher: `CREATE INDEX ${label.toLowerCase()}_${property.toLowerCase()}_idx IF NOT EXISTS FOR (n:${label}) ON (n.${property})`
          });
        }
      }

      // Sort by priority and count
      recommendations.sort((a, b) => {
        const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (priorityScore[b.priority] !== priorityScore[a.priority]) {
          return priorityScore[b.priority] - priorityScore[a.priority];
        }
        return 0; // rough sort
      });

      return recommendations;

    } catch (error) {
      logger.error('Error fetching indexes or generating recommendations', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public getStats() {
    return {
      queriesAnalyzed: this.querySampleCount,
      uniquePatternsDetected: this.accessPatterns.size,
      sampleRate: this.sampleRate
    };
  }

  public reset() {
    this.accessPatterns.clear();
    this.querySampleCount = 0;
  }
}

export default GraphIndexAdvisorService;
