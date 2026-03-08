"use strict";
/**
 * Debrief Service
 *
 * Manages debrief workflows with state machine transitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebriefService = void 0;
const uuid_1 = require("uuid");
const humint_types_1 = require("@intelgraph/humint-types");
const error_handler_js_1 = require("../middleware/error-handler.js");
class DebriefService {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    /**
     * Schedule a new debrief session
     */
    async scheduleDebrief(input, userId, tenantId) {
        const validated = humint_types_1.CreateDebriefSchema.parse(input);
        // Verify source exists
        const session = this.ctx.getNeo4jSession();
        try {
            const sourceResult = await session.run(`
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        RETURN s.cryptonym as cryptonym, s.handlerId as handlerId
        `, { sourceId: validated.sourceId, tenantId });
            if (sourceResult.records.length === 0) {
                throw new error_handler_js_1.NotFoundError('Source', validated.sourceId);
            }
            const sourceCryptonym = sourceResult.records[0].get('cryptonym');
            const handlerId = sourceResult.records[0].get('handlerId');
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const debrief = {
                id,
                tenantId,
                sourceId: validated.sourceId,
                sourceCryptonym,
                handlerId,
                debriefType: validated.debriefType,
                status: humint_types_1.DEBRIEF_STATUS.PLANNED,
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
            await session.run(`
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
        `, {
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
            });
            // Link to previous debrief if specified
            if (validated.previousDebriefId) {
                await session.run(`
          MATCH (current:HumintDebrief {id: $currentId})
          MATCH (previous:HumintDebrief {id: $previousId})
          CREATE (current)-[:FOLLOWS]->(previous)
          SET previous.nextDebriefId = $currentId
          `, { currentId: id, previousId: validated.previousDebriefId });
            }
            await this.logAuditEvent(session, {
                debriefId: id,
                sourceId: validated.sourceId,
                eventType: 'DEBRIEF_SCHEDULED',
                actorId: userId,
                details: { debriefType: validated.debriefType, scheduledAt: validated.scheduledAt },
            });
            this.ctx.logger.info({ debriefId: id, sourceId: validated.sourceId }, 'Debrief scheduled');
            return debrief;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Start a debrief session
     */
    async startDebrief(input, userId, tenantId) {
        const validated = humint_types_1.StartDebriefSchema.parse(input);
        const session = this.ctx.getNeo4jSession();
        try {
            // Get current debrief and validate transition
            const current = await this.getDebrief(validated.id, tenantId);
            if (!(0, humint_types_1.isValidTransition)(current.status, humint_types_1.DEBRIEF_STATUS.IN_PROGRESS)) {
                throw new error_handler_js_1.ValidationError(`Cannot start debrief in status ${current.status}. Valid transitions: ${(0, humint_types_1.getAllowedTransitions)(current.status).join(', ')}`);
            }
            const result = await session.run(`
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET d.status = 'IN_PROGRESS',
            d.startedAt = datetime($startedAt),
            d.updatedAt = datetime(),
            d.updatedBy = $userId
        RETURN d
        `, {
                id: validated.id,
                tenantId,
                startedAt: validated.startedAt.toISOString(),
                userId,
            });
            // Update source last contact date
            await session.run(`
        MATCH (d:HumintDebrief {id: $debriefId})-[:DEBRIEF_OF]->(s:HumintSource)
        SET s.lastContactDate = datetime(),
            s.updatedAt = datetime()
        `, { debriefId: validated.id });
            await this.logAuditEvent(session, {
                debriefId: validated.id,
                sourceId: current.sourceId,
                eventType: 'DEBRIEF_STARTED',
                actorId: userId,
                details: {},
            });
            return this.mapRecordToDebrief(result.records[0].get('d'));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Update debrief in progress
     */
    async updateDebrief(input, userId, tenantId) {
        const validated = humint_types_1.UpdateDebriefSchema.parse(input);
        const session = this.ctx.getNeo4jSession();
        try {
            const current = await this.getDebrief(validated.id, tenantId);
            if (current.status !== humint_types_1.DEBRIEF_STATUS.IN_PROGRESS) {
                throw new error_handler_js_1.ValidationError(`Can only update debriefs in IN_PROGRESS status, current: ${current.status}`);
            }
            const updates = [];
            const params = {
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
            const result = await session.run(`
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET ${updates.join(', ')}
        RETURN d
        `, params);
            return this.mapRecordToDebrief(result.records[0].get('d'));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Complete a debrief session
     */
    async completeDebrief(input, userId, tenantId) {
        const validated = humint_types_1.CompleteDebriefSchema.parse(input);
        const session = this.ctx.getNeo4jSession();
        try {
            const current = await this.getDebrief(validated.id, tenantId);
            if (!(0, humint_types_1.isValidTransition)(current.status, humint_types_1.DEBRIEF_STATUS.PENDING_REVIEW)) {
                throw new error_handler_js_1.ValidationError(`Cannot complete debrief in status ${current.status}`);
            }
            // Calculate duration
            const durationMinutes = current.startedAt
                ? Math.round((validated.endedAt.getTime() - current.startedAt.getTime()) / 60000)
                : 0;
            const result = await session.run(`
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET d.status = 'PENDING_REVIEW',
            d.endedAt = datetime($endedAt),
            d.durationMinutes = $durationMinutes,
            d.processedNotes = $processedNotes,
            d.securityAssessment = $securityAssessment,
            d.updatedAt = datetime(),
            d.updatedBy = $userId
        RETURN d
        `, {
                id: validated.id,
                tenantId,
                endedAt: validated.endedAt.toISOString(),
                durationMinutes,
                processedNotes: validated.processedNotes,
                securityAssessment: JSON.stringify(validated.securityAssessment),
                userId,
            });
            // Create intelligence item nodes
            for (const intel of validated.intelligenceItems) {
                await session.run(`
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
          `, {
                    id: intel.id,
                    debriefId: validated.id,
                    topic: intel.topic,
                    content: intel.content,
                    informationRating: intel.informationRating,
                    classification: intel.classification,
                    actionability: intel.actionability,
                    requiresCorroboration: intel.requiresCorroboration,
                });
            }
            // Update source statistics
            await session.run(`
        MATCH (d:HumintDebrief {id: $debriefId})-[:DEBRIEF_OF]->(s:HumintSource)
        SET s.totalDebriefs = s.totalDebriefs + 1,
            s.intelligenceReportsCount = s.intelligenceReportsCount + $intelCount,
            s.actionableIntelCount = s.actionableIntelCount + $actionableCount
        `, {
                debriefId: validated.id,
                intelCount: validated.intelligenceItems.length,
                actionableCount: validated.intelligenceItems.filter((i) => i.actionability === 'IMMEDIATE' || i.actionability === 'SHORT_TERM').length,
            });
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
        }
        finally {
            await session.close();
        }
    }
    /**
     * Review and approve/reject debrief
     */
    async reviewDebrief(input, userId, tenantId) {
        const validated = humint_types_1.ReviewDebriefSchema.parse(input);
        const session = this.ctx.getNeo4jSession();
        try {
            const current = await this.getDebrief(validated.id, tenantId);
            const targetStatus = validated.approved
                ? humint_types_1.DEBRIEF_STATUS.APPROVED
                : humint_types_1.DEBRIEF_STATUS.ACTION_REQUIRED;
            if (!(0, humint_types_1.isValidTransition)(current.status, targetStatus)) {
                throw new error_handler_js_1.ValidationError(`Cannot transition from ${current.status} to ${targetStatus}`);
            }
            const result = await session.run(`
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        SET d.status = $status,
            d.reviewerId = $reviewerId,
            d.reviewNotes = $reviewNotes,
            d.reviewedAt = datetime(),
            d.updatedAt = datetime(),
            d.updatedBy = $userId
        RETURN d
        `, {
                id: validated.id,
                tenantId,
                status: targetStatus,
                reviewerId: userId,
                reviewNotes: validated.reviewNotes,
                userId,
            });
            await this.logAuditEvent(session, {
                debriefId: validated.id,
                sourceId: current.sourceId,
                eventType: validated.approved ? 'DEBRIEF_APPROVED' : 'DEBRIEF_RETURNED',
                actorId: userId,
                details: { reviewNotes: validated.reviewNotes },
            });
            return this.mapRecordToDebrief(result.records[0].get('d'));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get debrief by ID
     */
    async getDebrief(id, tenantId) {
        const session = this.ctx.getNeo4jSession();
        try {
            const result = await session.run(`
        MATCH (d:HumintDebrief {id: $id, tenantId: $tenantId})
        RETURN d
        `, { id, tenantId });
            if (result.records.length === 0) {
                throw new error_handler_js_1.NotFoundError('Debrief', id);
            }
            return this.mapRecordToDebrief(result.records[0].get('d'));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Search debriefs
     */
    async searchDebriefs(criteria, tenantId) {
        const validated = humint_types_1.DebriefSearchCriteriaSchema.parse(criteria);
        const session = this.ctx.getNeo4jSession();
        try {
            const whereClauses = ['d.tenantId = $tenantId'];
            const params = { tenantId };
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
            const countResult = await session.run(`
        MATCH (d:HumintDebrief)
        WHERE ${whereClause}
        RETURN count(d) as total
        `, params);
            const total = countResult.records[0].get('total').toNumber();
            // Get results
            const result = await session.run(`
        MATCH (d:HumintDebrief)
        WHERE ${whereClause}
        RETURN d
        ORDER BY d.scheduledAt DESC
        SKIP $offset
        LIMIT $limit
        `, { ...params, offset: validated.offset, limit: validated.limit });
            const debriefs = result.records.map((r) => this.mapRecordToDebrief(r.get('d')));
            return { debriefs, total };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Generate debrief report for dissemination
     */
    async generateReport(debriefId, tenantId) {
        const debrief = await this.getDebrief(debriefId, tenantId);
        if (debrief.status !== humint_types_1.DEBRIEF_STATUS.APPROVED) {
            throw new error_handler_js_1.ValidationError('Can only generate reports for approved debriefs');
        }
        const session = this.ctx.getNeo4jSession();
        try {
            // Get intelligence items
            const intelResult = await session.run(`
        MATCH (i:HumintIntelligence)-[:EXTRACTED_FROM]->(d:HumintDebrief {id: $debriefId})
        RETURN i
        `, { debriefId });
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
                id: (0, uuid_1.v4)(),
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
                    .filter((i) => i.actionability === 'IMMEDIATE' || i.actionability === 'SHORT_TERM')
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
        }
        finally {
            await session.close();
        }
    }
    // ============================================================================
    // Private Helpers
    // ============================================================================
    mapRecordToDebrief(record) {
        const props = record.properties || record;
        return {
            id: props.id,
            tenantId: props.tenantId,
            sourceId: props.sourceId,
            sourceCryptonym: props.sourceCryptonym,
            handlerId: props.handlerId,
            debriefType: props.debriefType,
            status: props.status,
            scheduledAt: new Date(props.scheduledAt),
            startedAt: props.startedAt ? new Date(props.startedAt) : undefined,
            endedAt: props.endedAt ? new Date(props.endedAt) : undefined,
            durationMinutes: props.durationMinutes,
            location: {
                type: props.locationType || 'OTHER',
                identifier: props.locationId || '',
                securityVerified: false,
            },
            objectives: props.objectives || [],
            topicsCovered: props.topicsCovered || [],
            rawNotes: props.rawNotes || '',
            processedNotes: props.processedNotes || '',
            intelligenceItems: [],
            taskings: [],
            securityAssessment: props.securityAssessment
                ? JSON.parse(props.securityAssessment)
                : undefined,
            sourceDemeanor: props.sourceDemeanor || '',
            credibilityObservations: props.credibilityObservations || '',
            payments: [],
            attachments: [],
            reviewerId: props.reviewerId,
            reviewNotes: props.reviewNotes,
            reviewedAt: props.reviewedAt
                ? new Date(props.reviewedAt)
                : undefined,
            dissemination: [],
            policyLabels: {
                classification: props.classification ||
                    'UNCLASSIFIED',
                caveats: [],
                releasableTo: [],
                originatorControl: false,
                legalBasis: '',
                needToKnow: [],
                retentionPeriod: 365,
            },
            provenance: [],
            previousDebriefId: props.previousDebriefId,
            nextDebriefId: props.nextDebriefId,
            createdAt: new Date(props.createdAt),
            updatedAt: new Date(props.updatedAt),
            createdBy: props.createdBy,
            updatedBy: props.updatedBy || props.createdBy,
            version: Number(props.version) || 1,
        };
    }
    async logAuditEvent(session, event) {
        await session.run(`
      CREATE (a:HumintAuditEvent {
        id: $id,
        debriefId: $debriefId,
        sourceId: $sourceId,
        eventType: $eventType,
        actorId: $actorId,
        timestamp: datetime(),
        details: $details
      })
      `, {
            id: (0, uuid_1.v4)(),
            debriefId: event.debriefId,
            sourceId: event.sourceId,
            eventType: event.eventType,
            actorId: event.actorId,
            details: JSON.stringify(event.details),
        });
    }
}
exports.DebriefService = DebriefService;
