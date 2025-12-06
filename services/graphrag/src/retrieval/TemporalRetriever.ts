/**
 * Temporal RAG Retriever
 * Time-scoped evidence retrieval with temporal reasoning
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  RetrievalQuery,
  EvidenceChunk,
  CitationSource,
  GraphPath,
} from '../types/index.js';

const tracer = trace.getTracer('graphrag-temporal-retriever');

export interface TemporalScope {
  from?: Date;
  to?: Date;
  pointInTime?: Date;
  granularity?: 'day' | 'week' | 'month' | 'year';
}

export interface TemporalEntity {
  id: string;
  validFrom: Date;
  validTo?: Date;
  eventTime?: Date;
  temporalType: 'instant' | 'interval' | 'ongoing';
}

export interface TemporalRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  validFrom: Date;
  validTo?: Date;
  temporalRelation:
    | 'before'
    | 'after'
    | 'during'
    | 'overlaps'
    | 'meets'
    | 'equals';
}

export class TemporalRetriever {
  constructor(private driver: Driver) {}

  /**
   * Retrieve evidence within a temporal scope
   */
  async retrieve(
    query: RetrievalQuery,
    temporalScope: TemporalScope,
  ): Promise<EvidenceChunk[]> {
    return tracer.startActiveSpan('temporal_retrieval', async (span) => {
      const session = this.driver.session();
      const startTime = Date.now();

      try {
        span.setAttribute('query.length', query.query.length);
        span.setAttribute('temporal.hasFrom', !!temporalScope.from);
        span.setAttribute('temporal.hasTo', !!temporalScope.to);

        // Build temporal filter clause
        const temporalFilter = this.buildTemporalFilter(temporalScope);

        // Query for temporally-scoped entities
        const result = await session.run(
          `
          CALL db.index.fulltext.queryNodes('entitySearch', $query)
          YIELD node, score
          WHERE score >= $minScore
            ${temporalFilter.whereClause}
          WITH node, score
          ORDER BY score DESC
          LIMIT $limit
          RETURN node, labels(node) as labels, score
          `,
          {
            query: query.query,
            minScore: query.minRelevance,
            limit: query.maxNodes,
            ...temporalFilter.params,
          },
        );

        const evidenceChunks: EvidenceChunk[] = [];

        for (const record of result.records) {
          const node = record.get('node');
          const labels = record.get('labels');
          const score = record.get('score');

          // Get temporal context for this entity
          const temporalContext = await this.getTemporalContext(
            session,
            node.properties.id,
            temporalScope,
          );

          // Get temporal relationships
          const temporalPaths = await this.getTemporalPaths(
            session,
            node.properties.id,
            temporalScope,
            query.maxHops,
          );

          const chunk: EvidenceChunk = {
            id: uuidv4(),
            content: this.buildTemporalSummary(node.properties, temporalContext),
            citations: [
              {
                id: uuidv4(),
                documentId: `temporal:${node.properties.id}`,
                spanStart: 0,
                spanEnd: 0,
                content: JSON.stringify(temporalContext),
                confidence: score,
                sourceType: 'graph',
                metadata: {
                  temporalType: temporalContext.type,
                  validFrom: temporalContext.validFrom?.toISOString(),
                  validTo: temporalContext.validTo?.toISOString(),
                },
              },
            ],
            graphPaths: temporalPaths,
            relevanceScore: score,
            temporalContext: {
              validFrom: temporalContext.validFrom?.toISOString(),
              validTo: temporalContext.validTo?.toISOString(),
              eventTime: temporalContext.eventTime?.toISOString(),
            },
            tenantId: query.tenantId,
          };

          evidenceChunks.push(chunk);
        }

        span.setAttribute('results.count', evidenceChunks.length);
        span.setAttribute('processing.timeMs', Date.now() - startTime);
        span.setStatus({ code: SpanStatusCode.OK });

        return evidenceChunks;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        await session.close();
        span.end();
      }
    });
  }

  /**
   * Get temporal evolution of an entity
   */
  async getEntityTimeline(
    entityId: string,
    granularity: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<
    Array<{
      timestamp: Date;
      snapshot: Record<string, any>;
      changes: string[];
    }>
  > {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})-[:HAS_VERSION]->(v:Version)
        RETURN v
        ORDER BY v.validFrom ASC
        `,
        { entityId },
      );

      const timeline: Array<{
        timestamp: Date;
        snapshot: Record<string, any>;
        changes: string[];
      }> = [];

      let previousSnapshot: Record<string, any> | null = null;

      for (const record of result.records) {
        const version = record.get('v').properties;
        const snapshot = JSON.parse(version.properties || '{}');
        const timestamp = new Date(version.validFrom);

        // Compute changes from previous version
        const changes: string[] = [];
        if (previousSnapshot) {
          for (const [key, value] of Object.entries(snapshot)) {
            if (previousSnapshot[key] !== value) {
              changes.push(`${key}: ${previousSnapshot[key]} → ${value}`);
            }
          }
          for (const key of Object.keys(previousSnapshot)) {
            if (!(key in snapshot)) {
              changes.push(`${key}: removed`);
            }
          }
        }

        timeline.push({ timestamp, snapshot, changes });
        previousSnapshot = snapshot;
      }

      return this.aggregateByGranularity(timeline, granularity);
    } finally {
      await session.close();
    }
  }

  /**
   * Find entities that changed during a time period
   */
  async findChangedEntities(
    from: Date,
    to: Date,
    tenantId: string,
    limit = 100,
  ): Promise<
    Array<{
      entityId: string;
      entityType: string;
      changeType: 'created' | 'modified' | 'deleted';
      changedAt: Date;
    }>
  > {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (e)
        WHERE (e.createdAt >= datetime($from) AND e.createdAt <= datetime($to))
           OR (e.updatedAt >= datetime($from) AND e.updatedAt <= datetime($to))
        RETURN e.id as entityId,
               labels(e)[0] as entityType,
               CASE
                 WHEN e.createdAt >= datetime($from) THEN 'created'
                 ELSE 'modified'
               END as changeType,
               COALESCE(e.updatedAt, e.createdAt) as changedAt
        ORDER BY changedAt DESC
        LIMIT $limit
        `,
        {
          from: from.toISOString(),
          to: to.toISOString(),
          limit,
        },
      );

      return result.records.map((record) => ({
        entityId: record.get('entityId'),
        entityType: record.get('entityType'),
        changeType: record.get('changeType'),
        changedAt: new Date(record.get('changedAt')),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Compute temporal relationships between entities
   */
  async computeTemporalRelations(
    entityAId: string,
    entityBId: string,
  ): Promise<TemporalRelationship | null> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (a {id: $entityAId}), (b {id: $entityBId})
        RETURN a, b
        `,
        { entityAId, entityBId },
      );

      if (result.records.length === 0) return null;

      const a = result.records[0].get('a').properties;
      const b = result.records[0].get('b').properties;

      const aStart = a.validFrom ? new Date(a.validFrom) : null;
      const aEnd = a.validTo ? new Date(a.validTo) : null;
      const bStart = b.validFrom ? new Date(b.validFrom) : null;
      const bEnd = b.validTo ? new Date(b.validTo) : null;

      // Determine Allen's interval relation
      let temporalRelation: TemporalRelationship['temporalRelation'] = 'overlaps';

      if (aEnd && bStart && aEnd < bStart) {
        temporalRelation = 'before';
      } else if (aStart && bEnd && aStart > bEnd) {
        temporalRelation = 'after';
      } else if (aStart && aEnd && bStart && bEnd) {
        if (aStart >= bStart && aEnd <= bEnd) {
          temporalRelation = 'during';
        } else if (
          aStart.getTime() === bStart.getTime() &&
          aEnd.getTime() === bEnd.getTime()
        ) {
          temporalRelation = 'equals';
        } else if (aEnd.getTime() === bStart.getTime()) {
          temporalRelation = 'meets';
        }
      }

      return {
        id: uuidv4(),
        type: 'TEMPORAL_RELATION',
        sourceId: entityAId,
        targetId: entityBId,
        validFrom: aStart || new Date(),
        validTo: aEnd || undefined,
        temporalRelation,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Build temporal filter clause for Cypher
   */
  private buildTemporalFilter(scope: TemporalScope): {
    whereClause: string;
    params: Record<string, any>;
  } {
    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (scope.pointInTime) {
      conditions.push(
        `(node.validFrom <= datetime($pointInTime) AND
          (node.validTo IS NULL OR node.validTo >= datetime($pointInTime)))`,
      );
      params.pointInTime = scope.pointInTime.toISOString();
    } else {
      if (scope.from) {
        conditions.push(
          `(node.validTo IS NULL OR node.validTo >= datetime($fromDate))`,
        );
        params.fromDate = scope.from.toISOString();
      }
      if (scope.to) {
        conditions.push(`node.validFrom <= datetime($toDate)`);
        params.toDate = scope.to.toISOString();
      }
    }

    const whereClause =
      conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    return { whereClause, params };
  }

  /**
   * Get temporal context for an entity
   */
  private async getTemporalContext(
    session: any,
    entityId: string,
    scope: TemporalScope,
  ): Promise<{
    type: 'instant' | 'interval' | 'ongoing';
    validFrom?: Date;
    validTo?: Date;
    eventTime?: Date;
  }> {
    const result = await session.run(
      `
      MATCH (e {id: $entityId})
      RETURN e.validFrom as validFrom,
             e.validTo as validTo,
             e.eventTime as eventTime
      `,
      { entityId },
    );

    if (result.records.length === 0) {
      return { type: 'ongoing' };
    }

    const record = result.records[0];
    const validFrom = record.get('validFrom');
    const validTo = record.get('validTo');
    const eventTime = record.get('eventTime');

    let type: 'instant' | 'interval' | 'ongoing' = 'ongoing';
    if (eventTime) {
      type = 'instant';
    } else if (validFrom && validTo) {
      type = 'interval';
    }

    return {
      type,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validTo: validTo ? new Date(validTo) : undefined,
      eventTime: eventTime ? new Date(eventTime) : undefined,
    };
  }

  /**
   * Get temporal graph paths
   */
  private async getTemporalPaths(
    session: any,
    entityId: string,
    scope: TemporalScope,
    maxHops: number,
  ): Promise<GraphPath[]> {
    const temporalFilter = this.buildTemporalFilter(scope);

    const result = await session.run(
      `
      MATCH (start {id: $entityId})
      MATCH path = (start)-[r*1..${maxHops}]-(end)
      WHERE ALL(rel IN relationships(path) WHERE
        rel.validFrom IS NULL OR rel.validFrom <= datetime($now)
      )
      ${temporalFilter.whereClause.replace(/node/g, 'end')}
      RETURN path
      LIMIT 10
      `,
      {
        entityId,
        now: new Date().toISOString(),
        ...temporalFilter.params,
      },
    );

    return result.records.map((record: any) => {
      const path = record.get('path');
      const nodes = path.segments.map((s: any) => s.start).concat([
        path.segments[path.segments.length - 1]?.end,
      ]).filter(Boolean);
      const rels = path.segments.map((s: any) => s.relationship);

      return {
        id: uuidv4(),
        nodes: nodes.map((n: any) => ({
          id: n.properties.id,
          type: n.labels?.[0] || 'Unknown',
          label: n.properties.name || n.properties.id,
          properties: n.properties,
        })),
        edges: rels.map((r: any) => ({
          id: r.properties?.id || uuidv4(),
          type: r.type,
          sourceId: r.start?.properties?.id,
          targetId: r.end?.properties?.id,
          properties: r.properties || {},
        })),
        pathLength: rels.length,
        confidence: 0.8,
        saliencyScore: 0.7,
      };
    });
  }

  /**
   * Build temporal summary for evidence
   */
  private buildTemporalSummary(
    properties: Record<string, any>,
    temporalContext: {
      type: string;
      validFrom?: Date;
      validTo?: Date;
      eventTime?: Date;
    },
  ): string {
    let summary = `Entity: ${properties.name || properties.id}`;

    if (temporalContext.eventTime) {
      summary += `\nEvent occurred: ${temporalContext.eventTime.toISOString()}`;
    } else if (temporalContext.validFrom) {
      summary += `\nValid from: ${temporalContext.validFrom.toISOString()}`;
      if (temporalContext.validTo) {
        summary += ` to ${temporalContext.validTo.toISOString()}`;
      } else {
        summary += ' (ongoing)';
      }
    }

    return summary;
  }

  /**
   * Aggregate timeline by granularity
   */
  private aggregateByGranularity(
    timeline: Array<{
      timestamp: Date;
      snapshot: Record<string, any>;
      changes: string[];
    }>,
    granularity: 'day' | 'week' | 'month' | 'year',
  ): Array<{
    timestamp: Date;
    snapshot: Record<string, any>;
    changes: string[];
  }> {
    // Group by granularity bucket and take latest in each bucket
    const buckets = new Map<
      string,
      { timestamp: Date; snapshot: Record<string, any>; changes: string[] }
    >();

    for (const entry of timeline) {
      const key = this.getBucketKey(entry.timestamp, granularity);
      buckets.set(key, entry);
    }

    return Array.from(buckets.values());
  }

  private getBucketKey(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const week = Math.floor(day / 7);

    switch (granularity) {
      case 'year':
        return `${year}`;
      case 'month':
        return `${year}-${month}`;
      case 'week':
        return `${year}-${month}-W${week}`;
      case 'day':
      default:
        return `${year}-${month}-${day}`;
    }
  }
}
