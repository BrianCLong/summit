import { getPostgresPool, getNeo4jDriver } from '../config/database.js';
import { ManagedPostgresPool } from '../db/postgres.js';
import {
  HumintSource,
  IntelReport,
  DebriefSession,
  CollectionRequirement,
  SourceReliability,
  SourceStatus,
  ReportGrading,
  ReportStatus,
  RequirementPriority
} from '../types/humint.js';
import { Driver, Session } from 'neo4j-driver';

// Helper for snake_case -> camelCase conversion if needed, but we'll map manually
const mapSource = (row: any): HumintSource => ({
  id: row.id,
  cryptonym: row.cryptonym,
  reliability: row.reliability,
  accessLevel: row.access_level,
  status: row.status,
  recruitedAt: row.recruited_at,
  handlerId: row.handler_id,
  tenantId: row.tenant_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapReport = (row: any): IntelReport => ({
  id: row.id,
  sourceId: row.source_id,
  content: row.content,
  grading: row.grading,
  status: row.status,
  disseminationList: row.dissemination_list,
  createdAt: row.created_at,
  createdBy: row.created_by,
  tenantId: row.tenant_id,
});

export class HumintService {
  private static instance: HumintService;
  private pool: ManagedPostgresPool;
  private neo4j: Driver;

  private constructor() {
    this.pool = getPostgresPool();
    this.neo4j = getNeo4jDriver();
  }

  public static getInstance(): HumintService {
    if (!HumintService.instance) {
      HumintService.instance = new HumintService();
    }
    return HumintService.instance;
  }

  // --- Source Management ---

  async createSource(
    tenantId: string,
    handlerId: string,
    data: {
      cryptonym: string;
      reliability: SourceReliability;
      accessLevel: string;
      status: SourceStatus;
      recruitedAt?: Date;
    }
  ): Promise<HumintSource> {
    const query = `
      INSERT INTO humint_sources (cryptonym, reliability, access_level, status, recruited_at, handler_id, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.cryptonym,
      data.reliability,
      data.accessLevel,
      data.status,
      data.recruitedAt || new Date(),
      handlerId,
      tenantId
    ];

    const result = await this.pool.query(query, values);
    const source = mapSource(result.rows[0]);

    // Create node in GraphDB
    const session = this.neo4j.session();
    try {
      await session.run(
        `
        MERGE (s:HumintSource {id: $id})
        SET s.cryptonym = $cryptonym,
            s.reliability = $reliability,
            s.tenantId = $tenantId,
            s.createdAt = datetime()
        `,
        {
          id: source.id,
          cryptonym: source.cryptonym,
          reliability: source.reliability,
          tenantId: source.tenantId
        }
      );
    } catch (error) {
      // Compensating transaction: Delete the Postgres record if Neo4j fails
      await this.pool.query('DELETE FROM humint_sources WHERE id = $1', [source.id]);
      throw error;
    } finally {
      if (session) {
        await session.close();
      }
    }

    return source;
  }

  async getSource(tenantId: string, sourceId: string): Promise<HumintSource | null> {
    const result = await this.pool.query(
      'SELECT * FROM humint_sources WHERE id = $1 AND tenant_id = $2',
      [sourceId, tenantId]
    );
    return result.rows.length ? mapSource(result.rows[0]) : null;
  }

  async listSources(tenantId: string): Promise<HumintSource[]> {
    const result = await this.pool.query(
      'SELECT * FROM humint_sources WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows.map(mapSource);
  }

  // --- Intel Reporting ---

  async createReport(
    tenantId: string,
    userId: string,
    data: {
      sourceId: string;
      content: string;
      grading: ReportGrading;
      disseminationList?: string[];
    }
  ): Promise<IntelReport> {
    const query = `
      INSERT INTO humint_reports (source_id, content, grading, status, dissemination_list, created_by, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.sourceId,
      data.content,
      data.grading,
      ReportStatus.DRAFT,
      data.disseminationList || [],
      userId,
      tenantId
    ];

    const result = await this.pool.query(query, values);
    return mapReport(result.rows[0]);
  }

  async updateReportStatus(
    tenantId: string,
    reportId: string,
    status: ReportStatus
  ): Promise<IntelReport | null> {
    const result = await this.pool.query(
      'UPDATE humint_reports SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [status, reportId, tenantId]
    );
    return result.rows.length ? mapReport(result.rows[0]) : null;
  }

  async listReports(tenantId: string, sourceId?: string): Promise<IntelReport[]> {
    let query = 'SELECT * FROM humint_reports WHERE tenant_id = $1';
    const params = [tenantId];

    if (sourceId) {
      query += ' AND source_id = $2';
      params.push(sourceId);
    }

    query += ' ORDER BY created_at DESC';
    const result = await this.pool.query(query, params);
    return result.rows.map(mapReport);
  }

  // --- Debriefing ---

  async logDebrief(
    tenantId: string,
    userId: string,
    data: {
      sourceId: string;
      date: Date;
      location: string;
      notes: string;
    }
  ): Promise<DebriefSession> {
    const query = `
      INSERT INTO humint_debriefs (source_id, session_date, location, notes, officer_id, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.sourceId,
      data.date,
      data.location,
      data.notes,
      userId,
      tenantId
    ];

    const result = await this.pool.query(query, values);
    const debrief = {
      id: result.rows[0].id,
      sourceId: result.rows[0].source_id,
      date: result.rows[0].session_date,
      location: result.rows[0].location,
      notes: result.rows[0].notes,
      officerId: result.rows[0].officer_id,
      tenantId: result.rows[0].tenant_id,
      createdAt: result.rows[0].created_at,
    };
    return debrief;
  }

  // --- Collection Planning ---

  async createRequirement(
    tenantId: string,
    data: {
      description: string;
      priority: RequirementPriority;
      deadline?: Date;
      assignedTo?: string;
    }
  ): Promise<CollectionRequirement> {
    const query = `
      INSERT INTO humint_requirements (description, priority, deadline, assigned_to, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.description,
      data.priority,
      data.deadline || null,
      data.assignedTo || null,
      tenantId
    ];

    const result = await this.pool.query(query, values);
    return {
      id: result.rows[0].id,
      description: result.rows[0].description,
      priority: result.rows[0].priority,
      status: result.rows[0].status,
      assignedTo: result.rows[0].assigned_to,
      deadline: result.rows[0].deadline,
      tenantId: result.rows[0].tenant_id,
      createdAt: result.rows[0].created_at,
    };
  }

  // --- Relationship Mapping (Graph) ---

  async addSourceRelationship(
    tenantId: string,
    sourceId: string,
    targetName: string,
    relationshipType: string,
    notes: string
  ): Promise<void> {
    // This connects a HumintSource to a Person or Organization node
    // For MVP, we'll assume the Target is a generic 'Entity' or 'Person'
    const session = this.neo4j.session();
    try {
        // Simple merge for the target entity for now
      await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        MERGE (t:Person {name: $targetName, tenantId: $tenantId})
        MERGE (s)-[r:REPORTED_RELATIONSHIP {type: $relationshipType}]->(t)
        SET r.notes = $notes, r.createdAt = datetime()
        `,
        { sourceId, tenantId, targetName, relationshipType, notes }
      );
    } finally {
      await session.close();
    }
  }

  async getSourceNetwork(tenantId: string, sourceId: string): Promise<any[]> {
    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})-[r]->(t)
        RETURN t.name as target, type(r) as relationship, r.notes as notes
        `,
        { sourceId, tenantId }
      );
      return result.records.map(record => ({
        target: record.get('target'),
        relationship: record.get('relationship'),
        notes: record.get('notes')
      }));
    } finally {
      await session.close();
    }
  }

  // --- Counterintelligence Screening ---

  async runCIScreening(tenantId: string, sourceId: string): Promise<{ passed: boolean; flags: string[] }> {
    // Placeholder logic for CI screening
    // In a real system, this would check watchlists, analyze behavioral patterns, etc.
    // Here we will just do a basic check on the source data

    const source = await this.getSource(tenantId, sourceId);
    if (!source) throw new Error('Source not found');

    const flags: string[] = [];

    // Example rule: Check if reliability is low
    if (source.reliability === SourceReliability.E || source.reliability === SourceReliability.F) {
      flags.push('Low reliability rating indicates potential deception risk');
    }

    // Example rule: Check if burned
    if (source.status === SourceStatus.BURNED) {
      flags.push('Source is marked as BURNED');
    }

    return {
      passed: flags.length === 0,
      flags
    };
  }
}
