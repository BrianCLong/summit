/**
 * Agent Service
 * AGENT-1: Agent Entity & Identity - CRUD operations and authentication
 */

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import type {
  Agent,
  AgentCredential,
  AgentType,
  AgentStatus,
  AgentRestrictions,
  CredentialType,
  RiskLevel,
  AgentAuditLog,
  AuditEventType,
  AuditEventCategory,
} from './types.js';

export interface AgentCreateInput {
  name: string;
  description?: string;
  agentType: AgentType;
  version?: string;
  organizationId?: string;
  tenantScopes: string[];
  projectScopes?: string[];
  capabilities: string[];
  restrictions?: Partial<AgentRestrictions>;
  ownerId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface AgentUpdateInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  tenantScopes?: string[];
  projectScopes?: string[];
  capabilities?: string[];
  restrictions?: Partial<AgentRestrictions>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export class AgentService {
  constructor(private db: any) {} // PostgreSQL pool or connection

  /**
   * Create a new agent
   * AGENT-1a: DB operations for agent entity
   */
  async createAgent(input: AgentCreateInput, actorId?: string): Promise<Agent> {
    const defaultRestrictions: AgentRestrictions = {
      maxRiskLevel: 'medium',
      requireApproval: ['high', 'critical'],
      maxDailyRuns: 1000,
      maxConcurrentRuns: 10,
      ...input.restrictions,
    };

    const result = await this.db.query(
      `INSERT INTO agents (
        name, description, agent_type, version,
        organization_id, tenant_scopes, project_scopes,
        status, is_certified, capabilities, restrictions,
        owner_id, metadata, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        input.name,
        input.description,
        input.agentType,
        input.version || '1.0.0',
        input.organizationId,
        JSON.stringify(input.tenantScopes),
        JSON.stringify(input.projectScopes || []),
        'active',
        false, // Not certified by default
        JSON.stringify(input.capabilities),
        JSON.stringify(defaultRestrictions),
        input.ownerId,
        JSON.stringify(input.metadata || {}),
        JSON.stringify(input.tags || []),
      ]
    );

    const agent = this.mapRowToAgent(result.rows[0]);

    // Audit log
    await this.createAuditLog({
      agentId: agent.id,
      eventType: 'agent_created',
      eventCategory: 'lifecycle',
      actorId,
      actorType: 'user',
      metadata: { agentName: agent.name, agentType: agent.agentType },
    });

    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    const result = await this.db.query(
      'SELECT * FROM agents WHERE id = $1 AND deleted_at IS NULL',
      [agentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * Get agent by name
   */
  async getAgentByName(name: string): Promise<Agent | null> {
    const result = await this.db.query(
      'SELECT * FROM agents WHERE name = $1 AND deleted_at IS NULL',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * List agents with optional filters
   */
  async listAgents(filters?: {
    organizationId?: string;
    status?: AgentStatus;
    agentType?: AgentType;
    ownerId?: string;
  }): Promise<Agent[]> {
    let query = 'SELECT * FROM agents WHERE deleted_at IS NULL';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.organizationId) {
      query += ` AND organization_id = $${paramIndex}`;
      params.push(filters.organizationId);
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.agentType) {
      query += ` AND agent_type = $${paramIndex}`;
      params.push(filters.agentType);
      paramIndex++;
    }

    if (filters?.ownerId) {
      query += ` AND owner_id = $${paramIndex}`;
      params.push(filters.ownerId);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows.map(this.mapRowToAgent);
  }

  /**
   * Update agent
   */
  async updateAgent(
    agentId: string,
    input: AgentUpdateInput,
    actorId?: string
  ): Promise<Agent> {
    // Get current agent for audit trail
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(input.name);
      paramIndex++;
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(input.description);
      paramIndex++;
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(input.status);
      paramIndex++;
    }

    if (input.tenantScopes !== undefined) {
      updates.push(`tenant_scopes = $${paramIndex}`);
      params.push(JSON.stringify(input.tenantScopes));
      paramIndex++;
    }

    if (input.projectScopes !== undefined) {
      updates.push(`project_scopes = $${paramIndex}`);
      params.push(JSON.stringify(input.projectScopes));
      paramIndex++;
    }

    if (input.capabilities !== undefined) {
      updates.push(`capabilities = $${paramIndex}`);
      params.push(JSON.stringify(input.capabilities));
      paramIndex++;
    }

    if (input.restrictions !== undefined) {
      const mergedRestrictions = { ...currentAgent.restrictions, ...input.restrictions };
      updates.push(`restrictions = $${paramIndex}`);
      params.push(JSON.stringify(mergedRestrictions));
      paramIndex++;
    }

    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(input.metadata));
      paramIndex++;
    }

    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(JSON.stringify(input.tags));
      paramIndex++;
    }

    if (updates.length === 0) {
      return currentAgent;
    }

    params.push(agentId);
    const query = `
      UPDATE agents
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    const updatedAgent = this.mapRowToAgent(result.rows[0]);

    // Determine event type based on what changed
    let eventType: AuditEventType = 'agent_updated';
    if (input.status === 'suspended') eventType = 'agent_suspended';
    if (input.status === 'active' && currentAgent.status === 'suspended') {
      eventType = 'agent_activated';
    }

    // Audit log with before/after
    await this.createAuditLog({
      agentId,
      eventType,
      eventCategory: input.status ? 'lifecycle' : 'configuration',
      actorId,
      actorType: 'user',
      changes: {
        before: currentAgent,
        after: updatedAgent,
      },
    });

    return updatedAgent;
  }

  /**
   * Delete agent (soft delete)
   */
  async deleteAgent(agentId: string, actorId?: string): Promise<void> {
    await this.db.query(
      'UPDATE agents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [agentId]
    );

    await this.createAuditLog({
      agentId,
      eventType: 'agent_deleted',
      eventCategory: 'lifecycle',
      actorId,
      actorType: 'user',
    });
  }

  /**
   * Certify agent
   * AGENT-15: Certification workflow
   */
  async certifyAgent(
    agentId: string,
    expiresInDays: number = 365,
    actorId?: string
  ): Promise<Agent> {
    const certificationDate = new Date();
    const certificationExpiresAt = new Date();
    certificationExpiresAt.setDate(certificationExpiresAt.getDate() + expiresInDays);

    const result = await this.db.query(
      `UPDATE agents
       SET is_certified = true,
           certification_date = $1,
           certification_expires_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [certificationDate, certificationExpiresAt, agentId]
    );

    const agent = this.mapRowToAgent(result.rows[0]);

    await this.createAuditLog({
      agentId,
      eventType: 'certification_granted',
      eventCategory: 'security',
      actorId,
      actorType: 'user',
      metadata: { expiresAt: certificationExpiresAt },
    });

    return agent;
  }

  /**
   * Revoke agent certification
   */
  async revokeCertification(agentId: string, actorId?: string): Promise<Agent> {
    const result = await this.db.query(
      `UPDATE agents
       SET is_certified = false,
           certification_date = NULL,
           certification_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [agentId]
    );

    const agent = this.mapRowToAgent(result.rows[0]);

    await this.createAuditLog({
      agentId,
      eventType: 'certification_revoked',
      eventCategory: 'security',
      actorId,
      actorType: 'user',
    });

    return agent;
  }

  // =========================================================================
  // AGENT-1c: Credential Management
  // =========================================================================

  /**
   * Generate API key for agent
   */
  generateApiKey(): { key: string; prefix: string } {
    const key = `agt_${randomBytes(32).toString('hex')}`;
    const prefix = key.substring(0, 11); // "agt_" + first 7 chars
    return { key, prefix };
  }

  /**
   * Create credential for agent
   */
  async createCredential(
    agentId: string,
    credentialType: CredentialType = 'api_key',
    options?: {
      expiresInDays?: number;
      rateLimitPerHour?: number;
      rateLimitPerDay?: number;
    },
    actorId?: string
  ): Promise<{ credential: AgentCredential; apiKey?: string }> {
    const { key, prefix } = this.generateApiKey();
    const keyHash = await bcrypt.hash(key, 12);

    const expiresAt = options?.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await this.db.query(
      `INSERT INTO agent_credentials (
        agent_id, credential_type, key_hash, key_prefix,
        expires_at, rate_limit_per_hour, rate_limit_per_day,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        agentId,
        credentialType,
        keyHash,
        prefix,
        expiresAt,
        options?.rateLimitPerHour || 1000,
        options?.rateLimitPerDay || 10000,
        true,
      ]
    );

    const credential = this.mapRowToCredential(result.rows[0]);

    await this.createAuditLog({
      agentId,
      eventType: 'credential_created',
      eventCategory: 'security',
      actorId,
      actorType: 'user',
      metadata: { credentialId: credential.id, prefix },
    });

    return { credential, apiKey: key };
  }

  /**
   * Authenticate agent using API key
   * AGENT-1d: Auth flow for agents
   */
  async authenticateAgent(apiKey: string): Promise<Agent | null> {
    // Extract prefix
    const prefix = apiKey.substring(0, 11);

    // Find credential by prefix
    const credResult = await this.db.query(
      `SELECT * FROM agent_credentials
       WHERE key_prefix = $1
       AND is_active = true
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [prefix]
    );

    if (credResult.rows.length === 0) {
      return null;
    }

    const credential = this.mapRowToCredential(credResult.rows[0]);

    // Verify hash
    const isValid = await bcrypt.compare(apiKey, credential.keyHash);
    if (!isValid) {
      return null;
    }

    // Update last used timestamp
    await this.db.query(
      'UPDATE agent_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [credential.id]
    );

    // Get agent
    return this.getAgent(credential.agentId);
  }

  /**
   * Rotate agent credential
   * AGENT-14: Credential rotation
   */
  async rotateCredential(
    credentialId: string,
    actorId?: string
  ): Promise<{ credential: AgentCredential; apiKey: string }> {
    // Get existing credential
    const existingResult = await this.db.query(
      'SELECT * FROM agent_credentials WHERE id = $1',
      [credentialId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    const existing = this.mapRowToCredential(existingResult.rows[0]);

    // Revoke old credential
    await this.revokeCredential(credentialId, 'rotated', actorId);

    // Create new credential
    const { credential, apiKey } = await this.createCredential(
      existing.agentId,
      existing.credentialType,
      {
        expiresInDays: existing.expiresAt
          ? Math.ceil((existing.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : undefined,
        rateLimitPerHour: existing.rateLimitPerHour,
        rateLimitPerDay: existing.rateLimitPerDay,
      },
      actorId
    );

    await this.createAuditLog({
      agentId: existing.agentId,
      eventType: 'credential_rotated',
      eventCategory: 'security',
      actorId,
      actorType: 'user',
      metadata: {
        oldCredentialId: credentialId,
        newCredentialId: credential.id,
      },
    });

    return { credential, apiKey: apiKey! };
  }

  /**
   * Revoke credential
   */
  async revokeCredential(
    credentialId: string,
    reason: string,
    actorId?: string
  ): Promise<void> {
    const result = await this.db.query(
      `UPDATE agent_credentials
       SET is_active = false,
           revoked_at = CURRENT_TIMESTAMP,
           revocation_reason = $1
       WHERE id = $2
       RETURNING agent_id`,
      [reason, credentialId]
    );

    if (result.rows.length > 0) {
      await this.createAuditLog({
        agentId: result.rows[0].agent_id,
        eventType: 'credential_revoked',
        eventCategory: 'security',
        actorId,
        actorType: 'user',
        metadata: { credentialId, reason },
      });
    }
  }

  /**
   * List agent credentials
   */
  async listCredentials(agentId: string): Promise<AgentCredential[]> {
    const result = await this.db.query(
      'SELECT * FROM agent_credentials WHERE agent_id = $1 ORDER BY created_at DESC',
      [agentId]
    );

    return result.rows.map(this.mapRowToCredential);
  }

  // =========================================================================
  // Audit Logging
  // =========================================================================

  private async createAuditLog(log: {
    agentId: string;
    eventType: AuditEventType;
    eventCategory: AuditEventCategory;
    actorId?: string;
    actorType?: 'user' | 'system' | 'agent';
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO agent_audit_log (
        agent_id, event_type, event_category,
        actor_id, actor_type, changes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        log.agentId,
        log.eventType,
        log.eventCategory,
        log.actorId,
        log.actorType,
        log.changes ? JSON.stringify(log.changes) : null,
        JSON.stringify(log.metadata || {}),
      ]
    );
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapRowToAgent(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      agentType: row.agent_type,
      version: row.version,
      organizationId: row.organization_id,
      tenantScopes: JSON.parse(row.tenant_scopes || '[]'),
      projectScopes: JSON.parse(row.project_scopes || '[]'),
      status: row.status,
      isCertified: row.is_certified,
      certificationDate: row.certification_date,
      certificationExpiresAt: row.certification_expires_at,
      capabilities: JSON.parse(row.capabilities || '[]'),
      restrictions: JSON.parse(row.restrictions || '{}'),
      ownerId: row.owner_id,
      metadata: JSON.parse(row.metadata || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapRowToCredential(row: any): AgentCredential {
    return {
      id: row.id,
      agentId: row.agent_id,
      credentialType: row.credential_type,
      keyHash: row.key_hash,
      keyPrefix: row.key_prefix,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      lastRotatedAt: row.last_rotated_at,
      rotationRequiredAt: row.rotation_required_at,
      isActive: row.is_active,
      revokedAt: row.revoked_at,
      revocationReason: row.revocation_reason,
      rateLimitPerHour: row.rate_limit_per_hour,
      rateLimitPerDay: row.rate_limit_per_day,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
