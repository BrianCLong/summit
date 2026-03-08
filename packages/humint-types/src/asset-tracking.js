"use strict";
/**
 * HUMINT Asset Tracking Types
 *
 * Types and schemas for tracking HUMINT assets and their integration
 * with the knowledge graph.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetTrackingQuerySchema = exports.CreateGraphLinkSchema = exports.CreateRiskIndicatorSchema = exports.CreateAssetActivitySchema = exports.AssetGraphLinkSchema = exports.RiskIndicatorSchema = exports.AssetActivitySchema = exports.GeoLocationSchema = void 0;
exports.buildNetworkQuery = buildNetworkQuery;
exports.buildPathQuery = buildPathQuery;
const zod_1 = require("zod");
const schemas_js_1 = require("./schemas.js");
// ============================================================================
// Asset Tracking Schemas
// ============================================================================
exports.GeoLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    altitude: zod_1.z.number().optional(),
    accuracy: zod_1.z.number().positive(),
    timestamp: zod_1.z.coerce.date(),
    source: zod_1.z.enum(['GPS', 'CELL', 'WIFI', 'MANUAL', 'REPORTED']),
});
exports.AssetActivitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceId: zod_1.z.string().uuid(),
    activityType: zod_1.z.enum([
        'CONTACT',
        'TRAVEL',
        'MEETING',
        'COMMUNICATION',
        'DOCUMENT_ACCESS',
        'FINANCIAL',
        'OPERATIONAL',
    ]),
    timestamp: zod_1.z.coerce.date(),
    duration: zod_1.z.number().int().positive().optional(),
    location: exports.GeoLocationSchema.optional(),
    participants: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string().min(1).max(5000),
    classification: zod_1.z.enum([
        'UNCLASSIFIED',
        'CONFIDENTIAL',
        'SECRET',
        'TOP_SECRET',
        'TOP_SECRET_SCI',
    ]),
    verificationStatus: zod_1.z.enum(['UNVERIFIED', 'VERIFIED', 'DISPUTED']),
    relatedDebriefId: zod_1.z.string().uuid().optional(),
    linkedEntityIds: zod_1.z.array(zod_1.z.string().uuid()),
});
exports.RiskIndicatorSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceId: zod_1.z.string().uuid(),
    indicatorType: zod_1.z.enum([
        'BEHAVIORAL',
        'COMMUNICATION',
        'FINANCIAL',
        'TRAVEL',
        'COUNTERINTEL',
        'OPERATIONAL',
    ]),
    severity: schemas_js_1.RiskLevelSchema,
    description: zod_1.z.string().min(1).max(2000),
    detectedAt: zod_1.z.coerce.date(),
    detectionMethod: zod_1.z.enum(['AUTOMATED', 'HANDLER', 'ANALYST', 'EXTERNAL']),
    status: zod_1.z.enum(['ACTIVE', 'MITIGATED', 'DISMISSED', 'ESCALATED']),
    mitigationActions: zod_1.z.array(zod_1.z.string()),
});
exports.AssetGraphLinkSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().uuid(),
    entityType: zod_1.z.string().min(1),
    relationshipType: zod_1.z.enum([
        'REPORTS_ON',
        'HAS_ACCESS_TO',
        'HANDLES',
        'DEBRIEFED_BY',
        'DERIVED_FROM_SOURCE',
        'CORROBORATES',
        'CONTRADICTS',
        'RECRUITED_BY',
        'AFFILIATED_WITH',
        'OPERATES_IN',
        'COMPENSATED_BY',
        'TASKED_WITH',
    ]),
    direction: zod_1.z.enum(['OUTBOUND', 'INBOUND', 'BIDIRECTIONAL']),
    strength: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(100),
    validFrom: zod_1.z.coerce.date(),
    validTo: zod_1.z.coerce.date().optional(),
    properties: zod_1.z.record(zod_1.z.unknown()),
});
exports.CreateAssetActivitySchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    activityType: zod_1.z.enum([
        'CONTACT',
        'TRAVEL',
        'MEETING',
        'COMMUNICATION',
        'DOCUMENT_ACCESS',
        'FINANCIAL',
        'OPERATIONAL',
    ]),
    timestamp: zod_1.z.coerce.date(),
    duration: zod_1.z.number().int().positive().optional(),
    location: exports.GeoLocationSchema.optional(),
    participants: zod_1.z.array(zod_1.z.string()).default([]),
    description: zod_1.z.string().min(1).max(5000),
    classification: zod_1.z.enum([
        'UNCLASSIFIED',
        'CONFIDENTIAL',
        'SECRET',
        'TOP_SECRET',
        'TOP_SECRET_SCI',
    ]),
    relatedDebriefId: zod_1.z.string().uuid().optional(),
    linkedEntityIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
exports.CreateRiskIndicatorSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    indicatorType: zod_1.z.enum([
        'BEHAVIORAL',
        'COMMUNICATION',
        'FINANCIAL',
        'TRAVEL',
        'COUNTERINTEL',
        'OPERATIONAL',
    ]),
    severity: schemas_js_1.RiskLevelSchema,
    description: zod_1.z.string().min(1).max(2000),
    detectionMethod: zod_1.z.enum(['AUTOMATED', 'HANDLER', 'ANALYST', 'EXTERNAL']),
    mitigationActions: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.CreateGraphLinkSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    entityId: zod_1.z.string().uuid(),
    entityType: zod_1.z.string().min(1),
    relationshipType: zod_1.z.enum([
        'REPORTS_ON',
        'HAS_ACCESS_TO',
        'HANDLES',
        'DEBRIEFED_BY',
        'DERIVED_FROM_SOURCE',
        'CORROBORATES',
        'CONTRADICTS',
        'RECRUITED_BY',
        'AFFILIATED_WITH',
        'OPERATES_IN',
        'COMPENSATED_BY',
        'TASKED_WITH',
    ]),
    direction: zod_1.z.enum(['OUTBOUND', 'INBOUND', 'BIDIRECTIONAL']),
    strength: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(100),
    validFrom: zod_1.z.coerce.date().default(() => new Date()),
    validTo: zod_1.z.coerce.date().optional(),
    properties: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.AssetTrackingQuerySchema = zod_1.z.object({
    sourceIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    statuses: zod_1.z.array(schemas_js_1.SourceStatusSchema).optional(),
    riskLevels: zod_1.z.array(schemas_js_1.RiskLevelSchema).optional(),
    hasActiveIndicators: zod_1.z.boolean().optional(),
    lastContactBefore: zod_1.z.coerce.date().optional(),
    lastContactAfter: zod_1.z.coerce.date().optional(),
    areaOfOperation: zod_1.z.array(zod_1.z.string()).optional(),
    handlerId: zod_1.z.string().uuid().optional(),
    includeActivities: zod_1.z.boolean().default(false),
    includeGraphLinks: zod_1.z.boolean().default(false),
    includeRiskIndicators: zod_1.z.boolean().default(false),
    limit: zod_1.z.number().int().positive().max(100).default(20),
    offset: zod_1.z.number().int().nonnegative().default(0),
});
// ============================================================================
// Graph Query Builders
// ============================================================================
/**
 * Build Neo4j Cypher query for asset network
 */
function buildNetworkQuery(sourceId, depth = 2, relationshipTypes) {
    const relFilter = relationshipTypes?.length
        ? `:${relationshipTypes.join('|')}`
        : '';
    return `
    MATCH path = (s:HumintSource {id: $sourceId})-[r${relFilter}*1..${depth}]-(connected)
    WHERE connected:Person OR connected:Organization OR connected:Location
    WITH s, connected, relationships(path) as rels
    RETURN
      s.id as sourceId,
      collect(DISTINCT {
        id: connected.id,
        type: labels(connected)[0],
        label: connected.name,
        properties: properties(connected)
      }) as nodes,
      collect(DISTINCT {
        source: startNode(last(rels)).id,
        target: endNode(last(rels)).id,
        type: type(last(rels)),
        properties: properties(last(rels))
      }) as edges
  `;
}
/**
 * Build Neo4j Cypher query for path analysis
 */
function buildPathQuery(sourceId, targetEntityId, maxHops = 5) {
    return `
    MATCH path = shortestPath(
      (s:HumintSource {id: $sourceId})-[*1..${maxHops}]-(t {id: $targetEntityId})
    )
    RETURN
      [n IN nodes(path) | {
        id: n.id,
        type: labels(n)[0],
        label: coalesce(n.name, n.cryptonym, n.id)
      }] as pathNodes,
      [r IN relationships(path) | {
        type: type(r),
        properties: properties(r)
      }] as pathRelationships,
      length(path) as hops
  `;
}
