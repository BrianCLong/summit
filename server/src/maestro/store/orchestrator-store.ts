import { Pool, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../config/logger.js';
import { 
  MaestroLoop,
  MaestroAgent,
  MaestroExperiment,
  MaestroPlaybook,
  CoordinationTask,
  CoordinationChannel,
  ConsensusProposal,
  MaestroAuditEvent
} from '../types.js';

export class OrchestratorPostgresStore {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    // Create the required tables if they don't exist
    const createTablesQuery = `
      -- Maestro loops table
      CREATE TABLE IF NOT EXISTS maestro_loops (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        last_decision TEXT,
        last_run TIMESTAMP WITH TIME ZONE,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Maestro agents table
      CREATE TABLE IF NOT EXISTS maestro_agents (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        model VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        routing_weight INTEGER DEFAULT 100,
        metrics JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Maestro experiments table
      CREATE TABLE IF NOT EXISTS maestro_experiments (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        hypothesis TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'running',
        variants TEXT[],
        metrics JSONB DEFAULT '{}',
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Maestro playbooks table
      CREATE TABLE IF NOT EXISTS maestro_playbooks (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        triggers TEXT[],
        actions TEXT[],
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Maestro audit log table
      CREATE TABLE IF NOT EXISTS maestro_audit_log (
        id SERIAL PRIMARY KEY,
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        details TEXT,
        status VARCHAR(50) DEFAULT 'allowed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Coordination tasks table
      CREATE TABLE IF NOT EXISTS maestro_coordination_tasks (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        owner_id VARCHAR(255),
        participants TEXT[],
        priority INTEGER DEFAULT 0,
        result JSONB,
        error TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );

      -- Coordination channels table
      CREATE TABLE IF NOT EXISTS maestro_coordination_channels (
        id VARCHAR(255) PRIMARY KEY,
        topic VARCHAR(255) NOT NULL,
        participants TEXT[],
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Consensus proposals table
      CREATE TABLE IF NOT EXISTS maestro_consensus_proposals (
        id VARCHAR(255) PRIMARY KEY,
        topic VARCHAR(255) NOT NULL,
        proposal_data JSONB NOT NULL,
        coordinator_id VARCHAR(255) NOT NULL,
        voters TEXT[],
        votes JSONB DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'voting',
        deadline TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_maestro_loops_status ON maestro_loops(status);
      CREATE INDEX IF NOT EXISTS idx_maestro_agents_status ON maestro_agents(status);
      CREATE INDEX IF NOT EXISTS idx_maestro_experiments_status ON maestro_experiments(status);
      CREATE INDEX IF NOT EXISTS idx_maestro_audit_log_created_at ON maestro_audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_maestro_coordination_tasks_status ON maestro_coordination_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_maestro_coordination_channels_topic ON maestro_coordination_channels(topic);
      CREATE INDEX IF NOT EXISTS idx_maestro_consensus_proposals_status ON maestro_consensus_proposals(status);
    `;

    try {
      await this.pool.query(createTablesQuery);
      logger.info('OrchestratorPostgresStore initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize OrchestratorPostgresStore:', error);
      throw error;
    }
  }

  // Maestro Loops methods
  async getLoops(): Promise<MaestroLoop[]> {
    const result = await this.pool.query(
      'SELECT id, name, type, status, last_decision, last_run, config FROM maestro_loops ORDER BY created_at DESC'
    );
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      lastDecision: row.last_decision,
      lastRun: row.last_run ? new Date(row.last_run).toISOString() : '',
      config: row.config || {},
    }));
  }

  async getLoopById(id: string): Promise<MaestroLoop | null> {
    const result = await this.pool.query(
      'SELECT id, name, type, status, last_decision, last_run, config FROM maestro_loops WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      lastDecision: row.last_decision,
      lastRun: row.last_run ? new Date(row.last_run).toISOString() : '',
      config: row.config || {},
    };
  }

  async updateLoopStatus(id: string, status: 'active' | 'paused' | 'inactive'): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE maestro_loops SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    return result.rowCount !== 0;
  }

  // Maestro Agents methods
  async getAgents(): Promise<MaestroAgent[]> {
    const result = await this.pool.query(
      'SELECT id, name, role, model, status, routing_weight, metrics FROM maestro_agents ORDER BY created_at DESC'
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      model: row.model,
      status: row.status,
      routingWeight: row.routing_weight,
      metrics: row.metrics || {},
    }));
  }

  async getAgentById(id: string): Promise<MaestroAgent | null> {
    const result = await this.pool.query(
      'SELECT id, name, role, model, status, routing_weight, metrics FROM maestro_agents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      model: row.model,
      status: row.status,
      routingWeight: row.routing_weight,
      metrics: row.metrics || {},
    };
  }

  async updateAgent(id: string, updates: Partial<MaestroAgent>, actor: string): Promise<MaestroAgent | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update agent
      const updateResult = await client.query(
        `UPDATE maestro_agents SET 
          name = COALESCE($1, name), 
          role = COALESCE($2, role), 
          model = COALESCE($3, model), 
          status = COALESCE($4, status), 
          routing_weight = COALESCE($5, routing_weight), 
          metrics = COALESCE($6, metrics), 
          updated_at = CURRENT_TIMESTAMP 
         WHERE id = $7 
         RETURNING *`,
        [
          updates.name, 
          updates.role, 
          updates.model, 
          updates.status, 
          updates.routingWeight, 
          updates.metrics, 
          id
        ]
      );

      if (updateResult.rows.length === 0) {
        return null;
      }

      // Log audit event
      await client.query(
        'INSERT INTO maestro_audit_log (actor, action, resource, details) VALUES ($1, $2, $3, $4)',
        [actor, 'update_agent', `agent:${id}`, `Updated agent ${id}`]
      );

      await client.query('COMMIT');
      
      const row = updateResult.rows[0];
      return {
        id: row.id,
        name: row.name,
        role: row.role,
        model: row.model,
        status: row.status,
        routingWeight: row.routing_weight,
        metrics: row.metrics || {},
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Maestro Experiments methods
  async getExperiments(): Promise<MaestroExperiment[]> {
    const result = await this.pool.query(
      'SELECT id, name, hypothesis, status, variants, metrics, start_date, end_date FROM maestro_experiments ORDER BY created_at DESC'
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      hypothesis: row.hypothesis,
      status: row.status,
      variants: row.variants || [],
      metrics: row.metrics || {},
      startDate: row.start_date ? new Date(row.start_date).toISOString() : '',
      endDate: row.end_date ? new Date(row.end_date).toISOString() : '',
    }));
  }

  async createExperiment(experiment: MaestroExperiment, actor: string): Promise<MaestroExperiment> {
    const result = await this.pool.query(
      `INSERT INTO maestro_experiments 
       (id, name, hypothesis, status, variants, metrics, start_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, hypothesis, status, variants, metrics, start_date, created_at`,
      [
        experiment.id || uuidv4(),
        experiment.name, 
        experiment.hypothesis, 
        experiment.status, 
        experiment.variants, 
        experiment.metrics, 
        experiment.startDate ? new Date(experiment.startDate) : null
      ]
    );

    // Log audit event
    await this.pool.query(
      'INSERT INTO maestro_audit_log (actor, action, resource, details) VALUES ($1, $2, $3, $4)',
      [actor, 'create_experiment', `experiment:${result.rows[0].id}`, `Created experiment ${result.rows[0].name}`]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      hypothesis: row.hypothesis,
      status: row.status,
      variants: row.variants || [],
      metrics: row.metrics || {},
      startDate: row.start_date ? new Date(row.start_date).toISOString() : '',
      endDate: row.end_date ? new Date(row.end_date).toISOString() : '',
    };
  }

  // Maestro Playbooks methods
  async getPlaybooks(): Promise<MaestroPlaybook[]> {
    const result = await this.pool.query(
      'SELECT id, name, description, triggers, actions, is_enabled FROM maestro_playbooks ORDER BY created_at DESC'
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      triggers: row.triggers || [],
      actions: row.actions || [],
      isEnabled: row.is_enabled,
    }));
  }

  // Coordination methods
  async createCoordinationTask(
    task: Omit<CoordinationTask, 'id' | 'createdAt' | 'updatedAt' | 'result' | 'error'>,
    actor: string
  ): Promise<CoordinationTask> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const result = await this.pool.query(
      `INSERT INTO maestro_coordination_tasks 
       (id, title, description, owner_id, participants, priority) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, title, description, status, owner_id, participants, priority, created_at`,
      [id, task.title, task.description, task.ownerId, task.participants, task.priority]
    );

    // Log audit event
    await this.pool.query(
      'INSERT INTO maestro_audit_log (actor, action, resource, details) VALUES ($1, $2, $3, $4)',
      [actor, 'create_coordination_task', `coordination_task:${id}`, `Created coordination task ${task.title}`]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status || 'pending',
      ownerId: row.owner_id,
      participants: row.participants || [],
      priority: row.priority || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async getCoordinationTaskById(id: string): Promise<CoordinationTask | null> {
    const result = await this.pool.query(
      'SELECT id, title, description, status, owner_id, participants, priority, created_at, updated_at FROM maestro_coordination_tasks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      ownerId: row.owner_id,
      participants: row.participants || [],
      priority: row.priority || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  async updateCoordinationTaskStatus(id: string, status: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE maestro_coordination_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    return result.rowCount !== 0;
  }

  async createCoordinationChannel(
    topic: string,
    participantAgentIds: string[],
    actor: string
  ): Promise<CoordinationChannel> {
    const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const result = await this.pool.query(
      `INSERT INTO maestro_coordination_channels 
       (id, topic, participants) 
       VALUES ($1, $2, $3) 
       RETURNING id, topic, participants, status, created_at`,
      [id, topic, participantAgentIds]
    );

    // Log audit event
    await this.pool.query(
      'INSERT INTO maestro_audit_log (actor, action, resource, details) VALUES ($1, $2, $3, $4)',
      [actor, 'create_coordination_channel', `coordination_channel:${id}`, `Created coordination channel for topic: ${topic}`]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      topic: row.topic,
      participants: row.participants || [],
      status: row.status || 'active',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async getCoordinationChannelById(id: string): Promise<CoordinationChannel | null> {
    const result = await this.pool.query(
      'SELECT id, topic, participants, status, created_at, updated_at FROM maestro_coordination_channels WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      topic: row.topic,
      participants: row.participants || [],
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  async initiateConsensus<T>(
    coordinatorId: string,
    topic: string,
    proposal: T,
    voterAgentIds: string[],
    deadlineHours: number,
    actor: string
  ): Promise<ConsensusProposal<T>> {
    const id = `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);
    
    const result = await this.pool.query(
      `INSERT INTO maestro_consensus_proposals 
       (id, topic, proposal_data, coordinator_id, voters, deadline) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, topic, proposal_data, coordinator_id, voters, status, deadline, created_at`,
      [id, topic, JSON.stringify(proposal), coordinatorId, voterAgentIds, deadline]
    );

    // Log audit event
    await this.pool.query(
      'INSERT INTO maestro_audit_log (actor, action, resource, details) VALUES ($1, $2, $3, $4)',
      [actor, 'initiate_consensus', `consensus_proposal:${id}`, `Initiated consensus for topic: ${topic}`]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      topic: row.topic,
      proposal: JSON.parse(row.proposal_data) as T,
      coordinatorId: row.coordinator_id,
      voters: row.voters || [],
      votes: row.votes || {},
      status: row.status || 'voting',
      deadline: row.deadline ? new Date(row.deadline).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async getConsensusProposalById<T>(id: string): Promise<ConsensusProposal<T> | null> {
    const result = await this.pool.query(
      'SELECT id, topic, proposal_data, coordinator_id, voters, votes, status, deadline, created_at FROM maestro_consensus_proposals WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      topic: row.topic,
      proposal: JSON.parse(row.proposal_data) as T,
      coordinatorId: row.coordinator_id,
      voters: row.voters || [],
      votes: row.votes || {},
      status: row.status,
      deadline: row.deadline ? new Date(row.deadline).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async recordVote<T>(
    proposalId: string,
    agentId: string,
    vote: { decision: 'approve' | 'reject' | 'abstain'; reason?: string; weight?: number }
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // First, get the current votes
      const result = await client.query(
        'SELECT votes FROM maestro_consensus_proposals WHERE id = $1',
        [proposalId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const currentVotes = result.rows[0].votes || {};
      currentVotes[agentId] = {
        ...vote,
        timestamp: new Date().toISOString(),
        weight: vote.weight || 1
      };

      // Update the votes
      await client.query(
        'UPDATE maestro_consensus_proposals SET votes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(currentVotes), proposalId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Audit log methods
  async getAuditLog(limit: number = 100): Promise<MaestroAuditEvent[]> {
    const result = await this.pool.query(
      `SELECT id, actor, action, resource, details, status, created_at 
       FROM maestro_audit_log 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      id: String(row.id),
      timestamp: new Date(row.created_at).toISOString(),
      actor: row.actor,
      action: row.action,
      resource: row.resource,
      details: row.details,
      status: row.status,
    }));
  }

  async logAudit(actor: string, action: string, resource: string, details: string, status: string = 'allowed'): Promise<void> {
    await this.pool.query(
      'INSERT INTO maestro_audit_log (actor, action, resource, details, status) VALUES ($1, $2, $3, $4, $5)',
      [actor, action, resource, details, status]
    );
  }
}
