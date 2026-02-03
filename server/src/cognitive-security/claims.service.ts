/**
 * Claims Service
 *
 * Manages the Claim Graph - the core data model for cognitive security operations.
 * Handles claim extraction, canonicalization, evidence linking, and verdict management.
 *
 * Graph Model:
 * Claims → Evidence → Narratives → Actors → Channels → Audiences → Time
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import type { Driver, Session } from 'neo4j-driver';

import type {
  Claim,
  ClaimVerdict,
  ClaimSource,
  ClaimEntity,
  Evidence,
  EvidenceType,
  Narrative,
  NarrativeStatus,
  Actor,
  Channel,
  AudienceSegment,
  ContentCredential,
} from './types.js';
import { createClaim, createEvidence, createNarrative } from './types.js';

const logger = (pino as any)({ name: 'claims-service' });

// ============================================================================
// Configuration
// ============================================================================

export interface ClaimsServiceConfig {
  /** Neo4j driver */
  neo4jDriver: Driver;
  /** Embedding service for semantic search */
  embeddingService?: EmbeddingService;
  /** NLP service for entity extraction */
  nlpService?: NLPService;
  /** Default language */
  defaultLanguage?: string;
}

interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  similarity(a: number[], b: number[]): number;
}

interface NLPService {
  extractEntities(text: string, language?: string): Promise<ClaimEntity[]>;
  detectLanguage(text: string): Promise<string>;
  canonicalize(text: string, language?: string): Promise<string>;
}

// ============================================================================
// Claims Service
// ============================================================================

export class ClaimsService {
  private readonly config: ClaimsServiceConfig;

  constructor(config: ClaimsServiceConfig) {
    this.config = config;
    logger.info('Claims service initialized');
  }

  private getSession(): Session {
    return this.config.neo4jDriver.session();
  }

  // ==========================================================================
  // Claim Operations
  // ==========================================================================

  /**
   * Extract and create a claim from raw text
   */
  async extractClaim(
    text: string,
    sourceType: ClaimSource,
    sourceUrl?: string,
    actorId?: string,
    channelId?: string,
  ): Promise<Claim> {
    // Detect language
    const language = this.config.nlpService
      ? await this.config.nlpService.detectLanguage(text)
      : this.config.defaultLanguage || 'en';

    // Canonicalize text
    const canonicalText = this.config.nlpService
      ? await this.config.nlpService.canonicalize(text, language)
      : text.trim().toLowerCase();

    // Create base claim
    const claim = createClaim(canonicalText, sourceType, language);
    claim.originalText = text;
    claim.sourceUrl = sourceUrl;

    // Extract entities
    if (this.config.nlpService) {
      claim.entities = await this.config.nlpService.extractEntities(text, language);
    }

    // Generate embedding for semantic search
    if (this.config.embeddingService) {
      claim.embedding = await this.config.embeddingService.embed(canonicalText);
    }

    // Link to actor and channel if provided
    if (actorId) claim.actorIds.push(actorId);
    if (channelId) claim.channelIds.push(channelId);

    // Persist to Neo4j
    await this.persistClaim(claim);

    logger.info({ claimId: claim.id, sourceType }, 'Extracted claim');

    return claim;
  }

  /**
   * Find similar claims (deduplication)
   */
  async findSimilarClaims(
    claim: Claim,
    threshold = 0.85,
  ): Promise<Array<{ claim: Claim; similarity: number }>> {
    if (!claim.embedding || !this.config.embeddingService) {
      // Fallback to text-based similarity
      return this.findSimilarClaimsByText(claim.canonicalText, threshold);
    }

    const session = this.getSession();
    try {
      // Use vector similarity search
      const result = await session.run(
        `
        MATCH (c:CogSecClaim)
        WHERE c.id <> $claimId
        WITH c, gds.similarity.cosine(c.embedding, $embedding) AS similarity
        WHERE similarity >= $threshold
        RETURN c, similarity
        ORDER BY similarity DESC
        LIMIT 10
        `,
        {
          claimId: claim.id,
          embedding: claim.embedding,
          threshold,
        },
      );

      return result.records.map((r: any) => ({
        claim: this.recordToClaim(r.get('c')),
        similarity: r.get('similarity'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Find similar claims by text (fallback)
   */
  private async findSimilarClaimsByText(
    text: string,
    threshold: number,
  ): Promise<Array<{ claim: Claim; similarity: number }>> {
    const session = this.getSession();
    try {
      // Use Levenshtein distance for text similarity
      const result = await session.run(
        `
        MATCH (c:CogSecClaim)
        WITH c,
             1.0 - (toFloat(apoc.text.levenshteinDistance(c.canonicalText, $text)) /
                    toFloat(size(c.canonicalText) + size($text))) AS similarity
        WHERE similarity >= $threshold
        RETURN c, similarity
        ORDER BY similarity DESC
        LIMIT 10
        `,
        { text, threshold },
      );

      return result.records.map((r: any) => ({
        claim: this.recordToClaim(r.get('c')),
        similarity: r.get('similarity'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Update claim verdict
   */
  async updateVerdict(
    claimId: string,
    verdict: ClaimVerdict,
    confidence: number,
    evidenceIds: string[],
    verifierId?: string,
  ): Promise<Claim> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (c:CogSecClaim {id: $claimId})
        SET c.verdict = $verdict,
            c.verdictConfidence = $confidence,
            c.evidenceIds = $evidenceIds,
            c.updatedAt = datetime()
        WITH c
        UNWIND $evidenceIds AS evidenceId
        MATCH (e:CogSecEvidence {id: evidenceId})
        MERGE (c)-[:SUPPORTED_BY]->(e)
        RETURN c
        `,
        { claimId, verdict, confidence, evidenceIds },
      );

      if (result.records.length === 0) {
        throw new Error(`Claim not found: ${claimId}`);
      }

      const claim = this.recordToClaim(result.records[0].get('c'));

      logger.info(
        { claimId, verdict, confidence, verifierId },
        'Updated claim verdict',
      );

      return claim;
    } finally {
      await session.close();
    }
  }

  /**
   * Link claims as related
   */
  async linkRelatedClaims(
    claimId1: string,
    claimId2: string,
    relationType: 'SIMILAR' | 'CONTRADICTS' | 'SUPPORTS' | 'REFUTES',
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (c1:CogSecClaim {id: $claimId1})
        MATCH (c2:CogSecClaim {id: $claimId2})
        MERGE (c1)-[r:RELATED_TO {type: $relationType}]->(c2)
        SET c1.relatedClaimIds = coalesce(c1.relatedClaimIds, []) + $claimId2,
            c2.relatedClaimIds = coalesce(c2.relatedClaimIds, []) + $claimId1
        `,
        { claimId1, claimId2, relationType },
      );

      logger.debug({ claimId1, claimId2, relationType }, 'Linked related claims');
    } finally {
      await session.close();
    }
  }

  /**
   * Get claim by ID
   */
  async getClaim(claimId: string): Promise<Claim | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (c:CogSecClaim {id: $claimId}) RETURN c',
        { claimId },
      );

      if (result.records.length === 0) {
        return null;
      }

      return this.recordToClaim(result.records[0].get('c'));
    } finally {
      await session.close();
    }
  }

  /**
   * Get actor by ID
   */
  async getActor(actorId: string): Promise<Actor | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (a:CogSecActor {id: $actorId}) RETURN a',
        { actorId },
      );

      if (result.records.length === 0) {
        return null;
      }

      return this.recordToActor(result.records[0].get('a'));
    } finally {
      await session.close();
    }
  }

  /**
   * Get narrative by ID
   */
  async getNarrative(narrativeId: string): Promise<Narrative | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (n:CogSecNarrative {id: $narrativeId}) RETURN n',
        { narrativeId },
      );

      if (result.records.length === 0) {
        return null;
      }

      return this.recordToNarrative(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (ch:CogSecChannel {id: $channelId}) RETURN ch',
        { channelId },
      );

      if (result.records.length === 0) {
        return null;
      }

      return this.recordToChannel(result.records[0].get('ch'));
    } finally {
      await session.close();
    }
  }

  /**
   * Search claims by text
   */
  async searchClaims(
    query: string,
    filters?: {
      verdict?: ClaimVerdict;
      sourceType?: ClaimSource;
      dateFrom?: string;
      dateTo?: string;
      narrativeId?: string;
    },
    limit = 20,
  ): Promise<Claim[]> {
    const session = this.getSession();
    try {
      let cypher = `
        MATCH (c:CogSecClaim)
        WHERE c.canonicalText CONTAINS $query
      `;

      const params: Record<string, unknown> = { query, limit };

      if (filters?.verdict) {
        cypher += ' AND c.verdict = $verdict';
        params.verdict = filters.verdict;
      }

      if (filters?.sourceType) {
        cypher += ' AND c.sourceType = $sourceType';
        params.sourceType = filters.sourceType;
      }

      if (filters?.dateFrom) {
        cypher += ' AND c.firstObservedAt >= datetime($dateFrom)';
        params.dateFrom = filters.dateFrom;
      }

      if (filters?.dateTo) {
        cypher += ' AND c.lastObservedAt <= datetime($dateTo)';
        params.dateTo = filters.dateTo;
      }

      if (filters?.narrativeId) {
        cypher += ' AND $narrativeId IN c.narrativeIds';
        params.narrativeId = filters.narrativeId;
      }

      cypher += ' RETURN c ORDER BY c.lastObservedAt DESC LIMIT $limit';

      const result = await session.run(cypher, params);
      return result.records.map((r: any) => this.recordToClaim(r.get('c')));
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Evidence Operations
  // ==========================================================================

  /**
   * Create evidence
   */
  async createEvidence(
    type: EvidenceType,
    title: string,
    content: string,
    options?: {
      sourceUrl?: string;
      sourceCredibility?: number;
      contentCredentialId?: string;
      claimIds?: string[];
      supportsVerdict?: ClaimVerdict;
    },
  ): Promise<Evidence> {
    const evidence = createEvidence(type, title, content);

    if (options?.sourceUrl) evidence.sourceUrl = options.sourceUrl;
    if (options?.sourceCredibility) evidence.sourceCredibility = options.sourceCredibility;
    if (options?.contentCredentialId) evidence.contentCredentialId = options.contentCredentialId;
    if (options?.claimIds) evidence.claimIds = options.claimIds;
    if (options?.supportsVerdict) evidence.supportsVerdict = options.supportsVerdict;

    await this.persistEvidence(evidence);

    // Link to claims
    if (evidence.claimIds.length > 0) {
      await this.linkEvidenceToClaims(evidence.id, evidence.claimIds);
    }

    logger.info({ evidenceId: evidence.id, type }, 'Created evidence');

    return evidence;
  }

  /**
   * Link evidence to claims
   */
  async linkEvidenceToClaims(
    evidenceId: string,
    claimIds: string[],
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (e:CogSecEvidence {id: $evidenceId})
        UNWIND $claimIds AS claimId
        MATCH (c:CogSecClaim {id: claimId})
        MERGE (c)-[:SUPPORTED_BY]->(e)
        SET c.evidenceIds = coalesce(c.evidenceIds, []) + $evidenceId
        `,
        { evidenceId, claimIds },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Verify evidence
   */
  async verifyEvidence(
    evidenceId: string,
    verifierId: string,
    notes?: string,
  ): Promise<Evidence> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (e:CogSecEvidence {id: $evidenceId})
        SET e.verified = true,
            e.verifiedBy = $verifierId,
            e.verifiedAt = datetime(),
            e.verificationNotes = $notes
        RETURN e
        `,
        { evidenceId, verifierId, notes },
      );

      if (result.records.length === 0) {
        throw new Error(`Evidence not found: ${evidenceId}`);
      }

      return this.recordToEvidence(result.records[0].get('e'));
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Narrative Operations
  // ==========================================================================

  /**
   * Create narrative
   */
  async createNarrative(
    name: string,
    description: string,
    claimIds: string[],
    keywords: string[] = [],
  ): Promise<Narrative> {
    const narrative = createNarrative(name, description);
    narrative.claimIds = claimIds;
    narrative.keywords = keywords;

    await this.persistNarrative(narrative);

    // Link claims to narrative
    if (claimIds.length > 0) {
      await this.linkClaimsToNarrative(claimIds, narrative.id);
    }

    logger.info({ narrativeId: narrative.id, name }, 'Created narrative');

    return narrative;
  }

  /**
   * Link claims to narrative
   */
  async linkClaimsToNarrative(
    claimIds: string[],
    narrativeId: string,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (n:CogSecNarrative {id: $narrativeId})
        UNWIND $claimIds AS claimId
        MATCH (c:CogSecClaim {id: claimId})
        MERGE (c)-[:PART_OF]->(n)
        SET c.narrativeIds = coalesce(c.narrativeIds, []) + $narrativeId,
            n.claimIds = coalesce(n.claimIds, []) + claimId
        `,
        { narrativeId, claimIds },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Update narrative status
   */
  async updateNarrativeStatus(
    narrativeId: string,
    status: NarrativeStatus,
  ): Promise<Narrative> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (n:CogSecNarrative {id: $narrativeId})
        SET n.status = $status,
            n.updatedAt = datetime()
        RETURN n
        `,
        { narrativeId, status },
      );

      if (result.records.length === 0) {
        throw new Error(`Narrative not found: ${narrativeId}`);
      }

      return this.recordToNarrative(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  /**
   * Detect conflicting narratives based on contradicting claims
   */
  async detectNarrativeConflicts(narrativeId: string): Promise<Array<{
    competingNarrativeId: string;
    conflictScore: number;
    contradictingClaimPairs: Array<[string, string]>;
  }>> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (n:CogSecNarrative {id: $narrativeId})<-[:PART_OF]-(c1:CogSecClaim)
        MATCH (c1)-[:RELATED_TO {type: 'CONTRADICTS'}]->(c2:CogSecClaim)
        MATCH (c2)-[:PART_OF]->(n2:CogSecNarrative)
        WHERE n2.id <> n.id
        RETURN n2.id AS competingNarrativeId,
               count(DISTINCT c1) AS conflictCount,
               collect([c1.id, c2.id]) AS pairs
        ORDER BY conflictCount DESC
        LIMIT 5
        `,
        { narrativeId },
      );

      return result.records.map((r: any) => ({
        competingNarrativeId: r.get('competingNarrativeId'),
        conflictScore: r.get('conflictCount').toNumber() / 10.0,
        contradictingClaimPairs: r.get('pairs'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Detect narrative mutations/forks
   */
  async detectNarrativeForks(narrativeId: string): Promise<Narrative[]> {
    const session = this.getSession();
    try {
      // Find claims that diverge from the narrative pattern
      const result = await session.run(
        `
        MATCH (n:CogSecNarrative {id: $narrativeId})<-[:PART_OF]-(c:CogSecClaim)
        WITH n, collect(c) AS claims
        MATCH (c2:CogSecClaim)-[:RELATED_TO {type: 'CONTRADICTS'}]->(c:CogSecClaim)
        WHERE c IN claims AND NOT (c2)-[:PART_OF]->(n)
        WITH n, collect(DISTINCT c2) AS divergentClaims
        WHERE size(divergentClaims) >= 3
        RETURN divergentClaims
        `,
        { narrativeId },
      );

      // Group divergent claims into potential new narratives
      const forks: Narrative[] = [];
      for (const record of result.records) {
        const divergentClaims = record.get('divergentClaims') as any[];
        if (divergentClaims.length >= 3) {
          const fork = createNarrative(
            `Fork of ${narrativeId}`,
            'Detected narrative mutation',
          );
          fork.parentNarrativeId = narrativeId;
          fork.status = 'MUTATING';
          fork.claimIds = divergentClaims.map((c) => c.properties.id);
          forks.push(fork);
        }
      }

      return forks;
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Actor Operations
  // ==========================================================================

  /**
   * Create or get actor
   */
  async upsertActor(
    name: string,
    platform: string,
    platformAccountId: string,
    username: string,
  ): Promise<Actor> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MERGE (a:CogSecActor {platformAccountId: $platformAccountId, platform: $platform})
        ON CREATE SET
          a.id = $id,
          a.name = $name,
          a.type = 'UNKNOWN',
          a.credibilityScore = 0.5,
          a.influenceScore = 0,
          a.coordinationScore = 0,
          a.claimIds = [],
          a.narrativeIds = [],
          a.affiliations = [],
          a.firstActivityAt = datetime(),
          a.lastActivityAt = datetime(),
          a.createdAt = datetime(),
          a.metadata = {}
        ON MATCH SET
          a.lastActivityAt = datetime()
        WITH a
        MERGE (acc:CogSecActorAccount {platformAccountId: $platformAccountId})
        ON CREATE SET
          acc.platform = $platform,
          acc.username = $username,
          acc.isVerified = false,
          acc.lastObservedAt = datetime()
        ON MATCH SET
          acc.lastObservedAt = datetime()
        MERGE (a)-[:HAS_ACCOUNT]->(acc)
        RETURN a
        `,
        {
          id: randomUUID(),
          name,
          platform,
          platformAccountId,
          username,
        },
      );

      return this.recordToActor(result.records[0].get('a'));
    } finally {
      await session.close();
    }
  }

  /**
   * Link actor to claim
   */
  async linkActorToClaim(actorId: string, claimId: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (a:CogSecActor {id: $actorId})
        MATCH (c:CogSecClaim {id: $claimId})
        MERGE (a)-[:MADE_CLAIM]->(c)
        SET a.claimIds = coalesce(a.claimIds, []) + $claimId,
            c.actorIds = coalesce(c.actorIds, []) + $actorId
        `,
        { actorId, claimId },
      );
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Channel Operations
  // ==========================================================================

  /**
   * Create or get channel
   */
  async upsertChannel(
    name: string,
    platform: string,
    channelType: string,
    url?: string,
  ): Promise<Channel> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MERGE (ch:CogSecChannel {name: $name, platform: $platform})
        ON CREATE SET
          ch.id = $id,
          ch.type = $channelType,
          ch.url = $url,
          ch.credibilityScore = 0.5,
          ch.claimIds = [],
          ch.narrativeIds = [],
          ch.actorIds = [],
          ch.isLaunderingNode = false,
          ch.createdAt = datetime(),
          ch.metadata = {}
        RETURN ch
        `,
        {
          id: randomUUID(),
          name,
          platform,
          channelType,
          url,
        },
      );

      return this.recordToChannel(result.records[0].get('ch'));
    } finally {
      await session.close();
    }
  }

  /**
   * Link channel to claim
   */
  async linkChannelToClaim(channelId: string, claimId: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (ch:CogSecChannel {id: $channelId})
        MATCH (c:CogSecClaim {id: $claimId})
        MERGE (c)-[:APPEARED_IN]->(ch)
        SET ch.claimIds = coalesce(ch.claimIds, []) + $claimId,
            c.channelIds = coalesce(c.channelIds, []) + $channelId
        `,
        { channelId, claimId },
      );
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Graph Queries
  // ==========================================================================

  /**
   * Get full claim graph for a narrative
   */
  async getNarrativeGraph(narrativeId: string): Promise<{
    narrative: Narrative;
    claims: Claim[];
    evidence: Evidence[];
    actors: Actor[];
    channels: Channel[];
  }> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (n:CogSecNarrative {id: $narrativeId})
        OPTIONAL MATCH (c:CogSecClaim)-[:PART_OF]->(n)
        OPTIONAL MATCH (c)-[:SUPPORTED_BY]->(e:CogSecEvidence)
        OPTIONAL MATCH (a:CogSecActor)-[:MADE_CLAIM]->(c)
        OPTIONAL MATCH (c)-[:APPEARED_IN]->(ch:CogSecChannel)
        RETURN n,
               collect(DISTINCT c) AS claims,
               collect(DISTINCT e) AS evidence,
               collect(DISTINCT a) AS actors,
               collect(DISTINCT ch) AS channels
        `,
        { narrativeId },
      );

      if (result.records.length === 0) {
        throw new Error(`Narrative not found: ${narrativeId}`);
      }

      const record = result.records[0];
      return {
        narrative: this.recordToNarrative(record.get('n')),
        claims: (record.get('claims') as any[])
          .filter((c) => c)
          .map((c) => this.recordToClaim(c)),
        evidence: (record.get('evidence') as any[])
          .filter((e) => e)
          .map((e) => this.recordToEvidence(e)),
        actors: (record.get('actors') as any[])
          .filter((a) => a)
          .map((a) => this.recordToActor(a)),
        channels: (record.get('channels') as any[])
          .filter((ch) => ch)
          .map((ch) => this.recordToChannel(ch)),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get claim propagation path
   */
  async getClaimPropagationPath(
    claimId: string,
  ): Promise<Array<{ channel: Channel; timestamp: string }>> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (c:CogSecClaim {id: $claimId})-[r:APPEARED_IN]->(ch:CogSecChannel)
        RETURN ch, r.timestamp AS timestamp
        ORDER BY r.timestamp ASC
        `,
        { claimId },
      );

      return result.records.map((r: any) => ({
        channel: this.recordToChannel(r.get('ch')),
        timestamp: r.get('timestamp'),
      }));
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Persistence Helpers
  // ==========================================================================

  private async persistClaim(claim: Claim): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (c:CogSecClaim {
          id: $id,
          canonicalText: $canonicalText,
          originalText: $originalText,
          language: $language,
          sourceType: $sourceType,
          sourceUrl: $sourceUrl,
          firstObservedAt: datetime($firstObservedAt),
          lastObservedAt: datetime($lastObservedAt),
          verdict: $verdict,
          verdictConfidence: $verdictConfidence,
          evidenceIds: $evidenceIds,
          relatedClaimIds: $relatedClaimIds,
          narrativeIds: $narrativeIds,
          actorIds: $actorIds,
          channelIds: $channelIds,
          embedding: $embedding,
          entities: $entities,
          metadata: $metadata,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        `,
        {
          ...claim,
          entities: JSON.stringify(claim.entities),
          metadata: JSON.stringify(claim.metadata),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async persistEvidence(evidence: Evidence): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (e:CogSecEvidence {
          id: $id,
          type: $type,
          title: $title,
          content: $content,
          sourceUrl: $sourceUrl,
          sourceCredibility: $sourceCredibility,
          contentCredentialId: $contentCredentialId,
          claimIds: $claimIds,
          supportsVerdict: $supportsVerdict,
          verified: $verified,
          verifiedBy: $verifiedBy,
          verifiedAt: $verifiedAt,
          verificationNotes: $verificationNotes,
          capturedAt: datetime($capturedAt),
          createdAt: datetime($createdAt),
          metadata: $metadata
        })
        `,
        {
          ...evidence,
          verifiedAt: evidence.verifiedAt || null,
          metadata: JSON.stringify(evidence.metadata),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async persistNarrative(narrative: Narrative): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (n:CogSecNarrative {
          id: $id,
          name: $name,
          description: $description,
          summary: $summary,
          status: $status,
          firstDetectedAt: datetime($firstDetectedAt),
          peakAt: $peakAt,
          claimIds: $claimIds,
          parentNarrativeId: $parentNarrativeId,
          childNarrativeIds: $childNarrativeIds,
          actorIds: $actorIds,
          channelIds: $channelIds,
          audienceIds: $audienceIds,
          keywords: $keywords,
          velocity: $velocity,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        `,
        {
          ...narrative,
          peakAt: narrative.peakAt || null,
          velocity: JSON.stringify(narrative.velocity),
        },
      );
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Record Converters
  // ==========================================================================

  private recordToClaim(node: any): Claim {
    const props = node.properties || node;
    return {
      id: props.id,
      canonicalText: props.canonicalText,
      originalText: props.originalText,
      language: props.language,
      sourceType: props.sourceType,
      sourceUrl: props.sourceUrl,
      firstObservedAt: props.firstObservedAt?.toString() || props.firstObservedAt,
      lastObservedAt: props.lastObservedAt?.toString() || props.lastObservedAt,
      verdict: props.verdict,
      verdictConfidence: props.verdictConfidence,
      evidenceIds: props.evidenceIds || [],
      relatedClaimIds: props.relatedClaimIds || [],
      narrativeIds: props.narrativeIds || [],
      actorIds: props.actorIds || [],
      channelIds: props.channelIds || [],
      embedding: props.embedding,
      entities:
        typeof props.entities === 'string'
          ? JSON.parse(props.entities)
          : props.entities || [],
      metadata:
        typeof props.metadata === 'string'
          ? JSON.parse(props.metadata)
          : props.metadata || {},
      createdAt: props.createdAt?.toString() || props.createdAt,
      updatedAt: props.updatedAt?.toString() || props.updatedAt,
    };
  }

  private recordToEvidence(node: any): Evidence {
    const props = node.properties || node;
    return {
      id: props.id,
      type: props.type,
      title: props.title,
      content: props.content,
      sourceUrl: props.sourceUrl,
      sourceCredibility: props.sourceCredibility,
      contentCredentialId: props.contentCredentialId,
      claimIds: props.claimIds || [],
      supportsVerdict: props.supportsVerdict,
      verified: props.verified,
      verifiedBy: props.verifiedBy,
      verifiedAt: props.verifiedAt?.toString(),
      verificationNotes: props.verificationNotes,
      capturedAt: props.capturedAt?.toString() || props.capturedAt,
      createdAt: props.createdAt?.toString() || props.createdAt,
      metadata:
        typeof props.metadata === 'string'
          ? JSON.parse(props.metadata)
          : props.metadata || {},
    };
  }

  private recordToNarrative(node: any): Narrative {
    const props = node.properties || node;
    return {
      id: props.id,
      name: props.name,
      description: props.description,
      summary: props.summary,
      status: props.status,
      firstDetectedAt: props.firstDetectedAt?.toString() || props.firstDetectedAt,
      peakAt: props.peakAt?.toString(),
      claimIds: props.claimIds || [],
      parentNarrativeId: props.parentNarrativeId,
      childNarrativeIds: props.childNarrativeIds || [],
      actorIds: props.actorIds || [],
      channelIds: props.channelIds || [],
      audienceIds: props.audienceIds || [],
      keywords: props.keywords || [],
      velocity:
        typeof props.velocity === 'string'
          ? JSON.parse(props.velocity)
          : props.velocity || {
            spreadRate: 0,
            acceleration: 0,
            estimatedReach: 0,
            platformCount: 0,
            languageCount: 1,
            regions: [],
          },
      createdAt: props.createdAt?.toString() || props.createdAt,
      updatedAt: props.updatedAt?.toString() || props.updatedAt,
    };
  }

  private recordToActor(node: any): Actor {
    const props = node.properties || node;
    return {
      id: props.id,
      name: props.name,
      type: props.type,
      accounts: [],
      credibilityScore: props.credibilityScore,
      influenceScore: props.influenceScore,
      coordinationScore: props.coordinationScore,
      claimIds: props.claimIds || [],
      narrativeIds: props.narrativeIds || [],
      affiliations: props.affiliations || [],
      firstActivityAt: props.firstActivityAt?.toString() || props.firstActivityAt,
      lastActivityAt: props.lastActivityAt?.toString() || props.lastActivityAt,
      createdAt: props.createdAt?.toString() || props.createdAt,
      metadata:
        typeof props.metadata === 'string'
          ? JSON.parse(props.metadata)
          : props.metadata || {},
    };
  }

  private recordToChannel(node: any): Channel {
    const props = node.properties || node;
    return {
      id: props.id,
      name: props.name,
      platform: props.platform,
      type: props.type,
      url: props.url,
      audienceSize: props.audienceSize,
      credibilityScore: props.credibilityScore,
      claimIds: props.claimIds || [],
      narrativeIds: props.narrativeIds || [],
      actorIds: props.actorIds || [],
      isLaunderingNode: props.isLaunderingNode || false,
      createdAt: props.createdAt?.toString() || props.createdAt,
      metadata:
        typeof props.metadata === 'string'
          ? JSON.parse(props.metadata)
          : props.metadata || {},
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
      return {
        healthy: true,
        details: {
          neo4jConnected: true,
          hasEmbedding: !!this.config.embeddingService,
          hasNLP: !!this.config.nlpService,
        },
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          neo4jConnected: false,
          error: error instanceof Error ? error.message : 'Unknown',
        },
      };
    } finally {
      await session.close();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let serviceInstance: ClaimsService | null = null;

export function createClaimsService(config: ClaimsServiceConfig): ClaimsService {
  return new ClaimsService(config);
}

export function initializeClaimsService(config: ClaimsServiceConfig): ClaimsService {
  serviceInstance = new ClaimsService(config);
  return serviceInstance;
}

export function getClaimsService(): ClaimsService {
  if (!serviceInstance) {
    throw new Error('Claims service not initialized');
  }
  return serviceInstance;
}
