/**
 * Natural Language to Cypher Query Translator
 *
 * Converts natural language intelligence queries to Neo4j Cypher:
 * - Schema-aware query generation
 * - Query validation and sanitization
 * - Parameter extraction and binding
 * - Query optimization hints
 * - Security filtering based on clearance
 *
 * Supported query patterns:
 * - Entity lookups and relationships
 * - Path finding (shortest, all paths)
 * - Aggregations and statistics
 * - Temporal queries
 * - Pattern matching for TTPs
 */

import Anthropic from '@anthropic-ai/sdk';
import neo4j, { Driver, Session as Neo4jSession } from 'neo4j-driver';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export interface NL2CypherConfig {
  neo4jDriver: Driver;
  llmClient?: Anthropic;
  schemaCache?: GraphSchema;
  maxQueryComplexity?: number;
  enableExplain?: boolean;
  securityFilters?: SecurityFilter[];
}

export interface GraphSchema {
  nodeLabels: NodeLabelSchema[];
  relationshipTypes: RelationshipTypeSchema[];
  indexes: IndexSchema[];
  constraints: ConstraintSchema[];
}

export interface NodeLabelSchema {
  label: string;
  properties: PropertySchema[];
  description?: string;
  examples?: string[];
}

export interface RelationshipTypeSchema {
  type: string;
  sourceLabels: string[];
  targetLabels: string[];
  properties: PropertySchema[];
  description?: string;
}

export interface PropertySchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'array';
  indexed?: boolean;
  unique?: boolean;
  required?: boolean;
}

export interface IndexSchema {
  name: string;
  label: string;
  properties: string[];
  type: 'btree' | 'fulltext' | 'vector';
}

export interface ConstraintSchema {
  name: string;
  type: 'unique' | 'exists' | 'node_key';
  label: string;
  properties: string[];
}

export interface SecurityFilter {
  label?: string;
  property: string;
  operator: '=' | 'IN' | '<=' | '>=';
  valueFromContext: string; // e.g., 'clearance', 'tenantId', 'compartments'
}

export interface TranslationRequest {
  query: string;
  context?: {
    clearance?: string;
    tenantId?: string;
    compartments?: string[];
    recentEntities?: string[];
    investigationId?: string;
  };
  options?: {
    limit?: number;
    explain?: boolean;
    validate?: boolean;
    optimize?: boolean;
  };
}

export interface TranslationResult {
  cypher: string;
  parameters: Record<string, unknown>;
  explanation?: string;
  queryType: QueryType;
  complexity: number;
  estimatedRows?: number;
  warnings?: string[];
  securityFiltersApplied: string[];
}

export type QueryType =
  | 'entity_lookup'
  | 'relationship_query'
  | 'path_finding'
  | 'aggregation'
  | 'pattern_match'
  | 'temporal'
  | 'update'
  | 'complex';

// =============================================================================
// SCHEMA INTROSPECTION
// =============================================================================

export class SchemaIntrospector {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  async introspect(): Promise<GraphSchema> {
    const session = this.driver.session();

    try {
      const [labels, relationships, indexes, constraints] = await Promise.all([
        this.getNodeLabels(session),
        this.getRelationshipTypes(session),
        this.getIndexes(session),
        this.getConstraints(session),
      ]);

      return {
        nodeLabels: labels,
        relationshipTypes: relationships,
        indexes,
        constraints,
      };
    } finally {
      await session.close();
    }
  }

  private async getNodeLabels(session: Neo4jSession): Promise<NodeLabelSchema[]> {
    const result = await session.run(`
      CALL db.labels() YIELD label
      RETURN label
    `);

    const labels: NodeLabelSchema[] = [];

    for (const record of result.records) {
      const label = record.get('label');

      // Get properties for this label
      const propsResult = await session.run(`
        MATCH (n:\`${label}\`)
        WITH n LIMIT 100
        UNWIND keys(n) as key
        RETURN DISTINCT key,
               head(collect(n[key])) as sampleValue,
               count(*) as frequency
        ORDER BY frequency DESC
      `);

      const properties: PropertySchema[] = propsResult.records.map(r => ({
        name: r.get('key'),
        type: this.inferType(r.get('sampleValue')),
      }));

      labels.push({
        label,
        properties,
        description: this.getKnownDescription(label),
      });
    }

    return labels;
  }

  private async getRelationshipTypes(session: Neo4jSession): Promise<RelationshipTypeSchema[]> {
    const result = await session.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      RETURN relationshipType
    `);

    const types: RelationshipTypeSchema[] = [];

    for (const record of result.records) {
      const type = record.get('relationshipType');

      // Get source/target labels and properties
      const detailResult = await session.run(`
        MATCH (a)-[r:\`${type}\`]->(b)
        WITH labels(a) as sourceLabels, labels(b) as targetLabels, keys(r) as props
        LIMIT 100
        RETURN DISTINCT sourceLabels, targetLabels, props
      `);

      const sourceLabels = new Set<string>();
      const targetLabels = new Set<string>();
      const properties = new Set<string>();

      for (const r of detailResult.records) {
        for (const l of r.get('sourceLabels') || []) sourceLabels.add(l);
        for (const l of r.get('targetLabels') || []) targetLabels.add(l);
        for (const p of r.get('props') || []) properties.add(p);
      }

      types.push({
        type,
        sourceLabels: Array.from(sourceLabels),
        targetLabels: Array.from(targetLabels),
        properties: Array.from(properties).map(p => ({
          name: p,
          type: 'string',
        })),
        description: this.getKnownDescription(type),
      });
    }

    return types;
  }

  private async getIndexes(session: Neo4jSession): Promise<IndexSchema[]> {
    const result = await session.run(`
      SHOW INDEXES
      YIELD name, labelsOrTypes, properties, type
      RETURN name, labelsOrTypes, properties, type
    `);

    return result.records.map(r => ({
      name: r.get('name'),
      label: r.get('labelsOrTypes')?.[0] || '',
      properties: r.get('properties') || [],
      type: r.get('type')?.toLowerCase().includes('fulltext') ? 'fulltext' :
            r.get('type')?.toLowerCase().includes('vector') ? 'vector' : 'btree',
    }));
  }

  private async getConstraints(session: Neo4jSession): Promise<ConstraintSchema[]> {
    const result = await session.run(`
      SHOW CONSTRAINTS
      YIELD name, labelsOrTypes, properties, type
      RETURN name, labelsOrTypes, properties, type
    `);

    return result.records.map(r => ({
      name: r.get('name'),
      type: r.get('type')?.toLowerCase().includes('unique') ? 'unique' :
            r.get('type')?.toLowerCase().includes('exists') ? 'exists' : 'node_key',
      label: r.get('labelsOrTypes')?.[0] || '',
      properties: r.get('properties') || [],
    }));
  }

  private inferType(value: unknown): PropertySchema['type'] {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'datetime';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'datetime';
    return 'string';
  }

  private getKnownDescription(labelOrType: string): string {
    const descriptions: Record<string, string> = {
      // Node labels
      ThreatActor: 'A threat actor or APT group',
      Malware: 'Malware family or sample',
      Campaign: 'A cyber campaign or operation',
      Infrastructure: 'Network infrastructure (IP, domain, etc.)',
      Vulnerability: 'A CVE or security vulnerability',
      Tool: 'A legitimate or dual-use tool',
      TTP: 'Tactic, Technique, or Procedure (MITRE ATT&CK)',
      Indicator: 'An indicator of compromise (IOC)',
      Entity: 'Generic entity',
      Person: 'A person or identity',
      Organization: 'An organization or company',

      // Relationship types
      ATTRIBUTED_TO: 'Attribution relationship',
      USES: 'Usage relationship (actor uses malware/tool)',
      TARGETS: 'Targeting relationship',
      COMMUNICATES_WITH: 'C2 or network communication',
      EXPLOITS: 'Exploitation of vulnerability',
      PART_OF: 'Membership or containment',
      LINKED_TO: 'Generic link/association',
      OBSERVED_IN: 'Observation in campaign/event',
    };

    return descriptions[labelOrType] || '';
  }
}

// =============================================================================
// NL2CYPHER TRANSLATOR
// =============================================================================

export class NL2CypherTranslator {
  private config: NL2CypherConfig;
  private schema?: GraphSchema;
  private llmClient?: Anthropic;
  private queryPatterns: QueryPattern[];

  constructor(config: NL2CypherConfig) {
    this.config = {
      maxQueryComplexity: 10,
      enableExplain: true,
      securityFilters: [],
      ...config,
    };

    this.llmClient = config.llmClient;
    this.schema = config.schemaCache;
    this.queryPatterns = this.buildQueryPatterns();
  }

  // ===========================================================================
  // MAIN TRANSLATION
  // ===========================================================================

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    // Ensure we have schema
    if (!this.schema) {
      const introspector = new SchemaIntrospector(this.config.neo4jDriver);
      this.schema = await introspector.introspect();
    }

    // Try pattern matching first (faster, deterministic)
    const patternResult = this.tryPatternMatch(request.query, request.context);
    if (patternResult) {
      return this.applySecurityFilters(patternResult, request.context);
    }

    // Fall back to LLM translation
    if (this.llmClient) {
      const llmResult = await this.llmTranslate(request);
      return this.applySecurityFilters(llmResult, request.context);
    }

    throw new Error('Could not translate query: no patterns matched and LLM not available');
  }

  // ===========================================================================
  // PATTERN MATCHING
  // ===========================================================================

  private buildQueryPatterns(): QueryPattern[] {
    return [
      // Entity lookups
      {
        regex: /(?:find|show|get|lookup|what is)\s+(?:the\s+)?(?:entity|entities)?\s*(?:named?\s+)?['""]?(.+?)['""]?$/i,
        type: 'entity_lookup',
        generate: (matches, _ctx) => ({
          cypher: `MATCH (n) WHERE toLower(n.name) CONTAINS toLower($name) RETURN n LIMIT $limit`,
          parameters: { name: matches[1].trim(), limit: 25 },
        }),
      },

      // Threat actor lookup
      {
        regex: /(?:find|show|get|what|who)\s+(?:is|are)?\s*(?:threat\s*actor|apt|group)s?\s*(?:named?\s+)?['""]?(.+?)['""]?$/i,
        type: 'entity_lookup',
        generate: (matches, _ctx) => ({
          cypher: `MATCH (ta:ThreatActor) WHERE toLower(ta.name) CONTAINS toLower($name) OR $name IN ta.aliases RETURN ta LIMIT $limit`,
          parameters: { name: matches[1].trim(), limit: 10 },
        }),
      },

      // Relationships of entity
      {
        regex: /(?:show|find|get)\s+(?:all\s+)?relationships?\s+(?:of|for|from)\s+['""]?(.+?)['""]?$/i,
        type: 'relationship_query',
        generate: (matches, _ctx) => ({
          cypher: `MATCH (n)-[r]-(m) WHERE toLower(n.name) CONTAINS toLower($name) RETURN n, r, m LIMIT $limit`,
          parameters: { name: matches[1].trim(), limit: 50 },
        }),
      },

      // Path between entities
      {
        regex: /(?:find|show)\s+(?:the\s+)?(?:path|paths|connections?)\s+(?:between|from)\s+['""]?(.+?)['""]?\s+(?:and|to)\s+['""]?(.+?)['""]?$/i,
        type: 'path_finding',
        generate: (matches, _ctx) => ({
          cypher: `
            MATCH (a), (b)
            WHERE toLower(a.name) CONTAINS toLower($nameA)
              AND toLower(b.name) CONTAINS toLower($nameB)
            MATCH path = shortestPath((a)-[*..6]-(b))
            RETURN path LIMIT $limit
          `,
          parameters: {
            nameA: matches[1].trim(),
            nameB: matches[2].trim(),
            limit: 10,
          },
        }),
      },

      // What does X use
      {
        regex: /what\s+(?:does|do)\s+['""]?(.+?)['""]?\s+use/i,
        type: 'relationship_query',
        generate: (matches, _ctx) => ({
          cypher: `
            MATCH (actor)-[:USES]->(tool)
            WHERE toLower(actor.name) CONTAINS toLower($name)
            RETURN actor, tool LIMIT $limit
          `,
          parameters: { name: matches[1].trim(), limit: 25 },
        }),
      },

      // Who targets X
      {
        regex: /(?:who|what)\s+targets?\s+['""]?(.+?)['""]?$/i,
        type: 'relationship_query',
        generate: (matches, _ctx) => ({
          cypher: `
            MATCH (actor)-[:TARGETS]->(target)
            WHERE toLower(target.name) CONTAINS toLower($name)
            RETURN actor, target LIMIT $limit
          `,
          parameters: { name: matches[1].trim(), limit: 25 },
        }),
      },

      // TTPs of threat actor
      {
        regex: /(?:what|which)\s+(?:ttps?|techniques?|tactics?)\s+(?:does|do|are\s+used\s+by)\s+['""]?(.+?)['""]?$/i,
        type: 'relationship_query',
        generate: (matches, _ctx) => ({
          cypher: `
            MATCH (actor:ThreatActor)-[:USES]->(ttp:TTP)
            WHERE toLower(actor.name) CONTAINS toLower($name)
            RETURN actor, ttp ORDER BY ttp.id LIMIT $limit
          `,
          parameters: { name: matches[1].trim(), limit: 50 },
        }),
      },

      // Count by label
      {
        regex: /(?:how\s+many|count)\s+(\w+)s?(?:\s+are\s+there)?$/i,
        type: 'aggregation',
        generate: (matches, _ctx) => {
          const label = this.normalizeLabel(matches[1]);
          return {
            cypher: `MATCH (n:\`${label}\`) RETURN count(n) as count`,
            parameters: {},
          };
        },
      },

      // Recent activity
      {
        regex: /(?:show|find)\s+(?:recent|latest)\s+(\w+)s?(?:\s+from\s+(?:the\s+)?last\s+(\d+)\s+(days?|weeks?|months?))?$/i,
        type: 'temporal',
        generate: (matches, _ctx) => {
          const label = this.normalizeLabel(matches[1]);
          const amount = parseInt(matches[2] || '7', 10);
          const unit = matches[3] || 'days';
          const duration = unit.startsWith('month') ? `P${amount}M` :
                          unit.startsWith('week') ? `P${amount * 7}D` : `P${amount}D`;
          return {
            cypher: `
              MATCH (n:\`${label}\`)
              WHERE n.createdAt >= datetime() - duration($duration)
              RETURN n ORDER BY n.createdAt DESC LIMIT $limit
            `,
            parameters: { duration, limit: 25 },
          };
        },
      },
    ];
  }

  private tryPatternMatch(
    query: string,
    context?: TranslationRequest['context']
  ): TranslationResult | null {
    for (const pattern of this.queryPatterns) {
      const match = query.match(pattern.regex);
      if (match) {
        const { cypher, parameters } = pattern.generate(match, context);
        return {
          cypher,
          parameters,
          queryType: pattern.type,
          complexity: this.estimateComplexity(cypher),
          securityFiltersApplied: [],
        };
      }
    }
    return null;
  }

  private normalizeLabel(input: string): string {
    const normalized = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();

    // Map common variations
    const labelMap: Record<string, string> = {
      'Threatactor': 'ThreatActor',
      'Apt': 'ThreatActor',
      'Ioc': 'Indicator',
      'Iocs': 'Indicator',
      'Cve': 'Vulnerability',
      'Cves': 'Vulnerability',
      'Technique': 'TTP',
      'Tactic': 'TTP',
    };

    return labelMap[normalized] || normalized;
  }

  // ===========================================================================
  // LLM TRANSLATION
  // ===========================================================================

  private async llmTranslate(request: TranslationRequest): Promise<TranslationResult> {
    if (!this.llmClient) {
      throw new Error('LLM client not configured');
    }

    const systemPrompt = this.buildLLMSystemPrompt();
    const userPrompt = this.buildLLMUserPrompt(request);

    const response = await this.llmClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
      ],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const responseText = textBlock?.text || '';

    return this.parseLLMResponse(responseText);
  }

  private buildLLMSystemPrompt(): string {
    const schemaDescription = this.formatSchemaForPrompt();

    return `You are a Cypher query generator for a Neo4j intelligence graph database.

SCHEMA:
${schemaDescription}

RULES:
1. Always use parameterized queries with $paramName syntax
2. Use CONTAINS for fuzzy string matching, not exact equality
3. Always include a LIMIT clause (default 25)
4. Use relationship patterns like (a)-[:REL_TYPE]->(b)
5. For paths, use shortestPath or allShortestPaths with max depth 6
6. Never use DELETE, DETACH DELETE, SET, or CREATE without explicit approval
7. Prefer indexed properties for filtering

OUTPUT FORMAT:
Return a JSON object with:
{
  "cypher": "the Cypher query",
  "parameters": {"param": "value"},
  "queryType": "entity_lookup|relationship_query|path_finding|aggregation|pattern_match|temporal|complex",
  "explanation": "brief explanation of what the query does"
}`;
  }

  private buildLLMUserPrompt(request: TranslationRequest): string {
    let prompt = `Translate this natural language query to Cypher:\n\n"${request.query}"`;

    if (request.context?.recentEntities?.length) {
      prompt += `\n\nRecent entities mentioned: ${request.context.recentEntities.join(', ')}`;
    }

    if (request.options?.limit) {
      prompt += `\n\nLimit results to ${request.options.limit}`;
    }

    return prompt;
  }

  private formatSchemaForPrompt(): string {
    if (!this.schema) return 'Schema not available';

    let description = 'NODE LABELS:\n';
    for (const label of this.schema.nodeLabels.slice(0, 15)) {
      description += `- ${label.label}`;
      if (label.properties.length > 0) {
        description += ` (${label.properties.slice(0, 5).map(p => p.name).join(', ')})`;
      }
      if (label.description) {
        description += ` - ${label.description}`;
      }
      description += '\n';
    }

    description += '\nRELATIONSHIP TYPES:\n';
    for (const rel of this.schema.relationshipTypes.slice(0, 15)) {
      description += `- ${rel.type}`;
      if (rel.description) {
        description += ` - ${rel.description}`;
      }
      description += '\n';
    }

    return description;
  }

  private parseLLMResponse(response: string): TranslationResult {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse LLM response as JSON');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        cypher: parsed.cypher,
        parameters: parsed.parameters || {},
        explanation: parsed.explanation,
        queryType: parsed.queryType || 'complex',
        complexity: this.estimateComplexity(parsed.cypher),
        securityFiltersApplied: [],
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  // ===========================================================================
  // SECURITY & VALIDATION
  // ===========================================================================

  private applySecurityFilters(
    result: TranslationResult,
    context?: TranslationRequest['context']
  ): TranslationResult {
    if (!context || !this.config.securityFilters?.length) {
      return result;
    }

    const appliedFilters: string[] = [];
    let cypher = result.cypher;
    const parameters = { ...result.parameters };

    for (const filter of this.config.securityFilters) {
      const contextValue = this.getContextValue(context, filter.valueFromContext);
      if (contextValue === undefined) continue;

      // Add WHERE clause or AND to existing WHERE
      const filterClause = this.buildFilterClause(filter, contextValue);
      if (!filterClause) continue;

      // Insert filter into query
      if (cypher.includes('WHERE')) {
        cypher = cypher.replace(/WHERE\s+/i, `WHERE ${filterClause} AND `);
      } else if (cypher.includes('RETURN')) {
        cypher = cypher.replace(/RETURN/i, `WHERE ${filterClause} RETURN`);
      }

      parameters[`_sec_${filter.property}`] = contextValue;
      appliedFilters.push(`${filter.property} ${filter.operator} ${filter.valueFromContext}`);
    }

    return {
      ...result,
      cypher,
      parameters,
      securityFiltersApplied: appliedFilters,
    };
  }

  private getContextValue(context: TranslationRequest['context'], key: string): unknown {
    switch (key) {
      case 'clearance': return context?.clearance;
      case 'tenantId': return context?.tenantId;
      case 'compartments': return context?.compartments;
      default: return undefined;
    }
  }

  private buildFilterClause(filter: SecurityFilter, value: unknown): string {
    const nodeVar = filter.label ? `n:${filter.label}` : 'n';
    const paramName = `_sec_${filter.property}`;

    switch (filter.operator) {
      case '=':
        return `${nodeVar}.${filter.property} = $${paramName}`;
      case 'IN':
        return `${nodeVar}.${filter.property} IN $${paramName}`;
      case '<=':
        return `${nodeVar}.${filter.property} <= $${paramName}`;
      case '>=':
        return `${nodeVar}.${filter.property} >= $${paramName}`;
      default:
        return '';
    }
  }

  async validate(cypher: string): Promise<{ valid: boolean; errors?: string[] }> {
    // Check for dangerous operations
    const dangerous = ['DELETE', 'DETACH', 'SET ', 'CREATE ', 'MERGE ', 'REMOVE '];
    const errors: string[] = [];

    for (const op of dangerous) {
      if (cypher.toUpperCase().includes(op)) {
        errors.push(`Query contains potentially dangerous operation: ${op.trim()}`);
      }
    }

    // Check complexity
    const complexity = this.estimateComplexity(cypher);
    if (complexity > this.config.maxQueryComplexity!) {
      errors.push(`Query complexity (${complexity}) exceeds maximum (${this.config.maxQueryComplexity})`);
    }

    // Try to explain query
    if (this.config.enableExplain && errors.length === 0) {
      try {
        const session = this.config.neo4jDriver.session();
        try {
          await session.run(`EXPLAIN ${cypher}`);
        } finally {
          await session.close();
        }
      } catch (error) {
        errors.push(`Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private estimateComplexity(cypher: string): number {
    let complexity = 1;

    // Count patterns
    const patterns = (cypher.match(/\([^)]*\)/g) || []).length;
    complexity += patterns * 0.5;

    // Count relationships
    const relationships = (cypher.match(/-\[.*?\]-/g) || []).length;
    complexity += relationships;

    // Variable length paths add significant complexity
    if (cypher.includes('*')) {
      complexity += 3;
    }

    // OPTIONAL MATCH adds complexity
    if (cypher.includes('OPTIONAL MATCH')) {
      complexity += 2;
    }

    // Multiple MATCH clauses
    const matchCount = (cypher.match(/\bMATCH\b/gi) || []).length;
    complexity += (matchCount - 1) * 1.5;

    return Math.round(complexity * 10) / 10;
  }

  // ===========================================================================
  // EXECUTION
  // ===========================================================================

  async executeQuery(
    cypher: string,
    parameters: Record<string, unknown>
  ): Promise<unknown[]> {
    const session = this.config.neo4jDriver.session();

    try {
      const result = await session.run(cypher, parameters);

      return result.records.map(record => {
        const obj: Record<string, unknown> = {};
        for (const key of record.keys) {
          obj[key] = this.convertNeo4jValue(record.get(key));
        }
        return obj;
      });
    } finally {
      await session.close();
    }
  }

  private convertNeo4jValue(value: unknown): unknown {
    if (value === null || value === undefined) return null;

    // Neo4j Node
    if (value && typeof value === 'object' && 'labels' in value && 'properties' in value) {
      const node = value as { labels: string[]; properties: Record<string, unknown>; identity: { low: number } };
      return {
        _type: 'node',
        _id: node.identity?.low,
        _labels: node.labels,
        ...node.properties,
      };
    }

    // Neo4j Relationship
    if (value && typeof value === 'object' && 'type' in value && 'properties' in value && 'start' in value) {
      const rel = value as { type: string; properties: Record<string, unknown>; start: { low: number }; end: { low: number } };
      return {
        _type: 'relationship',
        _relType: rel.type,
        _startId: rel.start?.low,
        _endId: rel.end?.low,
        ...rel.properties,
      };
    }

    // Neo4j Path
    if (value && typeof value === 'object' && 'segments' in value) {
      const path = value as { segments: Array<{ start: unknown; relationship: unknown; end: unknown }> };
      return {
        _type: 'path',
        segments: path.segments.map(s => ({
          start: this.convertNeo4jValue(s.start),
          relationship: this.convertNeo4jValue(s.relationship),
          end: this.convertNeo4jValue(s.end),
        })),
      };
    }

    // Neo4j Integer
    if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
      const int = value as { low: number; high: number };
      return int.high === 0 ? int.low : neo4j.integer.toNumber(value as neo4j.Integer);
    }

    return value;
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface QueryPattern {
  regex: RegExp;
  type: QueryType;
  generate: (
    matches: RegExpMatchArray,
    context?: TranslationRequest['context']
  ) => { cypher: string; parameters: Record<string, unknown> };
}

// =============================================================================
// FACTORY
// =============================================================================

export function createNL2CypherTranslator(config: NL2CypherConfig): NL2CypherTranslator {
  return new NL2CypherTranslator(config);
}
