/**
 * Asset Tracking Service
 *
 * Manages HUMINT asset tracking with knowledge graph fusion.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AssetActivity,
  RiskIndicator,
  AssetGraphLink,
  NetworkAnalysis,
  AssetDashboard,
  AssetTrackingResult,
  CreateAssetActivitySchema,
  CreateRiskIndicatorSchema,
  CreateGraphLinkSchema,
  AssetTrackingQuerySchema,
  CreateAssetActivityInput,
  CreateRiskIndicatorInput,
  CreateGraphLinkInput,
  AssetTrackingQueryInput,
  buildNetworkQuery,
  buildPathQuery,
  VALIDATION_THRESHOLDS,
} from '@intelgraph/humint-types';
import { ServiceContext } from '../context.js';
import { NotFoundError, ValidationError } from '../middleware/error-handler.js';

export class AssetTrackingService {
  constructor(private ctx: ServiceContext) {}

  /**
   * Record asset activity
   */
  async recordActivity(
    input: CreateAssetActivityInput,
    userId: string,
    tenantId: string,
  ): Promise<AssetActivity> {
    const validated = CreateAssetActivitySchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      // Verify source exists
      const sourceResult = await session.run(
        `MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId}) RETURN s`,
        { sourceId: validated.sourceId, tenantId },
      );

      if (sourceResult.records.length === 0) {
        throw new NotFoundError('Source', validated.sourceId);
      }

      const id = uuidv4();
      const activity: AssetActivity = {
        id,
        sourceId: validated.sourceId,
        activityType: validated.activityType,
        timestamp: validated.timestamp,
        duration: validated.duration,
        location: validated.location,
        participants: validated.participants,
        description: validated.description,
        classification: validated.classification,
        verificationStatus: 'UNVERIFIED',
        relatedDebriefId: validated.relatedDebriefId,
        linkedEntityIds: validated.linkedEntityIds,
      };

      // Create activity node
      await session.run(
        `
        CREATE (a:HumintActivity {
          id: $id,
          sourceId: $sourceId,
          tenantId: $tenantId,
          activityType: $activityType,
          timestamp: datetime($timestamp),
          duration: $duration,
          description: $description,
          classification: $classification,
          verificationStatus: $verificationStatus,
          relatedDebriefId: $relatedDebriefId,
          createdAt: datetime(),
          createdBy: $createdBy
        })
        WITH a
        MATCH (s:HumintSource {id: $sourceId})
        CREATE (a)-[:ACTIVITY_OF]->(s)
        RETURN a
        `,
        {
          id,
          sourceId: validated.sourceId,
          tenantId,
          activityType: validated.activityType,
          timestamp: validated.timestamp.toISOString(),
          duration: validated.duration || null,
          description: validated.description,
          classification: validated.classification,
          verificationStatus: 'UNVERIFIED',
          relatedDebriefId: validated.relatedDebriefId || null,
          createdBy: userId,
        },
      );

      // Add location if provided
      if (validated.location) {
        await session.run(
          `
          MATCH (a:HumintActivity {id: $activityId})
          SET a.location = point({
            latitude: $latitude,
            longitude: $longitude
          }),
          a.locationAccuracy = $accuracy,
          a.locationSource = $source
          `,
          {
            activityId: id,
            latitude: validated.location.latitude,
            longitude: validated.location.longitude,
            accuracy: validated.location.accuracy,
            source: validated.location.source,
          },
        );
      }

      // Link to related entities
      for (const entityId of validated.linkedEntityIds) {
        await session.run(
          `
          MATCH (a:HumintActivity {id: $activityId})
          MATCH (e {id: $entityId})
          CREATE (a)-[:INVOLVES]->(e)
          `,
          { activityId: id, entityId },
        );
      }

      this.ctx.logger.info(
        { activityId: id, sourceId: validated.sourceId },
        'Activity recorded',
      );

      return activity;
    } finally {
      await session.close();
    }
  }

  /**
   * Create risk indicator for source
   */
  async createRiskIndicator(
    input: CreateRiskIndicatorInput,
    userId: string,
    tenantId: string,
  ): Promise<RiskIndicator> {
    const validated = CreateRiskIndicatorSchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      const id = uuidv4();
      const indicator: RiskIndicator = {
        id,
        sourceId: validated.sourceId,
        indicatorType: validated.indicatorType,
        severity: validated.severity,
        description: validated.description,
        detectedAt: new Date(),
        detectionMethod: validated.detectionMethod,
        status: 'ACTIVE',
        mitigationActions: validated.mitigationActions,
        resolvedAt: undefined,
        resolvedBy: undefined,
      };

      await session.run(
        `
        CREATE (r:HumintRiskIndicator {
          id: $id,
          sourceId: $sourceId,
          tenantId: $tenantId,
          indicatorType: $indicatorType,
          severity: $severity,
          description: $description,
          detectedAt: datetime(),
          detectionMethod: $detectionMethod,
          status: 'ACTIVE',
          mitigationActions: $mitigationActions,
          createdBy: $createdBy
        })
        WITH r
        MATCH (s:HumintSource {id: $sourceId})
        CREATE (r)-[:RISK_OF]->(s)
        RETURN r
        `,
        {
          id,
          sourceId: validated.sourceId,
          tenantId,
          indicatorType: validated.indicatorType,
          severity: validated.severity,
          description: validated.description,
          detectionMethod: validated.detectionMethod,
          mitigationActions: validated.mitigationActions,
          createdBy: userId,
        },
      );

      // Update source risk level if indicator is high severity
      if (validated.severity === 'HIGH' || validated.severity === 'CRITICAL') {
        await session.run(
          `
          MATCH (s:HumintSource {id: $sourceId})
          SET s.riskLevel = $riskLevel,
              s.updatedAt = datetime()
          `,
          { sourceId: validated.sourceId, riskLevel: validated.severity },
        );
      }

      this.ctx.logger.warn(
        { indicatorId: id, sourceId: validated.sourceId, severity: validated.severity },
        'Risk indicator created',
      );

      return indicator;
    } finally {
      await session.close();
    }
  }

  /**
   * Create graph link between source and entity
   */
  async createGraphLink(
    input: CreateGraphLinkInput,
    userId: string,
    tenantId: string,
  ): Promise<AssetGraphLink> {
    const validated = CreateGraphLinkSchema.parse(input);

    const session = this.ctx.getNeo4jSession();
    try {
      const id = uuidv4();
      const link: AssetGraphLink = {
        id,
        sourceId: validated.sourceId,
        entityId: validated.entityId,
        entityType: validated.entityType,
        relationshipType: validated.relationshipType,
        direction: validated.direction,
        strength: validated.strength,
        confidence: validated.confidence,
        validFrom: validated.validFrom,
        validTo: validated.validTo,
        properties: validated.properties,
        lastVerified: undefined,
        createdAt: new Date(),
        createdBy: userId,
      };

      // Create relationship based on direction
      const relQuery =
        validated.direction === 'INBOUND'
          ? `
            MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
            MATCH (e {id: $entityId})
            CREATE (e)-[r:${validated.relationshipType} {
              id: $linkId,
              strength: $strength,
              confidence: $confidence,
              validFrom: datetime($validFrom),
              validTo: $validTo,
              createdAt: datetime(),
              createdBy: $createdBy
            }]->(s)
            RETURN r
          `
          : `
            MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
            MATCH (e {id: $entityId})
            CREATE (s)-[r:${validated.relationshipType} {
              id: $linkId,
              strength: $strength,
              confidence: $confidence,
              validFrom: datetime($validFrom),
              validTo: $validTo,
              createdAt: datetime(),
              createdBy: $createdBy
            }]->(e)
            RETURN r
          `;

      await session.run(relQuery, {
        sourceId: validated.sourceId,
        tenantId,
        entityId: validated.entityId,
        linkId: id,
        strength: validated.strength,
        confidence: validated.confidence,
        validFrom: validated.validFrom.toISOString(),
        validTo: validated.validTo?.toISOString() || null,
        createdBy: userId,
      });

      this.ctx.logger.info(
        {
          linkId: id,
          sourceId: validated.sourceId,
          entityId: validated.entityId,
          relationshipType: validated.relationshipType,
        },
        'Graph link created',
      );

      return link;
    } finally {
      await session.close();
    }
  }

  /**
   * Get asset dashboard data
   */
  async getAssetDashboard(
    sourceId: string,
    tenantId: string,
  ): Promise<AssetDashboard> {
    const session = this.ctx.getNeo4jSession();
    try {
      // Get source details
      const sourceResult = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        RETURN s
        `,
        { sourceId, tenantId },
      );

      if (sourceResult.records.length === 0) {
        throw new NotFoundError('Source', sourceId);
      }

      const source = sourceResult.records[0].get('s').properties;

      // Get recent activities
      const activitiesResult = await session.run(
        `
        MATCH (a:HumintActivity)-[:ACTIVITY_OF]->(s:HumintSource {id: $sourceId})
        RETURN a
        ORDER BY a.timestamp DESC
        LIMIT 10
        `,
        { sourceId },
      );

      // Get active risk indicators
      const risksResult = await session.run(
        `
        MATCH (r:HumintRiskIndicator {status: 'ACTIVE'})-[:RISK_OF]->(s:HumintSource {id: $sourceId})
        RETURN r
        `,
        { sourceId },
      );

      // Get upcoming debriefs
      const debriefsResult = await session.run(
        `
        MATCH (d:HumintDebrief)-[:DEBRIEF_OF]->(s:HumintSource {id: $sourceId})
        WHERE d.status = 'PLANNED' AND d.scheduledAt > datetime()
        RETURN d
        ORDER BY d.scheduledAt ASC
        LIMIT 5
        `,
        { sourceId },
      );

      // Get graph connection counts
      const connectionsResult = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId})-[r]-(connected)
        WITH labels(connected)[0] as type, count(*) as cnt
        RETURN type, cnt
        `,
        { sourceId },
      );

      // Get recent intelligence
      const intelResult = await session.run(
        `
        MATCH (i:HumintIntelligence)-[:EXTRACTED_FROM]->(d:HumintDebrief)-[:DEBRIEF_OF]->(s:HumintSource {id: $sourceId})
        RETURN i
        ORDER BY i.createdAt DESC
        LIMIT 5
        `,
        { sourceId },
      );

      // Build connection counts
      const connections = {
        persons: 0,
        organizations: 0,
        locations: 0,
        total: 0,
      };
      for (const record of connectionsResult.records) {
        const type = record.get('type');
        const count = record.get('cnt').toNumber();
        connections.total += count;
        if (type === 'Person') connections.persons = count;
        if (type === 'Organization') connections.organizations = count;
        if (type === 'Location') connections.locations = count;
      }

      // Build alerts from active risk indicators
      const alerts = risksResult.records.map((r) => {
        const props = r.get('r').properties;
        return {
          id: props.id,
          severity: props.severity,
          message: props.description,
          timestamp: new Date(props.detectedAt),
        };
      });

      return {
        sourceId,
        sourceCryptonym: source.cryptonym,
        status: source.status,
        riskLevel: source.riskLevel,
        credibilityScore: source.credibilityScore,
        lastContact: source.lastContactDate ? new Date(source.lastContactDate) : null,
        nextScheduledContact: source.nextScheduledContact
          ? new Date(source.nextScheduledContact)
          : null,
        activeIndicators: risksResult.records.length,
        recentActivities: activitiesResult.records.map((r) => {
          const props = r.get('a').properties;
          return {
            id: props.id,
            sourceId: props.sourceId,
            activityType: props.activityType,
            timestamp: new Date(props.timestamp),
            duration: props.duration,
            participants: props.participants || [],
            description: props.description,
            classification: props.classification,
            verificationStatus: props.verificationStatus,
            linkedEntityIds: [],
          };
        }),
        upcomingDebriefs: debriefsResult.records.map((r) => {
          const props = r.get('d').properties;
          return {
            id: props.id,
            scheduledAt: new Date(props.scheduledAt),
            type: props.debriefType,
          };
        }),
        graphConnections: connections,
        recentIntelligence: intelResult.records.map((r) => {
          const props = r.get('i').properties;
          return {
            id: props.id,
            topic: props.topic,
            date: new Date(props.createdAt),
            rating: props.informationRating,
          };
        }),
        alerts,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Query multiple assets with tracking data
   */
  async queryAssets(
    criteria: AssetTrackingQueryInput,
    tenantId: string,
  ): Promise<AssetTrackingResult> {
    const validated = AssetTrackingQuerySchema.parse(criteria);

    const session = this.ctx.getNeo4jSession();
    try {
      const whereClauses: string[] = ['s.tenantId = $tenantId'];
      const params: Record<string, unknown> = { tenantId };

      if (validated.sourceIds?.length) {
        whereClauses.push('s.id IN $sourceIds');
        params.sourceIds = validated.sourceIds;
      }

      if (validated.statuses?.length) {
        whereClauses.push('s.status IN $statuses');
        params.statuses = validated.statuses;
      }

      if (validated.riskLevels?.length) {
        whereClauses.push('s.riskLevel IN $riskLevels');
        params.riskLevels = validated.riskLevels;
      }

      if (validated.handlerId) {
        whereClauses.push('s.handlerId = $handlerId');
        params.handlerId = validated.handlerId;
      }

      if (validated.lastContactBefore) {
        whereClauses.push('s.lastContactDate < datetime($lastContactBefore)');
        params.lastContactBefore = validated.lastContactBefore.toISOString();
      }

      if (validated.lastContactAfter) {
        whereClauses.push('s.lastContactDate > datetime($lastContactAfter)');
        params.lastContactAfter = validated.lastContactAfter.toISOString();
      }

      const whereClause = whereClauses.join(' AND ');

      // Get sources
      const result = await session.run(
        `
        MATCH (s:HumintSource)
        WHERE ${whereClause}
        RETURN s
        ORDER BY s.updatedAt DESC
        SKIP $offset
        LIMIT $limit
        `,
        { ...params, offset: validated.offset, limit: validated.limit },
      );

      // Build dashboard for each source
      const assets: AssetDashboard[] = [];
      for (const record of result.records) {
        const props = record.get('s').properties;
        assets.push({
          sourceId: props.id,
          sourceCryptonym: props.cryptonym,
          status: props.status,
          riskLevel: props.riskLevel,
          credibilityScore: props.credibilityScore,
          lastContact: props.lastContactDate
            ? new Date(props.lastContactDate)
            : null,
          nextScheduledContact: props.nextScheduledContact
            ? new Date(props.nextScheduledContact)
            : null,
          activeIndicators: 0,
          recentActivities: [],
          upcomingDebriefs: [],
          graphConnections: { persons: 0, organizations: 0, locations: 0, total: 0 },
          recentIntelligence: [],
          alerts: [],
        });
      }

      // Get aggregations
      const aggResult = await session.run(
        `
        MATCH (s:HumintSource {tenantId: $tenantId})
        RETURN
          s.status as status,
          s.riskLevel as riskLevel,
          count(*) as cnt
        `,
        { tenantId },
      );

      const byStatus: Record<string, number> = {};
      const byRiskLevel: Record<string, number> = {};
      for (const record of aggResult.records) {
        const status = record.get('status');
        const risk = record.get('riskLevel');
        const count = record.get('cnt').toNumber();
        byStatus[status] = (byStatus[status] || 0) + count;
        byRiskLevel[risk] = (byRiskLevel[risk] || 0) + count;
      }

      // Count overdue contacts
      const overdueResult = await session.run(
        `
        MATCH (s:HumintSource {tenantId: $tenantId})
        WHERE s.status = 'ACTIVE'
          AND (s.lastContactDate IS NULL
               OR s.lastContactDate < datetime() - duration({days: $threshold}))
        RETURN count(s) as cnt
        `,
        { tenantId, threshold: VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS },
      );

      // Count active alerts
      const alertsResult = await session.run(
        `
        MATCH (r:HumintRiskIndicator {status: 'ACTIVE', tenantId: $tenantId})
        RETURN count(r) as cnt
        `,
        { tenantId },
      );

      return {
        assets,
        total: assets.length,
        aggregations: {
          byStatus,
          byRiskLevel,
          overdueContact: overdueResult.records[0].get('cnt').toNumber(),
          activeAlerts: alertsResult.records[0].get('cnt').toNumber(),
        },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Analyze source network in knowledge graph
   */
  async analyzeNetwork(
    sourceId: string,
    depth: number,
    tenantId: string,
  ): Promise<NetworkAnalysis> {
    const session = this.ctx.getNeo4jSession();
    try {
      const query = buildNetworkQuery(sourceId, Math.min(depth, 3));
      const result = await session.run(query, { sourceId });

      if (result.records.length === 0) {
        throw new NotFoundError('Source', sourceId);
      }

      const record = result.records[0];
      const nodes = record.get('nodes') || [];
      const edges = record.get('edges') || [];

      // Calculate basic metrics
      const nodeCount = nodes.length;
      const edgeCount = edges.length;
      const density =
        nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

      return {
        id: uuidv4(),
        sourceId,
        analysisType: depth === 1 ? 'FIRST_DEGREE' : depth === 2 ? 'SECOND_DEGREE' : 'FULL_NETWORK',
        nodes: nodes.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          type: n.type as string,
          label: n.label as string,
          properties: n.properties as Record<string, unknown>,
          centrality: 0, // Would be calculated
          cluster: undefined,
        })),
        edges: edges.map((e: Record<string, unknown>) => ({
          id: uuidv4(),
          source: e.source as string,
          target: e.target as string,
          type: e.type as string,
          weight: 1,
          properties: e.properties as Record<string, unknown>,
        })),
        metrics: {
          nodeCount,
          edgeCount,
          density,
          averageCentrality: 0,
          clusters: 0,
        },
        insights: [],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find path between source and target entity
   */
  async findPath(
    sourceId: string,
    targetEntityId: string,
    maxHops: number,
    tenantId: string,
  ): Promise<{ path: Array<{ id: string; type: string; label: string }>; hops: number }> {
    const session = this.ctx.getNeo4jSession();
    try {
      const query = buildPathQuery(sourceId, targetEntityId, Math.min(maxHops, 6));
      const result = await session.run(query, { sourceId, targetEntityId });

      if (result.records.length === 0) {
        return { path: [], hops: -1 };
      }

      const record = result.records[0];
      return {
        path: record.get('pathNodes') || [],
        hops: record.get('hops')?.toNumber() || 0,
      };
    } finally {
      await session.close();
    }
  }
}
