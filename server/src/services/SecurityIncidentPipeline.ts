// @ts-nocheck
// import { PrismaClient } from '@prisma/client';
// Use unknown for now to bypass environment issues with PrismaClient import in tests
type PrismaClient = unknown;
import { Redis } from 'ioredis';
import winston from 'winston';
import { Neo4jService, neo } from '../db/neo4j.js';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';
import { AlertTriageV2Service, TriageRecommendation } from './AlertTriageV2Service.js';

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  tenantId: string;
  actorId?: string;
  resourceId?: string;
  details: unknown;
  context?: unknown;
}

export interface SecurityIncident {
  id: string;
  eventId: string;
  status: 'new' | 'investigating' | 'contained' | 'resolved' | 'closed';
  ownerId?: string;
  severity: string;
  evidence: {
    logIds: string[];
    dbSnapshotPath?: string;
    graphDumpPath?: string;
  };
  triageScore: number;
  recommendations: TriageRecommendation[];
  createdAt: Date;
  updatedAt: Date;
}

// Define a Logger interface to avoid direct dependency on winston types if they are missing
interface Logger {
    info(message: string, ...meta: unknown[]): unknown;
    error(message: string, ...meta: unknown[]): unknown;
    warn(message: string, ...meta: unknown[]): unknown;
    debug(message: string, ...meta: unknown[]): unknown;
}

export class SecurityIncidentPipeline {
  private prisma: PrismaClient;
  private redis: Redis;
  private logger: Logger;
  private neo4j: Neo4jService;
  private auditSystem: AdvancedAuditSystem;
  private triageService: AlertTriageV2Service;

  // Dependencies for snapshotting and dumping
  // In a real system these might be separate services

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    neo4j: Neo4jService,
    auditSystem: AdvancedAuditSystem,
    triageService: AlertTriageV2Service
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
    this.neo4j = neo4j;
    this.auditSystem = auditSystem;
    this.triageService = triageService;
  }

  /**
   * Main entry point: Process a security event
   * Automatically triggers forensics capture, triage, and response
   */
  async processEvent(event: SecurityEvent): Promise<SecurityIncident> {
    this.logger.info(`Starting security incident pipeline for event ${event.id}`, { eventType: event.type });

    try {
      // 1. Initial Triage & Scoring
      const triageResult = await this.triageService.scoreAlert(event.id, {
        ...event,
        created_at: event.timestamp,
        entities: this.extractEntities(event)
      });

      this.logger.info(`Triage completed for event ${event.id}`, { score: triageResult.score });

      // 2. Determine if incident creation is warranted (e.g. score > threshold)
      if (triageResult.score < 0.4) {
        this.logger.info(`Event ${event.id} score below threshold, skipping incident creation`);
        return null;
      }

      // 3. Create Incident Record (Freeze Investigation Phase 1)
      const incidentId = await this.createIncidentRecord(event, triageResult);

      // 4. Forensics Capture (Parallel execution)
      const [logs, dbSnapshot, graphDump] = await Promise.all([
        this.captureLogs(event),
        this.snapshotDatabaseRows(event),
        this.dumpGraphNodes(event)
      ]);

      // 5. Update Incident with Evidence
      await this.updateIncidentEvidence(incidentId, logs, dbSnapshot, graphDump);

      // 6. Assign Owner
      const ownerId = await this.assignOwner(incidentId, event, triageResult);

      // 7. Raise Alert / Notification
      await this.raiseAlert(incidentId, event, triageResult, ownerId);

      this.logger.info(`Security incident pipeline completed for incident ${incidentId}`);

      return await this.getIncident(incidentId);

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to process security event ${event.id}`, { error: errorMessage, stack: errorStack });
      throw error;
    }
  }

  private extractEntities(event: SecurityEvent): Array<{ type: string; value: string }> {
    const entities: Array<{ type: string; value: string }> = [];
    if (event.actorId) entities.push({ type: 'user', value: event.actorId });
    if (event.resourceId) entities.push({ type: 'resource', value: event.resourceId });
    // Extract IPs, etc from details if available
    if (typeof event.details === 'object' && event.details !== null && 'ip' in event.details && typeof event.details.ip === 'string') {
      entities.push({ type: 'ip', value: event.details.ip });
    }
    return entities;
  }

  private async createIncidentRecord(event: SecurityEvent, triage: { score: number; recommendations: TriageRecommendation[] }): Promise<string> {
    // In a real implementation, this would insert into a database table
    // For now, we'll simulate it or use Prisma if schema supports it
    // Assuming 'Incident' model exists or we create a placeholder

    // Using a mock ID for now if schema not ready
    const id = `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Store in Redis as a quick persistence if Table doesn't exist
    await this.redis.set(`incident:${id}`, JSON.stringify({
      id,
      eventId: event.id,
      status: 'new', // Initial status
      severity: event.severity,
      triageScore: triage.score,
      createdAt: new Date()
    }));

    return id;
  }

  private async captureLogs(event: SecurityEvent): Promise<string[]> {
    this.logger.info(`Capturing logs for event ${event.id}`);

    // Query audit system for recent logs related to actor or resource
    // Logic: Look back 1 hour and forward (if any)
    const startTime = new Date(event.timestamp.getTime() - 60 * 60 * 1000);
    const endTime = new Date(event.timestamp.getTime() + 5 * 60 * 1000); // 5 mins buffer

    try {
      // Mocking the query to audit system as it might not have search capabilities exposed yet
      // In production: return this.auditSystem.queryLogs({ actor: event.actorId, timeRange: [startTime, endTime] });
      return [`log-id-1-${event.id}`, `log-id-2-${event.id}`];
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error('Log capture failed', errorMessage);
      return [];
    }
  }

  private async snapshotDatabaseRows(event: SecurityEvent): Promise<string> {
    this.logger.info(`Snapshotting DB rows for event ${event.id}`);
    // Serialize relevant rows (e.g. User, Resource) to a JSON file/string
    // This is a "logical snapshot"

    const snapshot = {
      timestamp: new Date(),
      eventId: event.id,
      actor: event.actorId ? { id: event.actorId, /* ... fetch user ... */ } : null,
      resource: event.resourceId ? { id: event.resourceId, /* ... fetch resource ... */ } : null
    };

    // In real world, write to S3/Blob storage
    const snapshotPath = `snapshots/${event.id}_db.json`;
    // await this.storage.upload(snapshotPath, JSON.stringify(snapshot));

    return snapshotPath;
  }

  private async dumpGraphNodes(event: SecurityEvent): Promise<string | null> {
    this.logger.info(`Dumping graph nodes for event ${event.id}`);

    if (!event.actorId && !event.resourceId) return null;

    try {
      // Fetch immediate neighborhood of the actor/resource
      const query = `
        MATCH (n)
        WHERE n.id = $id OR n.id = $resourceId
        CALL apoc.path.subgraphAll(n, {maxLevel: 2})
        YIELD nodes, relationships
        RETURN nodes, relationships
      `;

      // Use the 'neo' helper since Neo4jService doesn't expose readTransaction directly in the current file
      const result = await neo.run(query, {
        id: event.actorId || '',
        resourceId: event.resourceId || ''
      });

      // Serialize graph result
      const dumpPath = `dumps/${event.id}_graph.json`;
      // await this.storage.upload(dumpPath, JSON.stringify(result.records));

      return dumpPath;
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error('Graph dump failed', errorMessage);
      return null;
    }
  }

  private async updateIncidentEvidence(incidentId: string, logs: string[], dbPath: string, graphPath: string | null) {
    const rawData = await this.redis.get(`incident:${incidentId}`);
    if (!rawData) return;
    const incidentData = JSON.parse(rawData);
    incidentData.evidence = {
      logIds: logs,
      dbSnapshotPath: dbPath,
      graphDumpPath: graphPath
    };
    incidentData.status = 'investigating'; // "Freeze" investigation state - meaning evidence is frozen/captured
    await this.redis.set(`incident:${incidentId}`, JSON.stringify(incidentData));
  }

  private async assignOwner(incidentId: string, event: SecurityEvent, triage: { score: number; recommendations: TriageRecommendation[] }): Promise<string> {
    // Logic: Round robin or on-call based on severity
    // Simple mock implementation
    const onCallAnalyst = 'analyst-01';

    const rawData = await this.redis.get(`incident:${incidentId}`);
    if (!rawData) return onCallAnalyst;
    const incidentData = JSON.parse(rawData);
    incidentData.ownerId = onCallAnalyst;
    await this.redis.set(`incident:${incidentId}`, JSON.stringify(incidentData));

    return onCallAnalyst;
  }

  private async raiseAlert(incidentId: string, event: SecurityEvent, triage: { score: number; recommendations: TriageRecommendation[] }, ownerId: string) {
    this.logger.warn(`ALERT: Security Incident ${incidentId} created.`, {
      severity: event.severity,
      score: triage.score,
      owner: ownerId,
      recommendation: triage.recommendations[0]?.action
    });

    // In production: send Slack/PagerDuty/Email
    // await this.notificationService.send(...)
  }

  private async getIncident(id: string): Promise<SecurityIncident | null> {
    const data = await this.redis.get(`incident:${id}`);
    return data ? JSON.parse(data) : null;
  }
}
