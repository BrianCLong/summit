
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import winston from 'winston';
import { AlertTriageV2Service } from './AlertTriageV2Service.js';
import { Neo4jService } from '../db/neo4j.js';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  tenantId: string;
  actorId: string;
  resourceId?: string;
  details: Record<string, any>;
}

export interface SecurityIncident {
  id: string;
  status: 'new' | 'triaged' | 'investigating' | 'resolved';
  severity: string;
  riskScore: number;
  evidence: any[];
  owner?: string;
}

export class SecurityIncidentPipeline {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private logger: winston.Logger,
    private neo4j: Neo4jService,
    private auditSystem: AdvancedAuditSystem,
    private triageService: AlertTriageV2Service
  ) {}

  async processEvent(event: SecurityEvent): Promise<SecurityIncident | null> {
    this.logger.info(`Processing security event: ${event.id}`);

    // 1. Triage
    const triageResult = await this.triageService.analyze(event);
    if (triageResult.riskScore < 0.4) {
      this.logger.info(`Event ${event.id} risk score too low (${triageResult.riskScore}). Skipping.`);
      return null;
    }

    // 2. Incident Creation
    // Mocking Prisma create for now as we don't have the schema handy to verify fields
    const incidentId = `inc-${Date.now()}`;
    const incident: SecurityIncident = {
      id: incidentId,
      status: 'new',
      severity: event.severity,
      riskScore: triageResult.riskScore,
      evidence: [],
    };

    // In real impl: await this.prisma.securityIncident.create(...)
    this.logger.info(`Created incident ${incidentId}`);

    // 3. Forensics Capture
    const evidence = [];

    // 3a. Logs
    try {
        const logs = await this.auditSystem.getLogsForActor(event.actorId, 100); // Fetch last 100 logs
        evidence.push({ type: 'logs', data: logs });
    } catch (err) {
        this.logger.warn('Failed to fetch audit logs', { error: err });
    }

    // 3b. Graph Dump
    try {
        const graphData = await this.neo4j.run(
            `MATCH (a {id: $actorId})-[r*1..2]-(m) RETURN a, r, m LIMIT 50`,
            { actorId: event.actorId }
        );
        evidence.push({ type: 'graph_neighborhood', data: graphData });
    } catch (err) {
        this.logger.warn('Failed to fetch graph data', { error: err });
    }

    incident.evidence = evidence;

    // 4. Owner Assignment (Mock)
    incident.owner = 'on-call-analyst';

    // 5. Alerting
    this.logger.warn(`HIGH SEVERITY INCIDENT: ${incident.id} (Score: ${incident.riskScore})`);

    return incident;
  }
}
