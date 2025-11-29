/**
 * STIX/TAXII IOC Fusion Service
 * Integrates threat intelligence feeds with knowledge graph for CTI/OSINT analysis
 *
 * Features:
 * - TAXII 2.1 client for feed ingestion
 * - IOC correlation with graph entities
 * - Threat scoring and confidence propagation
 * - Kill chain phase mapping
 * - MITRE ATT&CK integration
 */

import { Driver } from 'neo4j-driver';
import { createHash } from 'crypto';
import pino from 'pino';
import * as z from 'zod';
import {
  STIXObject,
  STIXObjectSchema,
  STIXObjectType,
  TAXIICollection,
  TAXIICollectionSchema,
  IOCCorrelation,
  GraphNode,
} from './types.js';

const logger = pino({ name: 'STIXTAXIIFusionService' });

// ============================================================================
// TAXII 2.1 Client Configuration
// ============================================================================

export interface TAXIIServerConfig {
  serverUrl: string;
  apiRoot: string;
  collectionId?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

const TAXIIEnvelopeSchema = z.object({
  more: z.boolean().optional(),
  next: z.string().optional(),
  objects: z.array(z.any()),
});

// ============================================================================
// Threat Scoring Configuration
// ============================================================================

interface ThreatScoringConfig {
  baseScores: Record<STIXObjectType, number>;
  confidenceWeight: number;
  recencyWeight: number;
  severityMultipliers: Record<string, number>;
  killChainWeights: Record<string, number>;
}

const DEFAULT_THREAT_SCORING: ThreatScoringConfig = {
  baseScores: {
    'indicator': 6,
    'malware': 8,
    'threat-actor': 9,
    'campaign': 7,
    'attack-pattern': 7,
    'course-of-action': 2,
    'identity': 3,
    'infrastructure': 6,
    'intrusion-set': 8,
    'location': 2,
    'tool': 5,
    'vulnerability': 7,
    'observed-data': 4,
    'report': 3,
    'grouping': 3,
    'note': 2,
    'opinion': 2,
    'relationship': 4,
    'sighting': 5,
  },
  confidenceWeight: 0.3,
  recencyWeight: 0.2,
  severityMultipliers: {
    'critical': 1.5,
    'high': 1.3,
    'medium': 1.0,
    'low': 0.7,
    'informational': 0.5,
  },
  killChainWeights: {
    'reconnaissance': 0.6,
    'weaponization': 0.7,
    'delivery': 0.8,
    'exploitation': 1.0,
    'installation': 0.9,
    'command-and-control': 1.0,
    'actions-on-objectives': 1.0,
    // MITRE ATT&CK phases
    'initial-access': 0.9,
    'execution': 0.9,
    'persistence': 0.8,
    'privilege-escalation': 0.9,
    'defense-evasion': 0.8,
    'credential-access': 0.9,
    'discovery': 0.6,
    'lateral-movement': 0.9,
    'collection': 0.8,
    'exfiltration': 1.0,
    'impact': 1.0,
  },
};

// ============================================================================
// STIX/TAXII Fusion Service
// ============================================================================

export class STIXTAXIIFusionService {
  private scoringConfig: ThreatScoringConfig;

  constructor(
    private driver: Driver,
    private taxiiConfig?: TAXIIServerConfig,
    scoringConfig?: Partial<ThreatScoringConfig>,
  ) {
    this.scoringConfig = { ...DEFAULT_THREAT_SCORING, ...scoringConfig };
  }

  // ==========================================================================
  // TAXII 2.1 Client Methods
  // ==========================================================================

  /**
   * Discover available collections from TAXII server
   */
  async discoverCollections(): Promise<TAXIICollection[]> {
    if (!this.taxiiConfig) {
      throw new Error('TAXII server not configured');
    }

    const url = `${this.taxiiConfig.serverUrl}${this.taxiiConfig.apiRoot}/collections/`;

    try {
      const response = await this.taxiiFetch(url);
      const data = await response.json();

      return (data.collections || []).map((c: any) =>
        TAXIICollectionSchema.parse(c),
      );
    } catch (error) {
      logger.error({ error }, 'Failed to discover TAXII collections');
      throw error;
    }
  }

  /**
   * Fetch STIX objects from a TAXII collection
   */
  async fetchCollection(
    collectionId?: string,
    options?: {
      addedAfter?: Date;
      limit?: number;
      match?: Record<string, string>;
    },
  ): Promise<STIXObject[]> {
    if (!this.taxiiConfig) {
      throw new Error('TAXII server not configured');
    }

    const collection = collectionId || this.taxiiConfig.collectionId;
    if (!collection) {
      throw new Error('Collection ID not specified');
    }

    let url = `${this.taxiiConfig.serverUrl}${this.taxiiConfig.apiRoot}/collections/${collection}/objects/`;
    const params = new URLSearchParams();

    if (options?.addedAfter) {
      params.append('added_after', options.addedAfter.toISOString());
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.match) {
      for (const [key, value] of Object.entries(options.match)) {
        params.append(`match[${key}]`, value);
      }
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const allObjects: STIXObject[] = [];
    let hasMore = true;
    let nextUrl = url;

    while (hasMore) {
      try {
        const response = await this.taxiiFetch(nextUrl);
        const data = await response.json();
        const envelope = TAXIIEnvelopeSchema.parse(data);

        for (const obj of envelope.objects) {
          try {
            allObjects.push(STIXObjectSchema.parse(obj));
          } catch (e) {
            logger.warn({ stixId: obj.id }, 'Invalid STIX object skipped');
          }
        }

        hasMore = envelope.more || false;
        if (hasMore && envelope.next) {
          nextUrl = envelope.next;
        } else {
          hasMore = false;
        }
      } catch (error) {
        logger.error({ error }, 'Failed to fetch TAXII collection');
        throw error;
      }
    }

    logger.info({
      collectionId: collection,
      objectCount: allObjects.length,
    }, 'Fetched STIX objects from TAXII');

    return allObjects;
  }

  /**
   * Make authenticated TAXII request
   */
  private async taxiiFetch(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept': 'application/taxii+json;version=2.1',
      'Content-Type': 'application/taxii+json;version=2.1',
    };

    if (this.taxiiConfig?.apiKey) {
      headers['Authorization'] = `Bearer ${this.taxiiConfig.apiKey}`;
    } else if (this.taxiiConfig?.username && this.taxiiConfig?.password) {
      const auth = Buffer.from(
        `${this.taxiiConfig.username}:${this.taxiiConfig.password}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.taxiiConfig?.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`TAXII request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  // ==========================================================================
  // IOC Ingestion and Graph Integration
  // ==========================================================================

  /**
   * Ingest STIX bundle and correlate with existing graph entities
   */
  async ingestAndCorrelate(
    stixObjects: STIXObject[],
    source: string,
    investigationId?: string,
  ): Promise<{
    ingested: number;
    correlations: IOCCorrelation[];
    threatScore: number;
  }> {
    const session = this.driver.session();
    try {
      const correlations: IOCCorrelation[] = [];
      let totalThreatScore = 0;
      let ingestedCount = 0;

      // Separate domain objects and relationships
      const domainObjects = stixObjects.filter(o => o.type !== 'relationship');
      const relationships = stixObjects.filter(o => o.type === 'relationship');

      // Ingest domain objects
      for (const obj of domainObjects) {
        const threatScore = this.calculateThreatScore(obj);
        totalThreatScore += threatScore;

        await this.upsertSTIXEntity(session, obj, source, investigationId, threatScore);
        ingestedCount++;

        // Correlate with existing entities
        const objCorrelations = await this.correlateWithGraph(
          session,
          obj,
          investigationId,
        );
        correlations.push(...objCorrelations);
      }

      // Ingest relationships
      for (const rel of relationships) {
        if (rel.source_ref && rel.target_ref) {
          await this.upsertSTIXRelationship(session, rel, source);
          ingestedCount++;
        }
      }

      // Propagate threat scores through graph
      if (correlations.length > 0) {
        await this.propagateThreatScores(session, correlations);
      }

      const avgThreatScore = domainObjects.length > 0
        ? totalThreatScore / domainObjects.length
        : 0;

      logger.info({
        source,
        ingested: ingestedCount,
        correlations: correlations.length,
        avgThreatScore,
      }, 'STIX bundle ingested and correlated');

      return {
        ingested: ingestedCount,
        correlations,
        threatScore: avgThreatScore,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Upsert a STIX entity into the graph
   */
  private async upsertSTIXEntity(
    session: any,
    obj: STIXObject,
    source: string,
    investigationId: string | undefined,
    threatScore: number,
  ): Promise<void> {
    const labels = this.getEntityLabels(obj.type);
    const labelStr = labels.join(':');

    await session.run(`
      MERGE (e:Entity:${labelStr} {stixId: $stixId})
      ON CREATE SET
        e.id = $id,
        e.name = $name,
        e.type = $type,
        e.label = $name,
        e.description = $description,
        e.pattern = $pattern,
        e.patternType = $patternType,
        e.validFrom = $validFrom,
        e.validUntil = $validUntil,
        e.confidence = $confidence,
        e.threatScore = $threatScore,
        e.killChainPhases = $killChainPhases,
        e.labels = $stixLabels,
        e.source = $source,
        e.investigationId = $investigationId,
        e.createdAt = datetime($created),
        e.properties = $properties
      ON MATCH SET
        e.modifiedAt = datetime($modified),
        e.threatScore = CASE WHEN $threatScore > e.threatScore THEN $threatScore ELSE e.threatScore END,
        e.confidence = CASE WHEN $confidence > e.confidence THEN $confidence ELSE e.confidence END
    `, {
      stixId: obj.id,
      id: createHash('sha256').update(obj.id).digest('hex').substring(0, 16),
      name: obj.name || obj.pattern || obj.id,
      type: obj.type.replace('-', '_'),
      description: obj.description || '',
      pattern: obj.pattern || '',
      patternType: obj.pattern_type || '',
      validFrom: obj.valid_from || '',
      validUntil: obj.valid_until || '',
      confidence: (obj.confidence || 50) / 100,
      threatScore,
      killChainPhases: JSON.stringify(obj.kill_chain_phases || []),
      stixLabels: obj.labels || [],
      source,
      investigationId: investigationId || '',
      created: obj.created,
      modified: obj.modified,
      properties: JSON.stringify({
        external_references: obj.external_references,
        spec_version: obj.spec_version,
      }),
    });
  }

  /**
   * Upsert a STIX relationship into the graph
   */
  private async upsertSTIXRelationship(
    session: any,
    rel: STIXObject,
    source: string,
  ): Promise<void> {
    const relType = (rel.relationship_type || 'related-to')
      .toUpperCase()
      .replace(/-/g, '_');

    await session.run(`
      MATCH (a:Entity {stixId: $sourceRef}), (b:Entity {stixId: $targetRef})
      MERGE (a)-[r:${relType} {stixId: $stixId}]->(b)
      ON CREATE SET
        r.id = $id,
        r.type = $relType,
        r.source = $source,
        r.createdAt = datetime($created),
        r.confidence = 1.0
      ON MATCH SET
        r.modifiedAt = datetime($modified)
    `, {
      stixId: rel.id,
      id: createHash('sha256').update(rel.id).digest('hex').substring(0, 16),
      sourceRef: rel.source_ref,
      targetRef: rel.target_ref,
      relType: rel.relationship_type || 'related-to',
      source,
      created: rel.created,
      modified: rel.modified,
    });
  }

  /**
   * Correlate STIX object with existing graph entities
   */
  private async correlateWithGraph(
    session: any,
    obj: STIXObject,
    investigationId?: string,
  ): Promise<IOCCorrelation[]> {
    const correlations: IOCCorrelation[] = [];

    // Build search terms from STIX object
    const searchTerms = this.extractSearchTerms(obj);

    if (searchTerms.length === 0) {
      return correlations;
    }

    // Search for matching entities
    const result = await session.run(`
      MATCH (e:Entity)
      WHERE e.stixId IS NULL
        ${investigationId ? 'AND e.investigationId = $investigationId' : ''}
        AND (
          ANY(term IN $searchTerms WHERE
            toLower(e.name) CONTAINS toLower(term) OR
            toLower(e.label) CONTAINS toLower(term) OR
            toLower(e.description) CONTAINS toLower(term)
          )
        )
      RETURN e.id as nodeId, e.name as name, e.type as type,
             e.label as label, e.description as description
      LIMIT 20
    `, {
      investigationId,
      searchTerms,
    });

    for (const record of result.records) {
      const nodeId = record.get('nodeId');
      const nodeName = record.get('name') || '';
      const nodeLabel = record.get('label') || '';
      const nodeDesc = record.get('description') || '';

      // Calculate correlation confidence
      const matchedFields: string[] = [];
      let matchScore = 0;

      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        if (nodeName.toLowerCase().includes(termLower)) {
          matchedFields.push('name');
          matchScore += 0.4;
        }
        if (nodeLabel.toLowerCase().includes(termLower)) {
          matchedFields.push('label');
          matchScore += 0.3;
        }
        if (nodeDesc.toLowerCase().includes(termLower)) {
          matchedFields.push('description');
          matchScore += 0.2;
        }
      }

      if (matchScore > 0) {
        const correlation: IOCCorrelation = {
          stixId: obj.id,
          graphNodeId: nodeId,
          correlationType: matchScore >= 0.5 ? 'exact' : matchScore >= 0.3 ? 'partial' : 'semantic',
          confidence: Math.min(matchScore, 1.0),
          matchedFields: [...new Set(matchedFields)],
          threatScore: this.calculateThreatScore(obj),
        };

        correlations.push(correlation);

        // Create IOC_CORRELATES relationship
        await session.run(`
          MATCH (stix:Entity {stixId: $stixId}), (target:Entity {id: $nodeId})
          MERGE (stix)-[r:IOC_CORRELATES]->(target)
          SET r.correlationType = $correlationType,
              r.confidence = $confidence,
              r.matchedFields = $matchedFields,
              r.threatScore = $threatScore,
              r.createdAt = datetime()
        `, {
          stixId: obj.id,
          nodeId,
          correlationType: correlation.correlationType,
          confidence: correlation.confidence,
          matchedFields: correlation.matchedFields,
          threatScore: correlation.threatScore,
        });
      }
    }

    return correlations;
  }

  /**
   * Propagate threat scores through connected entities
   */
  private async propagateThreatScores(
    session: any,
    correlations: IOCCorrelation[],
  ): Promise<void> {
    const decay = 0.7; // Threat score decay per hop
    const maxHops = 3;

    for (const correlation of correlations) {
      await session.run(`
        MATCH (start:Entity {id: $nodeId})
        CALL apoc.path.subgraphNodes(start, {
          maxLevel: $maxHops,
          relationshipFilter: 'RELATED_TO>|RELATIONSHIP>',
          labelFilter: 'Entity'
        }) YIELD node
        WITH node, length(shortestPath((start)-[*]-(node))) as distance
        WHERE distance > 0
        SET node.propagatedThreatScore = COALESCE(node.propagatedThreatScore, 0) +
            ($threatScore * power($decay, distance))
      `, {
        nodeId: correlation.graphNodeId,
        threatScore: correlation.threatScore,
        decay,
        maxHops,
      });
    }
  }

  // ==========================================================================
  // Threat Scoring
  // ==========================================================================

  /**
   * Calculate threat score for a STIX object
   */
  calculateThreatScore(obj: STIXObject): number {
    let score = this.scoringConfig.baseScores[obj.type] || 5;

    // Apply confidence weight
    if (obj.confidence) {
      const confidenceMultiplier = 0.5 + (obj.confidence / 100) * 0.5;
      score *= 1 + (confidenceMultiplier - 1) * this.scoringConfig.confidenceWeight;
    }

    // Apply recency weight
    if (obj.modified) {
      const daysSinceModified = (Date.now() - new Date(obj.modified).getTime()) / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.exp(-daysSinceModified / 365);
      score *= 1 + (recencyMultiplier - 1) * this.scoringConfig.recencyWeight;
    }

    // Apply kill chain phase weights
    if (obj.kill_chain_phases) {
      let maxPhaseWeight = 0;
      for (const phase of obj.kill_chain_phases) {
        const weight = this.scoringConfig.killChainWeights[phase.phase_name] || 0.5;
        maxPhaseWeight = Math.max(maxPhaseWeight, weight);
      }
      score *= maxPhaseWeight;
    }

    // Apply severity from labels
    if (obj.labels) {
      for (const label of obj.labels) {
        const multiplier = this.scoringConfig.severityMultipliers[label.toLowerCase()];
        if (multiplier) {
          score *= multiplier;
          break;
        }
      }
    }

    return Math.min(Math.max(score, 0), 10);
  }

  // ==========================================================================
  // Query Methods for RAG Integration
  // ==========================================================================

  /**
   * Get threat context for entities in an investigation
   */
  async getThreatContext(
    investigationId: string,
    entityIds?: string[],
  ): Promise<{
    relatedIOCs: STIXObject[];
    threatActors: STIXObject[];
    campaigns: STIXObject[];
    overallThreatScore: number;
  }> {
    const session = this.driver.session();
    try {
      const whereClause = entityIds?.length
        ? 'WHERE e.id IN $entityIds'
        : 'WHERE e.investigationId = $investigationId';

      // Get IOC correlations
      const iocResult = await session.run(`
        MATCH (e:Entity)
        ${whereClause}
        MATCH (e)<-[:IOC_CORRELATES]-(ioc:Entity:Indicator)
        RETURN DISTINCT ioc.stixId as stixId, ioc.name as name,
               ioc.pattern as pattern, ioc.threatScore as threatScore,
               ioc.type as type, properties(ioc) as props
        ORDER BY ioc.threatScore DESC
        LIMIT 20
      `, { investigationId, entityIds });

      // Get related threat actors
      const actorResult = await session.run(`
        MATCH (e:Entity)
        ${whereClause}
        MATCH (e)<-[:IOC_CORRELATES]-()-[:ATTRIBUTED_TO|USES*1..3]->(actor:Entity)
        WHERE actor.type IN ['threat_actor', 'intrusion_set']
        RETURN DISTINCT actor.stixId as stixId, actor.name as name,
               actor.description as description, actor.threatScore as threatScore,
               actor.type as type, properties(actor) as props
        ORDER BY actor.threatScore DESC
        LIMIT 10
      `, { investigationId, entityIds });

      // Get related campaigns
      const campaignResult = await session.run(`
        MATCH (e:Entity)
        ${whereClause}
        MATCH (e)<-[:IOC_CORRELATES]-()-[:ATTRIBUTED_TO|USES|TARGETS*1..3]->(campaign:Entity)
        WHERE campaign.type = 'campaign'
        RETURN DISTINCT campaign.stixId as stixId, campaign.name as name,
               campaign.description as description, campaign.threatScore as threatScore,
               campaign.type as type, properties(campaign) as props
        ORDER BY campaign.threatScore DESC
        LIMIT 10
      `, { investigationId, entityIds });

      // Calculate overall threat score
      const scoreResult = await session.run(`
        MATCH (e:Entity)
        ${whereClause}
        WITH COALESCE(e.threatScore, 0) + COALESCE(e.propagatedThreatScore, 0) as score
        RETURN AVG(score) as avgScore, MAX(score) as maxScore
      `, { investigationId, entityIds });

      const avgScore = scoreResult.records[0]?.get('avgScore') || 0;
      const maxScore = scoreResult.records[0]?.get('maxScore') || 0;

      return {
        relatedIOCs: this.recordsToSTIXObjects(iocResult.records),
        threatActors: this.recordsToSTIXObjects(actorResult.records),
        campaigns: this.recordsToSTIXObjects(campaignResult.records),
        overallThreatScore: (avgScore + maxScore) / 2,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get kill chain coverage for an investigation
   */
  async getKillChainCoverage(investigationId: string): Promise<Map<string, number>> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (e:Entity {investigationId: $investigationId})
        WHERE e.killChainPhases IS NOT NULL
        UNWIND apoc.convert.fromJsonList(e.killChainPhases) as phase
        RETURN phase.phase_name as phaseName, COUNT(*) as count
        ORDER BY count DESC
      `, { investigationId });

      const coverage = new Map<string, number>();
      for (const record of result.records) {
        coverage.set(record.get('phaseName'), record.get('count').toNumber());
      }

      return coverage;
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get appropriate Neo4j labels for STIX type
   */
  private getEntityLabels(stixType: STIXObjectType | string): string[] {
    const baseLabels = ['Entity', 'STIX'];

    const typeLabels: Record<string, string[]> = {
      'indicator': ['Indicator', 'IOC'],
      'malware': ['Malware', 'ThreatObject'],
      'threat-actor': ['ThreatActor', 'Actor'],
      'campaign': ['Campaign'],
      'attack-pattern': ['AttackPattern', 'TTP'],
      'course-of-action': ['Mitigation', 'CourseOfAction'],
      'infrastructure': ['Infrastructure'],
      'intrusion-set': ['IntrusionSet', 'APT'],
      'tool': ['Tool'],
      'vulnerability': ['Vulnerability', 'CVE'],
    };

    return [...baseLabels, ...(typeLabels[stixType] || [])];
  }

  /**
   * Extract search terms from STIX object
   */
  private extractSearchTerms(obj: STIXObject): string[] {
    const terms: string[] = [];

    if (obj.name) {
      terms.push(obj.name);
      // Split on common separators
      terms.push(...obj.name.split(/[\s\-_]+/).filter(t => t.length > 2));
    }

    if (obj.pattern) {
      // Extract values from STIX patterns
      const patternMatches = obj.pattern.match(/['"](.*?)['"]/g);
      if (patternMatches) {
        terms.push(...patternMatches.map(m => m.replace(/['"]/g, '')));
      }
    }

    if (obj.external_references) {
      for (const ref of obj.external_references) {
        if (ref.external_id) {
          terms.push(ref.external_id);
        }
      }
    }

    return [...new Set(terms.filter(t => t.length > 2))];
  }

  /**
   * Convert Neo4j records to STIX objects
   */
  private recordsToSTIXObjects(records: any[]): STIXObject[] {
    return records.map(record => {
      const props = record.get('props') || {};
      return {
        type: record.get('type') || 'indicator',
        id: record.get('stixId'),
        spec_version: '2.1',
        created: props.createdAt || new Date().toISOString(),
        modified: props.modifiedAt || new Date().toISOString(),
        name: record.get('name'),
        description: record.get('description'),
        pattern: record.get('pattern'),
      } as STIXObject;
    });
  }
}
