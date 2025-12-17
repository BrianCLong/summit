/**
 * Entity Linker to Knowledge Graph
 *
 * Links extracted OSINT entities to existing entities in Neo4j:
 * - Exact match linking
 * - Fuzzy match with Levenshtein distance
 * - Semantic similarity matching
 * - Alias resolution
 * - Disambiguation with context
 *
 * Features:
 * - Multi-strategy linking
 * - Confidence scoring
 * - Batch linking
 * - Link verification
 * - New entity suggestion
 */

import neo4j, { Driver } from 'neo4j-driver';

import { OSINTEntity, OSINTEntityType } from '../types.js';
import { EmbeddingService } from '../embeddings/embedding-service.js';

// =============================================================================
// TYPES
// =============================================================================

export interface EntityLinkerConfig {
  neo4jDriver: Driver;
  embeddingService: EmbeddingService;
  exactMatchThreshold?: number;
  fuzzyMatchThreshold?: number;
  semanticMatchThreshold?: number;
  maxCandidates?: number;
}

export interface LinkedEntity extends OSINTEntity {
  linkedGraphId: string;
  linkConfidence: number;
  linkMethod: 'exact' | 'fuzzy' | 'semantic' | 'alias';
  graphEntityName?: string;
  graphEntityType?: string;
  alternatives?: LinkCandidate[];
}

export interface LinkCandidate {
  graphId: string;
  name: string;
  type: string;
  confidence: number;
  method: string;
}

export interface LinkResult {
  linked: LinkedEntity[];
  unlinked: OSINTEntity[];
  newEntitySuggestions: OSINTEntity[];
}

// =============================================================================
// ENTITY LINKER
// =============================================================================

export class EntityLinker {
  private driver: Driver;
  private embeddings: EmbeddingService;
  private config: Required<EntityLinkerConfig>;

  // Alias mappings for common entities
  private aliasMap: Map<string, string[]> = new Map([
    ['APT29', ['Cozy Bear', 'The Dukes', 'YTTRIUM', 'CozyDuke']],
    ['APT28', ['Fancy Bear', 'Sofacy', 'STRONTIUM', 'Sednit', 'Pawn Storm']],
    ['Lazarus Group', ['Hidden Cobra', 'Guardians of Peace', 'ZINC', 'APT38']],
    ['Sandworm', ['Voodoo Bear', 'IRIDIUM', 'Telebots', 'BlackEnergy']],
    ['FIN7', ['Carbanak', 'Navigator', 'CARBON SPIDER']],
  ]);

  constructor(config: EntityLinkerConfig) {
    this.driver = config.neo4jDriver;
    this.embeddings = config.embeddingService;
    this.config = {
      exactMatchThreshold: config.exactMatchThreshold ?? 1.0,
      fuzzyMatchThreshold: config.fuzzyMatchThreshold ?? 0.85,
      semanticMatchThreshold: config.semanticMatchThreshold ?? 0.8,
      maxCandidates: config.maxCandidates ?? 5,
      neo4jDriver: config.neo4jDriver,
      embeddingService: config.embeddingService,
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Link a batch of OSINT entities to the knowledge graph
   */
  async linkEntities(
    entities: OSINTEntity[],
    tenantId: string,
    context?: string,
  ): Promise<LinkResult> {
    const linked: LinkedEntity[] = [];
    const unlinked: OSINTEntity[] = [];
    const newEntitySuggestions: OSINTEntity[] = [];

    for (const entity of entities) {
      const result = await this.linkSingleEntity(entity, tenantId, context);

      if (result) {
        linked.push(result);
      } else {
        unlinked.push(entity);

        // Suggest as new entity if confidence is high
        if (entity.confidence >= 0.8) {
          newEntitySuggestions.push(entity);
        }
      }
    }

    return { linked, unlinked, newEntitySuggestions };
  }

  /**
   * Link a single entity
   */
  async linkSingleEntity(
    entity: OSINTEntity,
    tenantId: string,
    context?: string,
  ): Promise<LinkedEntity | null> {
    // Strategy 1: Exact match
    const exactMatch = await this.findExactMatch(entity, tenantId);
    if (exactMatch) {
      return this.createLinkedEntity(entity, exactMatch, 'exact');
    }

    // Strategy 2: Alias match
    const aliasMatch = await this.findAliasMatch(entity, tenantId);
    if (aliasMatch) {
      return this.createLinkedEntity(entity, aliasMatch, 'alias');
    }

    // Strategy 3: Fuzzy match
    const fuzzyMatches = await this.findFuzzyMatches(entity, tenantId);
    if (fuzzyMatches.length > 0 && fuzzyMatches[0].confidence >= this.config.fuzzyMatchThreshold) {
      return this.createLinkedEntity(entity, fuzzyMatches[0], 'fuzzy', fuzzyMatches.slice(1));
    }

    // Strategy 4: Semantic match (for entities with descriptions)
    if (context) {
      const semanticMatch = await this.findSemanticMatch(entity, tenantId, context);
      if (semanticMatch && semanticMatch.confidence >= this.config.semanticMatchThreshold) {
        return this.createLinkedEntity(entity, semanticMatch, 'semantic');
      }
    }

    return null;
  }

  /**
   * Verify an existing link
   */
  async verifyLink(entity: LinkedEntity, tenantId: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (e:Entity {id: $graphId, tenantId: $tenantId})
         RETURN e.name AS name, e.type AS type`,
        { graphId: entity.linkedGraphId, tenantId },
      );

      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Get link candidates for manual disambiguation
   */
  async getCandidates(
    entity: OSINTEntity,
    tenantId: string,
    limit?: number,
  ): Promise<LinkCandidate[]> {
    const candidates: LinkCandidate[] = [];

    // Get fuzzy matches
    const fuzzy = await this.findFuzzyMatches(entity, tenantId, limit ?? this.config.maxCandidates);
    candidates.push(...fuzzy);

    // Get type-based matches
    const typeMatches = await this.findByType(entity, tenantId, limit ?? this.config.maxCandidates);
    for (const match of typeMatches) {
      if (!candidates.find((c) => c.graphId === match.graphId)) {
        candidates.push(match);
      }
    }

    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit ?? this.config.maxCandidates);
  }

  // ===========================================================================
  // MATCHING STRATEGIES
  // ===========================================================================

  private async findExactMatch(
    entity: OSINTEntity,
    tenantId: string,
  ): Promise<LinkCandidate | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (e:Entity {tenantId: $tenantId})
         WHERE toLower(e.name) = toLower($value)
            OR toLower(e.id) = toLower($value)
         RETURN e.id AS graphId, e.name AS name, e.type AS type
         LIMIT 1`,
        { tenantId, value: entity.value },
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      return {
        graphId: record.get('graphId') as string,
        name: record.get('name') as string,
        type: record.get('type') as string,
        confidence: 1.0,
        method: 'exact',
      };
    } finally {
      await session.close();
    }
  }

  private async findAliasMatch(
    entity: OSINTEntity,
    tenantId: string,
  ): Promise<LinkCandidate | null> {
    // Check local alias map first
    for (const [canonical, aliases] of this.aliasMap) {
      const normalizedValue = entity.value.toLowerCase();
      const normalizedCanonical = canonical.toLowerCase();

      if (
        normalizedValue === normalizedCanonical ||
        aliases.some((a) => a.toLowerCase() === normalizedValue)
      ) {
        // Look up canonical name in graph
        const session = this.driver.session();
        try {
          const result = await session.run(
            `MATCH (e:Entity {tenantId: $tenantId})
             WHERE toLower(e.name) = toLower($canonical)
             RETURN e.id AS graphId, e.name AS name, e.type AS type
             LIMIT 1`,
            { tenantId, canonical },
          );

          if (result.records.length > 0) {
            const record = result.records[0];
            return {
              graphId: record.get('graphId') as string,
              name: record.get('name') as string,
              type: record.get('type') as string,
              confidence: 0.95,
              method: 'alias',
            };
          }
        } finally {
          await session.close();
        }
      }
    }

    // Check graph-stored aliases
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (e:Entity {tenantId: $tenantId})
         WHERE toLower($value) IN [alias IN e.aliases | toLower(alias)]
         RETURN e.id AS graphId, e.name AS name, e.type AS type
         LIMIT 1`,
        { tenantId, value: entity.value },
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      return {
        graphId: record.get('graphId') as string,
        name: record.get('name') as string,
        type: record.get('type') as string,
        confidence: 0.9,
        method: 'alias',
      };
    } finally {
      await session.close();
    }
  }

  private async findFuzzyMatches(
    entity: OSINTEntity,
    tenantId: string,
    limit?: number,
  ): Promise<LinkCandidate[]> {
    const session = this.driver.session();
    try {
      // Use Levenshtein distance or trigram similarity
      const result = await session.run(
        `MATCH (e:Entity {tenantId: $tenantId})
         WHERE e.type = $entityType OR $entityType IS NULL
         WITH e, apoc.text.levenshteinSimilarity(toLower(e.name), toLower($value)) AS similarity
         WHERE similarity > 0.5
         RETURN e.id AS graphId, e.name AS name, e.type AS type, similarity
         ORDER BY similarity DESC
         LIMIT $limit`,
        {
          tenantId,
          value: entity.value,
          entityType: this.mapOSINTTypeToGraphType(entity.type),
          limit: neo4j.int(limit ?? this.config.maxCandidates),
        },
      );

      return result.records.map((record) => ({
        graphId: record.get('graphId') as string,
        name: record.get('name') as string,
        type: record.get('type') as string,
        confidence: record.get('similarity') as number,
        method: 'fuzzy',
      }));
    } catch {
      // APOC not available, fall back to basic matching
      return [];
    } finally {
      await session.close();
    }
  }

  private async findSemanticMatch(
    entity: OSINTEntity,
    tenantId: string,
    context: string,
  ): Promise<LinkCandidate | null> {
    // Generate embedding for entity + context
    const queryText = `${entity.type}: ${entity.value}. Context: ${context}`;
    const queryEmbedding = await this.embeddings.embed(queryText);

    const session = this.driver.session();
    try {
      // Find entities with embeddings and compute similarity
      const result = await session.run(
        `MATCH (e:Entity {tenantId: $tenantId})
         WHERE e.embedding IS NOT NULL
         WITH e, gds.similarity.cosine(e.embedding, $embedding) AS similarity
         WHERE similarity > $threshold
         RETURN e.id AS graphId, e.name AS name, e.type AS type, similarity
         ORDER BY similarity DESC
         LIMIT 1`,
        {
          tenantId,
          embedding: queryEmbedding.embedding,
          threshold: this.config.semanticMatchThreshold,
        },
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      return {
        graphId: record.get('graphId') as string,
        name: record.get('name') as string,
        type: record.get('type') as string,
        confidence: record.get('similarity') as number,
        method: 'semantic',
      };
    } catch {
      // GDS not available
      return null;
    } finally {
      await session.close();
    }
  }

  private async findByType(
    entity: OSINTEntity,
    tenantId: string,
    limit: number,
  ): Promise<LinkCandidate[]> {
    const graphType = this.mapOSINTTypeToGraphType(entity.type);
    if (!graphType) return [];

    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (e:Entity {tenantId: $tenantId, type: $type})
         RETURN e.id AS graphId, e.name AS name, e.type AS type
         LIMIT $limit`,
        { tenantId, type: graphType, limit: neo4j.int(limit) },
      );

      return result.records.map((record) => ({
        graphId: record.get('graphId') as string,
        name: record.get('name') as string,
        type: record.get('type') as string,
        confidence: 0.3, // Low confidence for type-only match
        method: 'type',
      }));
    } finally {
      await session.close();
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private createLinkedEntity(
    original: OSINTEntity,
    candidate: LinkCandidate,
    method: LinkedEntity['linkMethod'],
    alternatives?: LinkCandidate[],
  ): LinkedEntity {
    return {
      ...original,
      linkedGraphId: candidate.graphId,
      linkConfidence: candidate.confidence,
      linkMethod: method,
      graphEntityName: candidate.name,
      graphEntityType: candidate.type,
      alternatives,
    };
  }

  private mapOSINTTypeToGraphType(osintType: OSINTEntityType): string | null {
    const mapping: Record<OSINTEntityType, string | null> = {
      THREAT_ACTOR: 'ThreatActor',
      INFRASTRUCTURE: 'Infrastructure',
      MALWARE: 'Malware',
      CAMPAIGN: 'Campaign',
      TTP: 'TTP',
      INDICATOR: 'Indicator',
      VULNERABILITY: 'Vulnerability',
      NARRATIVE: 'Narrative',
    };

    return mapping[osintType] ?? null;
  }

  /**
   * Register additional aliases
   */
  registerAliases(canonical: string, aliases: string[]): void {
    const existing = this.aliasMap.get(canonical) ?? [];
    this.aliasMap.set(canonical, [...new Set([...existing, ...aliases])]);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createEntityLinker(config: EntityLinkerConfig): EntityLinker {
  return new EntityLinker(config);
}
