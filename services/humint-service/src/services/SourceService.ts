/**
 * Source Service
 *
 * Core business logic for HUMINT source management.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Session } from 'neo4j-driver';
import {
  HumintSource,
  SourceSearchCriteria,
  SourceStatistics,
  CreateSourceSchema,
  UpdateSourceSchema,
  CreateSourceInput,
  UpdateSourceInput,
  CREDIBILITY_RATINGS,
  SOURCE_STATUS,
  VALIDATION_THRESHOLDS,
} from '@intelgraph/humint-types';
import { ServiceContext } from '../context.js';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/error-handler.js';

export class SourceService {
  constructor(private ctx: ServiceContext) {}

  /**
   * Create a new HUMINT source
   */
  async createSource(
    input: CreateSourceInput,
    userId: string,
    tenantId: string,
  ): Promise<HumintSource> {
    // Validate input
    const validated = CreateSourceSchema.parse(input);

    // Check for duplicate cryptonym
    const existing = await this.findByCryptonym(validated.cryptonym, tenantId);
    if (existing) {
      throw new ConflictError(`Source with cryptonym ${validated.cryptonym} already exists`);
    }

    const now = new Date();
    const id = uuidv4();

    const source: HumintSource = {
      id,
      tenantId,
      cryptonym: validated.cryptonym,
      sourceType: validated.sourceType,
      status: SOURCE_STATUS.DEVELOPMENTAL,
      handlerId: validated.handlerId,
      alternateHandlerId: validated.alternateHandlerId,
      credibilityRating: validated.credibilityRating,
      credibilityScore: CREDIBILITY_RATINGS[validated.credibilityRating].score,
      credibilityTrend: 'STABLE',
      riskLevel: validated.riskLevel,
      areaOfOperation: validated.areaOfOperation,
      topicalAccess: validated.topicalAccess,
      accessCapabilities: validated.accessCapabilities || [],
      contactMethods: validated.contactMethods,
      coverIdentities: validated.coverIdentities || [],
      recruitmentDate: validated.recruitmentDate,
      lastContactDate: undefined,
      nextScheduledContact: undefined,
      totalDebriefs: 0,
      intelligenceReportsCount: 0,
      actionableIntelCount: 0,
      languages: validated.languages,
      specialCapabilities: validated.specialCapabilities || [],
      compensation: validated.compensation,
      motivationFactors: validated.motivationFactors,
      vulnerabilities: validated.vulnerabilities || [],
      policyLabels: validated.policyLabels,
      personEntityId: undefined,
      notes: validated.notes || '',
      provenance: [
        {
          sourceId: id,
          method: 'MANUAL_ENTRY',
          timestamp: now,
          actor: userId,
          action: 'CREATE',
          evidence: [],
          confidence: 100,
        },
      ],
      validFrom: now,
      validTo: undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    };

    // Persist to Neo4j
    const session = this.ctx.getNeo4jSession();
    try {
      await session.run(
        `
        CREATE (s:HumintSource {
          id: $id,
          tenantId: $tenantId,
          cryptonym: $cryptonym,
          sourceType: $sourceType,
          status: $status,
          handlerId: $handlerId,
          alternateHandlerId: $alternateHandlerId,
          credibilityRating: $credibilityRating,
          credibilityScore: $credibilityScore,
          credibilityTrend: $credibilityTrend,
          riskLevel: $riskLevel,
          areaOfOperation: $areaOfOperation,
          topicalAccess: $topicalAccess,
          recruitmentDate: datetime($recruitmentDate),
          totalDebriefs: $totalDebriefs,
          intelligenceReportsCount: $intelligenceReportsCount,
          actionableIntelCount: $actionableIntelCount,
          languages: $languages,
          specialCapabilities: $specialCapabilities,
          motivationFactors: $motivationFactors,
          vulnerabilities: $vulnerabilities,
          classification: $classification,
          notes: $notes,
          validFrom: datetime($validFrom),
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt),
          createdBy: $createdBy,
          updatedBy: $updatedBy,
          version: $version
        })
        RETURN s
        `,
        {
          id: source.id,
          tenantId: source.tenantId,
          cryptonym: source.cryptonym,
          sourceType: source.sourceType,
          status: source.status,
          handlerId: source.handlerId,
          alternateHandlerId: source.alternateHandlerId || null,
          credibilityRating: source.credibilityRating,
          credibilityScore: source.credibilityScore,
          credibilityTrend: source.credibilityTrend,
          riskLevel: source.riskLevel,
          areaOfOperation: source.areaOfOperation,
          topicalAccess: source.topicalAccess,
          recruitmentDate: source.recruitmentDate.toISOString(),
          totalDebriefs: source.totalDebriefs,
          intelligenceReportsCount: source.intelligenceReportsCount,
          actionableIntelCount: source.actionableIntelCount,
          languages: source.languages,
          specialCapabilities: source.specialCapabilities,
          motivationFactors: source.motivationFactors,
          vulnerabilities: source.vulnerabilities,
          classification: source.policyLabels.classification,
          notes: source.notes,
          validFrom: source.validFrom.toISOString(),
          createdAt: source.createdAt.toISOString(),
          updatedAt: source.updatedAt.toISOString(),
          createdBy: source.createdBy,
          updatedBy: source.updatedBy,
          version: source.version,
        },
      );

      // Create handler relationship
      await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId})
        MATCH (h:HumintHandler {id: $handlerId})
        CREATE (h)-[:HANDLES {
          assignedDate: datetime($assignedDate),
          isActive: true
        }]->(s)
        `,
        {
          sourceId: source.id,
          handlerId: source.handlerId,
          assignedDate: now.toISOString(),
        },
      );

      // Log audit event
      await this.logAuditEvent(session, {
        sourceId: source.id,
        eventType: 'SOURCE_CREATED',
        actorId: userId,
        details: { cryptonym: source.cryptonym, sourceType: source.sourceType },
      });

      this.ctx.logger.info(
        { sourceId: source.id, cryptonym: source.cryptonym },
        'Source created',
      );

      return source;
    } finally {
      await session.close();
    }
  }

  /**
   * Get source by ID
   */
  async getSource(id: string, tenantId: string): Promise<HumintSource> {
    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource {id: $id, tenantId: $tenantId})
        RETURN s
        `,
        { id, tenantId },
      );

      if (result.records.length === 0) {
        throw new NotFoundError('Source', id);
      }

      return this.mapRecordToSource(result.records[0].get('s'));
    } finally {
      await session.close();
    }
  }

  /**
   * Find source by cryptonym
   */
  async findByCryptonym(
    cryptonym: string,
    tenantId: string,
  ): Promise<HumintSource | null> {
    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource {cryptonym: $cryptonym, tenantId: $tenantId})
        RETURN s
        `,
        { cryptonym, tenantId },
      );

      if (result.records.length === 0) {
        return null;
      }

      return this.mapRecordToSource(result.records[0].get('s'));
    } finally {
      await session.close();
    }
  }

  /**
   * Update source
   */
  async updateSource(
    input: UpdateSourceInput,
    userId: string,
    tenantId: string,
  ): Promise<HumintSource> {
    const validated = UpdateSourceSchema.parse(input);

    const existing = await this.getSource(validated.id, tenantId);
    if (!existing) {
      throw new NotFoundError('Source', validated.id);
    }

    const session = this.ctx.getNeo4jSession();
    try {
      const updates: Record<string, unknown> = {};
      const setClauses: string[] = [];

      // Build dynamic update
      for (const [key, value] of Object.entries(validated)) {
        if (key === 'id' || value === undefined) continue;
        updates[key] = value;
        if (value instanceof Date) {
          setClauses.push(`s.${key} = datetime($${key})`);
          updates[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          setClauses.push(`s.${key} = $${key}`);
        } else {
          setClauses.push(`s.${key} = $${key}`);
        }
      }

      setClauses.push('s.updatedAt = datetime($updatedAt)');
      setClauses.push('s.updatedBy = $updatedBy');
      setClauses.push('s.version = s.version + 1');

      updates.id = validated.id;
      updates.tenantId = tenantId;
      updates.updatedAt = new Date().toISOString();
      updates.updatedBy = userId;

      const result = await session.run(
        `
        MATCH (s:HumintSource {id: $id, tenantId: $tenantId})
        SET ${setClauses.join(', ')}
        RETURN s
        `,
        updates,
      );

      // Log audit event
      await this.logAuditEvent(session, {
        sourceId: validated.id,
        eventType: 'SOURCE_UPDATED',
        actorId: userId,
        details: { updatedFields: Object.keys(validated).filter((k) => k !== 'id') },
      });

      return this.mapRecordToSource(result.records[0].get('s'));
    } finally {
      await session.close();
    }
  }

  /**
   * Search sources with filters
   */
  async searchSources(
    criteria: SourceSearchCriteria,
    tenantId: string,
  ): Promise<{ sources: HumintSource[]; total: number }> {
    const session = this.ctx.getNeo4jSession();
    try {
      const whereClauses: string[] = ['s.tenantId = $tenantId'];
      const params: Record<string, unknown> = { tenantId };

      if (criteria.cryptonym) {
        whereClauses.push('s.cryptonym CONTAINS $cryptonym');
        params.cryptonym = criteria.cryptonym;
      }

      if (criteria.sourceTypes?.length) {
        whereClauses.push('s.sourceType IN $sourceTypes');
        params.sourceTypes = criteria.sourceTypes;
      }

      if (criteria.statuses?.length) {
        whereClauses.push('s.status IN $statuses');
        params.statuses = criteria.statuses;
      }

      if (criteria.handlerId) {
        whereClauses.push('s.handlerId = $handlerId');
        params.handlerId = criteria.handlerId;
      }

      if (criteria.minCredibilityScore !== undefined) {
        whereClauses.push('s.credibilityScore >= $minCredibilityScore');
        params.minCredibilityScore = criteria.minCredibilityScore;
      }

      if (criteria.maxCredibilityScore !== undefined) {
        whereClauses.push('s.credibilityScore <= $maxCredibilityScore');
        params.maxCredibilityScore = criteria.maxCredibilityScore;
      }

      if (criteria.riskLevels?.length) {
        whereClauses.push('s.riskLevel IN $riskLevels');
        params.riskLevels = criteria.riskLevels;
      }

      if (criteria.hasRecentContact && criteria.recentContactDays) {
        whereClauses.push(
          's.lastContactDate >= datetime() - duration({days: $recentContactDays})',
        );
        params.recentContactDays = criteria.recentContactDays;
      }

      const whereClause = whereClauses.join(' AND ');
      const sortField = criteria.sortBy || 'createdAt';
      const sortOrder = criteria.sortOrder === 'asc' ? 'ASC' : 'DESC';
      const limit = criteria.limit || 20;
      const offset = criteria.offset || 0;

      // Get total count
      const countResult = await session.run(
        `
        MATCH (s:HumintSource)
        WHERE ${whereClause}
        RETURN count(s) as total
        `,
        params,
      );
      const total = countResult.records[0].get('total').toNumber();

      // Get paginated results
      const result = await session.run(
        `
        MATCH (s:HumintSource)
        WHERE ${whereClause}
        RETURN s
        ORDER BY s.${sortField} ${sortOrder}
        SKIP $offset
        LIMIT $limit
        `,
        { ...params, offset, limit },
      );

      const sources = result.records.map((r) => this.mapRecordToSource(r.get('s')));

      return { sources, total };
    } finally {
      await session.close();
    }
  }

  /**
   * Get source statistics
   */
  async getStatistics(tenantId: string): Promise<SourceStatistics> {
    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource {tenantId: $tenantId})
        WITH s
        RETURN
          count(s) as totalSources,
          avg(s.credibilityScore) as avgCredibility,
          sum(s.intelligenceReportsCount) as totalIntelReports,
          sum(s.actionableIntelCount) as totalActionableIntel,
          collect({status: s.status, count: 1}) as statusCounts,
          collect({type: s.sourceType, count: 1}) as typeCounts,
          collect({rating: s.credibilityRating, count: 1}) as ratingCounts,
          collect({risk: s.riskLevel, count: 1}) as riskCounts
        `,
        { tenantId },
      );

      const record = result.records[0];
      const dormancyThreshold = VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS;

      // Count overdue contacts
      const overdueResult = await session.run(
        `
        MATCH (s:HumintSource {tenantId: $tenantId})
        WHERE s.status = 'ACTIVE'
          AND (s.lastContactDate IS NULL
               OR s.lastContactDate < datetime() - duration({days: $threshold}))
        RETURN count(s) as overdueCount
        `,
        { tenantId, threshold: dormancyThreshold },
      );

      return {
        totalSources: record.get('totalSources').toNumber(),
        byStatus: this.aggregateCounts(record.get('statusCounts'), 'status'),
        byType: this.aggregateCounts(record.get('typeCounts'), 'type'),
        byCredibility: this.aggregateCounts(record.get('ratingCounts'), 'rating'),
        byRiskLevel: this.aggregateCounts(record.get('riskCounts'), 'risk'),
        averageCredibilityScore: record.get('avgCredibility') || 0,
        dormantCount: 0, // Calculated separately if needed
        overduContactCount: overdueResult.records[0].get('overdueCount').toNumber(),
        totalIntelReports: record.get('totalIntelReports')?.toNumber() || 0,
        totalActionableIntel: record.get('totalActionableIntel')?.toNumber() || 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Update source contact timestamp
   */
  async recordContact(
    sourceId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const session = this.ctx.getNeo4jSession();
    try {
      await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        SET s.lastContactDate = datetime(),
            s.updatedAt = datetime(),
            s.updatedBy = $userId
        `,
        { sourceId, tenantId, userId },
      );

      await this.logAuditEvent(session, {
        sourceId,
        eventType: 'CONTACT_RECORDED',
        actorId: userId,
        details: {},
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Terminate source relationship
   */
  async terminateSource(
    sourceId: string,
    reason: string,
    userId: string,
    tenantId: string,
  ): Promise<HumintSource> {
    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        SET s.status = 'TERMINATED',
            s.validTo = datetime(),
            s.updatedAt = datetime(),
            s.updatedBy = $userId,
            s.notes = s.notes + '\\n[TERMINATED] ' + $reason
        RETURN s
        `,
        { sourceId, tenantId, userId, reason },
      );

      if (result.records.length === 0) {
        throw new NotFoundError('Source', sourceId);
      }

      await this.logAuditEvent(session, {
        sourceId,
        eventType: 'SOURCE_TERMINATED',
        actorId: userId,
        details: { reason },
      });

      return this.mapRecordToSource(result.records[0].get('s'));
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapRecordToSource(record: Record<string, unknown>): HumintSource {
    const props = record.properties || record;
    return {
      id: props.id as string,
      tenantId: props.tenantId as string,
      cryptonym: props.cryptonym as string,
      sourceType: props.sourceType as HumintSource['sourceType'],
      status: props.status as HumintSource['status'],
      handlerId: props.handlerId as string,
      alternateHandlerId: props.alternateHandlerId as string | undefined,
      credibilityRating: props.credibilityRating as HumintSource['credibilityRating'],
      credibilityScore: Number(props.credibilityScore),
      credibilityTrend: props.credibilityTrend as HumintSource['credibilityTrend'],
      riskLevel: props.riskLevel as HumintSource['riskLevel'],
      areaOfOperation: props.areaOfOperation as string[],
      topicalAccess: props.topicalAccess as string[],
      accessCapabilities: [],
      contactMethods: [],
      coverIdentities: [],
      recruitmentDate: new Date(props.recruitmentDate as string),
      lastContactDate: props.lastContactDate
        ? new Date(props.lastContactDate as string)
        : undefined,
      nextScheduledContact: props.nextScheduledContact
        ? new Date(props.nextScheduledContact as string)
        : undefined,
      totalDebriefs: Number(props.totalDebriefs) || 0,
      intelligenceReportsCount: Number(props.intelligenceReportsCount) || 0,
      actionableIntelCount: Number(props.actionableIntelCount) || 0,
      languages: props.languages as string[],
      specialCapabilities: props.specialCapabilities as string[],
      compensation: { type: 'NONE' },
      motivationFactors: props.motivationFactors as string[],
      vulnerabilities: props.vulnerabilities as string[],
      policyLabels: {
        classification: props.classification as HumintSource['policyLabels']['classification'],
        caveats: [],
        releasableTo: [],
        originatorControl: false,
        legalBasis: '',
        needToKnow: [],
        retentionPeriod: 365,
      },
      personEntityId: props.personEntityId as string | undefined,
      notes: props.notes as string,
      provenance: [],
      validFrom: new Date(props.validFrom as string),
      validTo: props.validTo ? new Date(props.validTo as string) : undefined,
      createdAt: new Date(props.createdAt as string),
      updatedAt: new Date(props.updatedAt as string),
      createdBy: props.createdBy as string,
      updatedBy: props.updatedBy as string,
      version: Number(props.version) || 1,
    };
  }

  private aggregateCounts(
    items: Array<{ [key: string]: string | number }>,
    key: string,
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of items) {
      const k = item[key] as string;
      result[k] = (result[k] || 0) + 1;
    }
    return result;
  }

  private async logAuditEvent(
    session: Session,
    event: {
      sourceId: string;
      eventType: string;
      actorId: string;
      details: Record<string, unknown>;
    },
  ): Promise<void> {
    await session.run(
      `
      CREATE (a:HumintAuditEvent {
        id: $id,
        sourceId: $sourceId,
        eventType: $eventType,
        actorId: $actorId,
        timestamp: datetime(),
        details: $details
      })
      `,
      {
        id: uuidv4(),
        sourceId: event.sourceId,
        eventType: event.eventType,
        actorId: event.actorId,
        details: JSON.stringify(event.details),
      },
    );
  }
}
