"use strict";
/**
 * @fileoverview Investigation workflow tools for Strands Agents
 * Provides tools for managing investigations, hypotheses, and findings
 * @module @intelgraph/strands-agents/tools/investigation-tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTimelineInputSchema = exports.GenerateSummaryInputSchema = exports.LinkEntitiesToInvestigationInputSchema = exports.AddFindingInputSchema = exports.UpdateHypothesisInputSchema = exports.CreateHypothesisInputSchema = exports.GetInvestigationInputSchema = void 0;
exports.createInvestigationTools = createInvestigationTools;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
// ============================================================================
// Tool Input Schemas
// ============================================================================
exports.GetInvestigationInputSchema = zod_1.z.object({
    investigationId: zod_1.z.string().uuid(),
    includeEntities: zod_1.z.boolean().default(true),
    includeHypotheses: zod_1.z.boolean().default(true),
    includeFindings: zod_1.z.boolean().default(true),
});
exports.CreateHypothesisInputSchema = zod_1.z.object({
    investigationId: zod_1.z.string().uuid(),
    statement: zod_1.z.string().min(10).max(1000).describe('Clear hypothesis statement'),
    supportingEvidence: zod_1.z.array(zod_1.z.string()).default([]),
    initialConfidence: zod_1.z.number().min(0).max(1).default(0.5),
    reasoning: zod_1.z.string().optional().describe('Reasoning behind the hypothesis'),
});
exports.UpdateHypothesisInputSchema = zod_1.z.object({
    hypothesisId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['PROPOSED', 'TESTING', 'SUPPORTED', 'REFUTED', 'INCONCLUSIVE']).optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    addSupportingEvidence: zod_1.z.array(zod_1.z.string()).optional(),
    addContradictingEvidence: zod_1.z.array(zod_1.z.string()).optional(),
    reasoning: zod_1.z.string().optional(),
});
exports.AddFindingInputSchema = zod_1.z.object({
    investigationId: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(10).describe('Finding content'),
    entityIds: zod_1.z.array(zod_1.z.string().uuid()).optional().describe('Related entities'),
    importance: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    source: zod_1.z.string().optional(),
});
exports.LinkEntitiesToInvestigationInputSchema = zod_1.z.object({
    investigationId: zod_1.z.string().uuid(),
    entityIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    reason: zod_1.z.string().optional(),
});
exports.GenerateSummaryInputSchema = zod_1.z.object({
    investigationId: zod_1.z.string().uuid(),
    format: zod_1.z.enum(['brief', 'detailed', 'executive']).default('detailed'),
    includeSections: zod_1.z.array(zod_1.z.enum([
        'overview',
        'entities',
        'relationships',
        'hypotheses',
        'findings',
        'timeline',
        'recommendations',
    ])).default(['overview', 'entities', 'hypotheses', 'findings']),
});
exports.GetTimelineInputSchema = zod_1.z.object({
    investigationId: zod_1.z.string().uuid(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Creates investigation workflow tools for Strands Agents
 */
function createInvestigationTools(config) {
    const { driver, database = 'neo4j', auditLog, userId = 'agent' } = config;
    const logAudit = (action, details) => {
        if (auditLog) {
            auditLog(action, { ...details, userId, timestamp: new Date().toISOString() });
        }
    };
    // ---------------------------------------------------------------------------
    // Get Investigation Tool
    // ---------------------------------------------------------------------------
    const getInvestigation = {
        name: 'get_investigation',
        description: `Retrieve comprehensive details about an investigation.
Includes entities, hypotheses, findings, and relationships.
Use this to understand the current state of an investigation.`,
        inputSchema: exports.GetInvestigationInputSchema,
        callback: async (input) => {
            const startTime = Date.now();
            const { investigationId, includeEntities, includeHypotheses, includeFindings } = input;
            let session = null;
            try {
                session = driver.session({ database, defaultAccessMode: 'READ' });
                const query = `
          MATCH (i:Investigation {id: $investigationId})

          ${includeEntities ? `
          OPTIONAL MATCH (i)-[:CONTAINS]->(e:Entity)
          WITH i, collect(e { .id, .type, .label, .confidence })[0..50] as entities
          ` : 'WITH i, [] as entities'}

          ${includeHypotheses ? `
          OPTIONAL MATCH (i)-[:HAS_HYPOTHESIS]->(h:Hypothesis)
          WITH i, entities, collect(h { .* })[0..20] as hypotheses
          ` : 'WITH i, entities, [] as hypotheses'}

          ${includeFindings ? `
          OPTIONAL MATCH (i)-[:HAS_FINDING]->(f:Finding)
          WITH i, entities, hypotheses, collect(f { .* })[0..50] as findings
          ` : 'WITH i, entities, hypotheses, [] as findings'}

          RETURN i { .* } as investigation,
                 entities,
                 hypotheses,
                 findings
        `;
                const result = await session.run(query, { investigationId });
                if (result.records.length === 0) {
                    return JSON.stringify({
                        success: false,
                        error: `Investigation not found: ${investigationId}`,
                    });
                }
                const record = result.records[0];
                const executionTimeMs = Date.now() - startTime;
                return JSON.stringify({
                    success: true,
                    data: {
                        investigation: record.get('investigation'),
                        entities: record.get('entities'),
                        hypotheses: record.get('hypotheses'),
                        findings: record.get('findings'),
                        metadata: { executionTimeMs },
                    },
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return JSON.stringify({
                    success: false,
                    error: `Failed to get investigation: ${errorMessage}`,
                });
            }
            finally {
                if (session) {
                    await session.close();
                }
            }
        },
    };
    // ---------------------------------------------------------------------------
    // Create Hypothesis Tool
    // ---------------------------------------------------------------------------
    const createHypothesis = {
        name: 'create_hypothesis',
        description: `Create a new hypothesis for an investigation.
A hypothesis is a testable statement about relationships or patterns.
Include initial supporting evidence and reasoning.`,
        inputSchema: exports.CreateHypothesisInputSchema,
        callback: async (input) => {
            const startTime = Date.now();
            const { investigationId, statement, supportingEvidence, initialConfidence, reasoning } = input;
            let session = null;
            try {
                session = driver.session({ database, defaultAccessMode: 'WRITE' });
                const hypothesisId = (0, uuid_1.v4)();
                const now = new Date().toISOString();
                const query = `
          MATCH (i:Investigation {id: $investigationId})
          CREATE (h:Hypothesis {
            id: $hypothesisId,
            statement: $statement,
            supportingEvidence: $supportingEvidence,
            contradictingEvidence: [],
            confidence: $confidence,
            status: 'PROPOSED',
            reasoning: $reasoning,
            createdAt: $now,
            createdBy: $createdBy
          })
          CREATE (i)-[:HAS_HYPOTHESIS]->(h)
          RETURN h { .* } as hypothesis
        `;
                const result = await session.run(query, {
                    investigationId,
                    hypothesisId,
                    statement,
                    supportingEvidence,
                    confidence: initialConfidence,
                    reasoning: reasoning || '',
                    now,
                    createdBy: userId,
                });
                if (result.records.length === 0) {
                    return JSON.stringify({
                        success: false,
                        error: `Investigation not found: ${investigationId}`,
                    });
                }
                const hypothesis = result.records[0].get('hypothesis');
                const executionTimeMs = Date.now() - startTime;
                logAudit('hypothesis_created', { hypothesisId, investigationId, statement });
                return JSON.stringify({
                    success: true,
                    data: {
                        hypothesis,
                        metadata: { executionTimeMs },
                    },
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return JSON.stringify({
                    success: false,
                    error: `Failed to create hypothesis: ${errorMessage}`,
                });
            }
            finally {
                if (session) {
                    await session.close();
                }
            }
        },
    };
    // ---------------------------------------------------------------------------
    // Update Hypothesis Tool
    // ---------------------------------------------------------------------------
    const updateHypothesis = {
        name: 'update_hypothesis',
        description: `Update a hypothesis with new evidence, status, or confidence.
Use this as you gather evidence that supports or contradicts the hypothesis.`,
        inputSchema: exports.UpdateHypothesisInputSchema,
        callback: async (input) => {
            const startTime = Date.now();
            const { hypothesisId, status, confidence, addSupportingEvidence, addContradictingEvidence, reasoning, } = input;
            let session = null;
            try {
                session = driver.session({ database, defaultAccessMode: 'WRITE' });
                const updates = ['h.updatedAt = $now'];
                const params = {
                    hypothesisId,
                    now: new Date().toISOString(),
                };
                if (status) {
                    updates.push('h.status = $status');
                    params.status = status;
                }
                if (confidence !== undefined) {
                    updates.push('h.confidence = $confidence');
                    params.confidence = confidence;
                }
                if (reasoning) {
                    updates.push('h.reasoning = $reasoning');
                    params.reasoning = reasoning;
                }
                if (addSupportingEvidence?.length) {
                    updates.push('h.supportingEvidence = h.supportingEvidence + $addSupporting');
                    params.addSupporting = addSupportingEvidence;
                }
                if (addContradictingEvidence?.length) {
                    updates.push('h.contradictingEvidence = h.contradictingEvidence + $addContradicting');
                    params.addContradicting = addContradictingEvidence;
                }
                const query = `
          MATCH (h:Hypothesis {id: $hypothesisId})
          SET ${updates.join(', ')}
          RETURN h { .* } as hypothesis
        `;
                const result = await session.run(query, params);
                if (result.records.length === 0) {
                    return JSON.stringify({
                        success: false,
                        error: `Hypothesis not found: ${hypothesisId}`,
                    });
                }
                const hypothesis = result.records[0].get('hypothesis');
                const executionTimeMs = Date.now() - startTime;
                logAudit('hypothesis_updated', { hypothesisId, updates: Object.keys(params) });
                return JSON.stringify({
                    success: true,
                    data: {
                        hypothesis,
                        metadata: { executionTimeMs },
                    },
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return JSON.stringify({
                    success: false,
                    error: `Failed to update hypothesis: ${errorMessage}`,
                });
            }
            finally {
                if (session) {
                    await session.close();
                }
            }
        },
    };
    // ---------------------------------------------------------------------------
    // Add Finding Tool
    // ---------------------------------------------------------------------------
    const addFinding = {
        name: 'add_finding',
        description: `Add a finding to an investigation.
Findings are discovered facts or insights during analysis.
Link findings to related entities for traceability.`,
        inputSchema: exports.AddFindingInputSchema,
        callback: async (input) => {
            const startTime = Date.now();
            const { investigationId, content, entityIds, importance, source } = input;
            let session = null;
            try {
                session = driver.session({ database, defaultAccessMode: 'WRITE' });
                const findingId = (0, uuid_1.v4)();
                const now = new Date().toISOString();
                const query = `
          MATCH (i:Investigation {id: $investigationId})
          CREATE (f:Finding {
            id: $findingId,
            content: $content,
            importance: $importance,
            source: $source,
            createdAt: $now,
            createdBy: $createdBy
          })
          CREATE (i)-[:HAS_FINDING]->(f)

          ${entityIds?.length ? `
          WITH f
          UNWIND $entityIds as entityId
          MATCH (e:Entity {id: entityId})
          CREATE (f)-[:RELATES_TO]->(e)
          ` : ''}

          WITH f
          RETURN f { .* } as finding
        `;
                const result = await session.run(query, {
                    investigationId,
                    findingId,
                    content,
                    importance,
                    source: source || 'agent_analysis',
                    entityIds: entityIds || [],
                    now,
                    createdBy: userId,
                });
                if (result.records.length === 0) {
                    return JSON.stringify({
                        success: false,
                        error: `Investigation not found: ${investigationId}`,
                    });
                }
                const finding = result.records[0].get('finding');
                const executionTimeMs = Date.now() - startTime;
                logAudit('finding_added', { findingId, investigationId, importance });
                return JSON.stringify({
                    success: true,
                    data: {
                        finding,
                        metadata: { executionTimeMs },
                    },
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return JSON.stringify({
                    success: false,
                    error: `Failed to add finding: ${errorMessage}`,
                });
            }
            finally {
                if (session) {
                    await session.close();
                }
            }
        },
    };
    // ---------------------------------------------------------------------------
    // Link Entities to Investigation Tool
    // ---------------------------------------------------------------------------
    const linkEntitiesToInvestigation = {
        name: 'link_entities_to_investigation',
        description: `Add entities to an investigation's scope.
Links existing entities to the investigation for tracking and analysis.`,
        inputSchema: exports.LinkEntitiesToInvestigationInputSchema,
        callback: async (input) => {
            const startTime = Date.now();
            const { investigationId, entityIds, reason } = input;
            let session = null;
            try {
                session = driver.session({ database, defaultAccessMode: 'WRITE' });
                const query = `
          MATCH (i:Investigation {id: $investigationId})
          UNWIND $entityIds as entityId
          MATCH (e:Entity {id: entityId})
          MERGE (i)-[r:CONTAINS]->(e)
          ON CREATE SET r.addedAt = $now, r.reason = $reason
          RETURN count(r) as linkedCount
        `;
                const result = await session.run(query, {
                    investigationId,
                    entityIds,
                    reason: reason || '',
                    now: new Date().toISOString(),
                });
                const linkedCount = result.records[0]?.get('linkedCount')?.toNumber() || 0;
                const executionTimeMs = Date.now() - startTime;
                logAudit('entities_linked', { investigationId, count: linkedCount });
                return JSON.stringify({
                    success: true,
                    data: {
                        investigationId,
                        linkedCount,
                        metadata: { executionTimeMs },
                    },
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return JSON.stringify({
                    success: false,
                    error: `Failed to link entities: ${errorMessage}`,
                });
            }
            finally {
                if (session) {
                    await session.close();
                }
            }
        },
    };
    // ---------------------------------------------------------------------------
    // Get Timeline Tool
    // ---------------------------------------------------------------------------
    const getTimeline = {
        name: 'get_timeline',
        description: `Get a chronological timeline of events related to an investigation.
Extracts temporal data from entities and relationships.
Useful for understanding the sequence of events.`,
        inputSchema: exports.GetTimelineInputSchema,
        callback: async (input) => {
            const startTime = Date.now();
            const { investigationId, startDate, endDate, eventTypes } = input;
            let session = null;
            try {
                session = driver.session({ database, defaultAccessMode: 'READ' });
                const dateFilters = [];
                if (startDate)
                    dateFilters.push('event.timestamp >= $startDate');
                if (endDate)
                    dateFilters.push('event.timestamp <= $endDate');
                const dateFilter = dateFilters.length ? `WHERE ${dateFilters.join(' AND ')}` : '';
                const typeFilter = eventTypes?.length
                    ? `AND event.type IN $eventTypes`
                    : '';
                const query = `
          MATCH (i:Investigation {id: $investigationId})-[:CONTAINS]->(e:Entity)
          OPTIONAL MATCH (e)-[:HAS_EVENT]->(event:Event)
          ${dateFilter} ${typeFilter}
          WITH event
          WHERE event IS NOT NULL
          RETURN event { .* } as event
          ORDER BY event.timestamp ASC
          LIMIT 100
        `;
                const result = await session.run(query, {
                    investigationId,
                    startDate,
                    endDate,
                    eventTypes,
                });
                const events = result.records.map((r) => r.get('event'));
                const executionTimeMs = Date.now() - startTime;
                return JSON.stringify({
                    success: true,
                    data: {
                        investigationId,
                        events,
                        metadata: {
                            count: events.length,
                            executionTimeMs,
                        },
                    },
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return JSON.stringify({
                    success: false,
                    error: `Failed to get timeline: ${errorMessage}`,
                });
            }
            finally {
                if (session) {
                    await session.close();
                }
            }
        },
    };
    return {
        getInvestigation,
        createHypothesis,
        updateHypothesis,
        addFinding,
        linkEntitiesToInvestigation,
        getTimeline,
        all: [
            getInvestigation,
            createHypothesis,
            updateHypothesis,
            addFinding,
            linkEntitiesToInvestigation,
            getTimeline,
        ],
    };
}
