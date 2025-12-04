/**
 * Debrief Service
 *
 * Manages debrief workflows with state machine transitions.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Session } from 'neo4j-driver';
import {
  DebriefSession,
  DebriefReport,
  CreateDebriefSchema,
  StartDebriefSchema,
  UpdateDebriefSchema,
  CompleteDebriefSchema,
  ReviewDebriefSchema,
  DebriefSearchCriteriaSchema,
  CreateDebriefInput,
  StartDebriefInput,
  UpdateDebriefInput,
  CompleteDebriefInput,
  ReviewDebriefInput,
  DebriefSearchInput,
  isValidTransition,
  getAllowedTransitions,
  DEBRIEF_STATUS,
} from '@intelgraph/humint-types';
import { ServiceContext } from '../context.js';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js';

export class DebriefService {
  constructor(private ctx: ServiceContext) {}

  /**
   * Schedule a new debrief session
   */
  async scheduleDebrief(
    input: CreateDebriefInput,
    userId: string,
    tenantId: string,
  ): Promise<DebriefSession> {
    const validated = CreateDebriefSchema.parse(input);

    // Verify source exists
    const session = this.ctx.getNeo4jSession();
    try {
      const sourceResult = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        RETURN s.cryptonym as cryptonym, s.handlerId as handlerId
        `,
        { sourceId: validated.sourceId, tenantId },
      );

      if (sourceResult.records.length === 0) {
        throw new NotFoundError('Source', validated.sourceId);
      }

      const sourceCryptonym = sourceResult.records[0].get('cryptonym');
      const handlerId = sourceResult.records[0].get('handlerId');

      const now = new Date();
      const id = uuidv4();

      const debrief: DebriefSession = {
        id,
        tenantId,
        sourceId: validated.sourceId,
        sourceCryptonym,
        handlerId,
        debriefType: validated.debriefType,
        status: DEBRIEF_STATUS.PLANNED,
        scheduledAt: validated.scheduledAt,
        startedAt: undefined,
        endedAt: undefined,
        durationMinutes: undefined,
        location: validated.location,
        objectives: validated.objectives,
        topicsCovered: [],
        rawNotes: '',
        processedNotes: '',
        intelligenceItems: [],
        taskings: [],
        securityAssessment: undefined,
        sourceDemeanor: '',
        credibilityObservations: '',
        payments: [],
        attachments: [],
        reviewerId: undefined,
        reviewNotes: undefined,
        reviewedAt: undefined,
        dissemination: [],
        policyLabels: validated.policyLabels,
        provenance: [
          {
            sourceId: id,
            method: 'MANUAL_ENTRY',
            timestamp: now,
            actor: userId,
            action: 'SCHEDULE',
            evidence: [],
            confidence: 100,
          },
        ],
        previousDebriefId: validated.previousDebriefId,
        nextDebriefId: undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      };

      // Persist to Neo4j
      await session.run(
        `
        CREATE (d:HumintDebrief {
          id: $id,
          tenantId: $tenantId,
          sourceId: $sourceId,
          sourceCryptonym: $sourceCryptonym,
          handlerId: $handlerId,
          debriefType: $debriefType,
          status: $status,
          scheduledAt: datetime($scheduledAt),
          objectives: $objectives,
          locationType: $locationType,
          locationId: $locationId,
          classification: $classification,
          previousDebriefId: $previousDebriefId,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt),
          createdBy: $createdBy,
          version: 1
        })
        WITH d
        MATCH (s:HumintSource {id: $sourceId})
        CREATE (d)-[:DEBRIEF_OF]->(s)
        RETURN d
        `,
        {
          id: debrief.id,
          tenantId: debrief.tenantId,
          sourceId: debrief.sourceId,
          sourceCryptonym: debrief.sourceCryptonym,
          handlerId: debrief.handlerId,
          debriefType: debrief.debriefType,
          status: debrief.status,
          scheduledAt: debrief.scheduledAt.toISOString(),
          objectives: debrief.objectives,
          locationType: debrief.location.type,
          locationId: debrief.location.identifier,
          classification: debrief.policyLabels.classification,
          previousDebriefId: debrief.previousDebriefId || null,
          createdAt: debrief.createdAt.toISOString(),
          updatedAt: debrief.updatedAt.toISOString(),
          createdBy: debrief.createdBy,
        },
      );

      // Link to previous debrief if specified
      if (validated.previousDebriefId) {
        await session.run(
          `
          MATCH (current:HumintDebrief {id: $currentId})
          MATCH (previous:HumintDebrief {id: $previousId})
          CREATE (current)-[:FOLLOWS]->(previous)
          SET previous.nextDebriefId = $currentId
          `,
          { currentId: id, previousId: validated.previousDebriefId },
        );
      }

      await this.logAuditEvent(session, {
        debriefId: id,
        sourceId: validated.sourceId,
        eventType: 'DEBRIEF_SCHEDULED',
        actorId: userId,
        details: { debriefType: validated.debriefType, scheduledAt: validated.scheduledAt },
      });

      this.ctx.logger.info(
        { debriefId: id, sourceId: validated.sourceId },
        'Debrief scheduled',
      );

      return debrief;
    } finally {
      await session.close();
    }
  }

  /**
   * Start a debrief session
   */
  async startDebrief(
    input: StartDebriefInput,
    userId: string,
    tenantId: string,
  ): Promise<DebriefSession> {
    const validated = StartDebriefSchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      // Get current debrief and validate transition
      const current = await this.getDebrief(validated.id, tenantId);

      if (!isValidTransition(current.status, DEBRIEF_STATUS.IN_PROGRESS)) {
        throw new ValidationError(
          `Cannot start debrief in status ${current.status}. Valid transitions: ${getAllowedTransitions(current.status).join(', ')}`,
        );
      }

      const result = await session.run(
        `
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET d.status = 'IN_PROGRESS',
            d.startedAt = datetime($startedAt),
            d.updatedAt = datetime(),
            d.updatedBy = $userId
        RETURN d
        `,
        {
          id: validated.id,
          tenantId,
          startedAt: validated.startedAt.toISOString(),
          userId,
        },
      );

      // Update source last contact date
      await session.run(
        `
        MATCH (d:HumintDebrief {id: $debriefId})-[:DEBRIEF_OF]->(s:HumintSource)
        SET s.lastContactDate = datetime(),
            s.updatedAt = datetime()
        `,
        { debriefId: validated.id },
      );

      await this.logAuditEvent(session, {
        debriefId: validated.id,
        sourceId: current.sourceId,
        eventType: 'DEBRIEF_STARTED',
        actorId: userId,
        details: {},
      });

      return this.mapRecordToDebrief(result.records[0].get('d'));
    } finally {
      await session.close();
    }
  }

  /**
   * Update debrief in progress
   */
  async updateDebrief(
    input: UpdateDebriefInput,
    userId: string,
    tenantId: string,
  ): Promise<DebriefSession> {
    const validated = UpdateDebriefSchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      const current = await this.getDebrief(validated.id, tenantId);

      if (current.status !== DEBRIEF_STATUS.IN_PROGRESS) {
        throw new ValidationError(
          `Can only update debriefs in IN_PROGRESS status, current: ${current.status}`,
        );
      }

      const updates: string[] = [];
      const params: Record<string, unknown> = {
        id: validated.id,
        tenantId,
        userId,
      };

      if (validated.topicsCovered) {
        updates.push('d.topicsCovered = $topicsCovered');
        params.topicsCovered = validated.topicsCovered;
      }

      if (validated.rawNotes) {
        updates.push('d.rawNotes = $rawNotes');
        params.rawNotes = validated.rawNotes;
      }

      if (validated.sourceDemeanor) {
        updates.push('d.sourceDemeanor = $sourceDemeanor');
        params.sourceDemeanor = validated.sourceDemeanor;
      }

      if (validated.credibilityObservations) {
        updates.push('d.credibilityObservations = $credibilityObservations');
        params.credibilityObservations = validated.credibilityObservations;
      }

      updates.push('d.updatedAt = datetime()');
      updates.push('d.updatedBy = $userId');

      const result = await session.run(
        `
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET ${updates.join(', ')}
        RETURN d
        `,
        params,
      );

      return this.mapRecordToDebrief(result.records[0].get('d'));
    } finally {
      await session.close();
    }
  }

  /**
   * Complete a debrief session
   */
  async completeDebrief(
    input: CompleteDebriefInput,
    userId: string,
    tenantId: string,
  ): Promise<DebriefSession> {
    const validated = CompleteDebriefSchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      const current = await this.getDebrief(validated.id, tenantId);

      if (!isValidTransition(current.status, DEBRIEF_STATUS.PENDING_REVIEW)) {
        throw new ValidationError(
          `Cannot complete debrief in status ${current.status}`,
        );
      }

      // Calculate duration
      const durationMinutes = current.startedAt
        ? Math.round(
            (validated.endedAt.getTime() - current.startedAt.getTime()) / 60000,
          )
        : 0;

      const result = await session.run(
        `
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET d.status = 'PENDING_REVIEW',
            d.endedAt = datetime($endedAt),
            d.durationMinutes = $durationMinutes,
            d.processedNotes = $processedNotes,
            d.securityAssessment = $securityAssessment,
            d.updatedAt = datetime(),
            d.updatedBy = $userId
        RETURN d
        `,
        {
          id: validated.id,
          tenantId,
          endedAt: validated.endedAt.toISOString(),
          durationMinutes,
          processedNotes: validated.processedNotes,
          securityAssessment: JSON.stringify(validated.securityAssessment),
          userId,
        },
      );

      // Create intelligence item nodes
      for (const intel of validated.intelligenceItems) {
        await session.run(
          `
          CREATE (i:HumintIntelligence {
            id: $id,
            debriefId: $debriefId,
            topic: $topic,
            content: $content,
            informationRating: $informationRating,
            classification: $classification,
            actionability: $actionability,
            requiresCorroboration: $requiresCorroboration,
            createdAt: datetime()
          })
          WITH i
          MATCH (d:HumintDebrief {id: $debriefId})
          CREATE (i)-[:EXTRACTED_FROM]->(d)
          `,
          {
            id: intel.id,
            debriefId: validated.id,
            topic: intel.topic,
            content: intel.content,
            informationRating: intel.informationRating,
            classification: intel.classification,
            actionability: intel.actionability,
            requiresCorroboration: intel.requiresCorroboration,
          },
        );
      }

      // Update source statistics
      await session.run(
        `
        MATCH (d:HumintDebrief {id: $debriefId})-[:DEBRIEF_OF]->(s:HumintSource)
        SET s.totalDebriefs = s.totalDebriefs + 1,
            s.intelligenceReportsCount = s.intelligenceReportsCount + $intelCount,
            s.actionableIntelCount = s.actionableIntelCount + $actionableCount
        `,
        {
          debriefId: validated.id,
          intelCount: validated.intelligenceItems.length,
          actionableCount: validated.intelligenceItems.filter(
            (i) => i.actionability === 'IMMEDIATE' || i.actionability === 'SHORT_TERM',
          ).length,
        },
      );

      await this.logAuditEvent(session, {
        debriefId: validated.id,
        sourceId: current.sourceId,
        eventType: 'DEBRIEF_COMPLETED',
        actorId: userId,
        details: {
          durationMinutes,
          intelligenceItemCount: validated.intelligenceItems.length,
          taskingCount: validated.taskings.length,
        },
      });

      return this.mapRecordToDebrief(result.records[0].get('d'));
    } finally {
      await session.close();
    }
  }

  /**
   * Review and approve/reject debrief
   */
  async reviewDebrief(
    input: ReviewDebriefInput,
    userId: string,
    tenantId: string,
  ): Promise<DebriefSession> {
    const validated = ReviewDebriefSchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      const current = await this.getDebrief(validated.id, tenantId);
      const targetStatus = validated.approved
        ? DEBRIEF_STATUS.APPROVED
        : DEBRIEF_STATUS.ACTION_REQUIRED;

      if (!isValidTransition(current.status, targetStatus)) {
        throw new ValidationError(
          `Cannot transition from ${current.status} to ${targetStatus}`,
        );
      }

      const result = await session.run(
        `
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET d.status = $status,
            d.reviewerId = $reviewerId,
            d.reviewNotes = $reviewNotes,
            d.reviewedAt = datetime(),
            d.updatedAt = datetime(),
            d.updatedBy = $userId
        RETURN d
        `,
        {
          id: validated.id,
          tenantId,
          status: targetStatus,
          reviewerId: userId,
          reviewNotes: validated.reviewNotes,
          userId,
        },
      );

      await this.logAuditEvent(session, {
        debriefId: validated.id,
        sourceId: current.sourceId,
        eventType: validated.approved ? 'DEBRIEF_APPROVED' : 'DEBRIEF_RETURNED',
        actorId: userId,
        details: { reviewNotes: validated.reviewNotes },
      });

      return this.mapRecordToDebrief(result.records[0].get('d'));
    } finally {
      await session.close();
    }
  }

  /**
   * Get debrief by ID
   */
  async getDebrief(id: string, tenantId: string): Promise<DebriefSession> {
    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        RETURN d
        `,
        { id, tenantId },
      );

      if (result.records.length === 0) {
        throw new NotFoundError('Debrief', id);
      }

      return this.mapRecordToDebrief(result.records[0].get('d'));
    } finally {
      await session.close();
    }
  }

  /**
   * Search debriefs
   */
  async searchDebriefs(
    criteria: DebriefSearchInput,
    tenantId: string,
  ): Promise<{ debriefs: DebriefSession[]; total: number }> {
    const validated = DebriefSearchCriteriaSchema.parse(criteria);

    const session = this.ctx.getNeo4jSession();
    try {
      const whereClauses: string[] = ['d.tenantId = $tenantId'];
      const params: Record<string, unknown> = { tenantId };

      if (validated.sourceId) {
        whereClauses.push('d.sourceId = $sourceId');
        params.sourceId = validated.sourceId;
      }

      if (validated.handlerId) {
        whereClauses.push('d.handlerId = $handlerId');
        params.handlerId = validated.handlerId;
      }

      if (validated.debriefTypes?.length) {
        whereClauses.push('d.debriefType IN $debriefTypes');
        params.debriefTypes = validated.debriefTypes;
      }

      if (validated.statuses?.length) {
        whereClauses.push('d.status IN $statuses');
        params.statuses = validated.statuses;
      }

      if (validated.scheduledAfter) {
        whereClauses.push('d.scheduledAt >= datetime($scheduledAfter)');
        params.scheduledAfter = validated.scheduledAfter.toISOString();
      }

      if (validated.scheduledBefore) {
        whereClauses.push('d.scheduledAt <= datetime($scheduledBefore)');
        params.scheduledBefore = validated.scheduledBefore.toISOString();
      }

      const whereClause = whereClauses.join(' AND ');

      // Get count
      const countResult = await session.run(
        `
        MATCH (d:HumintDebrief)
        WHERE ${whereClause}
        RETURN count(d) as total
        `,
        params,
      );
      const total = countResult.records[0].get('total').toNumber();

      // Get results
      const result = await session.run(
        `
        MATCH (d:HumintDebrief)
        WHERE ${whereClause}
        RETURN d
        ORDER BY d.scheduledAt DESC
        SKIP $offset
        LIMIT $limit
        `,
        { ...params, offset: validated.offset, limit: validated.limit },
      );

      const debriefs = result.records.map((r) =>
        this.mapRecordToDebrief(r.get('d')),
      );

      return { debriefs, total };
    } finally {
      await session.close();
    }
  }

  /**
   * Generate debrief report for dissemination
   */
  async generateReport(
    debriefId: string,
    tenantId: string,
  ): Promise<DebriefReport> {
    const debrief = await this.getDebrief(debriefId, tenantId);

    if (debrief.status !== DEBRIEF_STATUS.APPROVED) {
      throw new ValidationError('Can only generate reports for approved debriefs');
    }

    const session = this.ctx.getNeo4jSession();
    try {
      // Get intelligence items
      const intelResult = await session.run(
        `
        MATCH (i:HumintIntelligence)-[:EXTRACTED_FROM]->(d:HumintDebrief {id: $debriefId})
        RETURN i
        `,
        { debriefId },
      );

      const intelligenceItems = intelResult.records.map((r) => {
        const props = r.get('i').properties;
        return {
          id: props.id,
          topic: props.topic,
          content: props.content,
          informationRating: props.informationRating,
          classification: props.classification,
          requiresCorroboration: props.requiresCorroboration,
          corroboratedBy: [],
          linkedEntities: [],
          actionability: props.actionability,
          disseminationRestrictions: [],
        };
      });

      return {
        id: uuidv4(),
        debriefId,
        sourceId: debrief.sourceId,
        sourceCryptonym: debrief.sourceCryptonym,
        reportDate: new Date(),
        classification: debrief.policyLabels.classification,
        executiveSummary: debrief.processedNotes.slice(0, 500),
        keyFindings: intelligenceItems
          .filter((i) => i.actionability !== 'BACKGROUND')
          .map((i) => i.topic),
        intelligenceItems,
        actionableItems: intelligenceItems
          .filter(
            (i) => i.actionability === 'IMMEDIATE' || i.actionability === 'SHORT_TERM',
          )
          .map((i) => i.topic),
        recommendedFollowUp: debrief.taskings.map((t) => t.description),
        reliability: {
          sourceRating: 'B', // Would be calculated from source
          informationRating: '2',
          compositeScore: 75,
        },
        policyLabels: debrief.policyLabels,
        generatedAt: new Date(),
        generatedBy: 'system',
      };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapRecordToDebrief(record: Record<string, unknown>): DebriefSession {
    const props = record.properties || record;
    return {
      id: props.id as string,
      tenantId: props.tenantId as string,
      sourceId: props.sourceId as string,
      sourceCryptonym: props.sourceCryptonym as string,
      handlerId: props.handlerId as string,
      debriefType: props.debriefType as DebriefSession['debriefType'],
      status: props.status as DebriefSession['status'],
      scheduledAt: new Date(props.scheduledAt as string),
      startedAt: props.startedAt ? new Date(props.startedAt as string) : undefined,
      endedAt: props.endedAt ? new Date(props.endedAt as string) : undefined,
      durationMinutes: props.durationMinutes as number | undefined,
      location: {
        type: (props.locationType as DebriefSession['location']['type']) || 'OTHER',
        identifier: (props.locationId as string) || '',
        securityVerified: false,
      },
      objectives: (props.objectives as string[]) || [],
      topicsCovered: (props.topicsCovered as string[]) || [],
      rawNotes: (props.rawNotes as string) || '',
      processedNotes: (props.processedNotes as string) || '',
      intelligenceItems: [],
      taskings: [],
      securityAssessment: props.securityAssessment
        ? JSON.parse(props.securityAssessment as string)
        : undefined,
      sourceDemeanor: (props.sourceDemeanor as string) || '',
      credibilityObservations: (props.credibilityObservations as string) || '',
      payments: [],
      attachments: [],
      reviewerId: props.reviewerId as string | undefined,
      reviewNotes: props.reviewNotes as string | undefined,
      reviewedAt: props.reviewedAt
        ? new Date(props.reviewedAt as string)
        : undefined,
      dissemination: [],
      policyLabels: {
        classification:
          (props.classification as DebriefSession['policyLabels']['classification']) ||
          'UNCLASSIFIED',
        caveats: [],
        releasableTo: [],
        originatorControl: false,
        legalBasis: '',
        needToKnow: [],
        retentionPeriod: 365,
      },
      provenance: [],
      previousDebriefId: props.previousDebriefId as string | undefined,
      nextDebriefId: props.nextDebriefId as string | undefined,
      createdAt: new Date(props.createdAt as string),
      updatedAt: new Date(props.updatedAt as string),
      createdBy: props.createdBy as string,
      updatedBy: props.updatedBy as string || props.createdBy as string,
      version: Number(props.version) || 1,
    };
  }

  private async logAuditEvent(
    session: Session,
    event: {
      debriefId: string;
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
        debriefId: $debriefId,
        sourceId: $sourceId,
        eventType: $eventType,
        actorId: $actorId,
        timestamp: datetime(),
        details: $details
      })
      `,
      {
        id: uuidv4(),
        debriefId: event.debriefId,
        sourceId: event.sourceId,
        eventType: event.eventType,
        actorId: event.actorId,
        details: JSON.stringify(event.details),
      },
    );
  }
}
