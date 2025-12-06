/**
 * Investigation Workflow Engine
 *
 * Orchestrates complex multi-step intelligence investigations:
 * - Workflow definition and execution
 * - State machine for investigation phases
 * - Parallel and sequential task execution
 * - Checkpoint and resume capability
 * - Human-in-the-loop integration
 *
 * Investigation Phases:
 * 1. Collection - Gather initial intelligence
 * 2. Processing - Normalize and enrich data
 * 3. Analysis - Pattern detection and correlation
 * 4. Production - Generate reports and findings
 * 5. Dissemination - Share results with stakeholders
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import type { ReActExecutor, AgentTask, ExecutionResult } from '../agents/react-executor.js';
import type { ThreatIntelEnrichmentService } from '../enrichment/threat-intel-enrichment.js';
import type { NL2CypherTranslator } from '../graph/nl2cypher.js';
import type { SecurityContext, OSINTEntity } from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkflowConfig {
  postgres: Pool;
  redis: Redis;
  agentExecutor: ReActExecutor;
  enrichmentService: ThreatIntelEnrichmentService;
  graphTranslator: NL2CypherTranslator;
  maxConcurrentTasks?: number;
  checkpointIntervalMs?: number;
  taskTimeoutMs?: number;
}

export type InvestigationPhase =
  | 'planning'
  | 'collection'
  | 'processing'
  | 'analysis'
  | 'production'
  | 'dissemination'
  | 'completed'
  | 'paused'
  | 'failed';

export interface Investigation {
  id: string;
  name: string;
  description: string;
  hypothesis?: string;
  phase: InvestigationPhase;
  priority: 'low' | 'normal' | 'high' | 'critical';
  classification: string;
  owner: string;
  team: string[];
  tags: string[];
  entities: InvestigationEntity[];
  tasks: InvestigationTask[];
  findings: Finding[];
  timeline: TimelineEvent[];
  artifacts: Artifact[];
  metadata: InvestigationMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface InvestigationEntity {
  id: string;
  type: string;
  value: string;
  role: 'seed' | 'discovered' | 'related' | 'attributed';
  confidence: number;
  enrichmentStatus: 'pending' | 'enriched' | 'failed';
  enrichmentData?: Record<string, unknown>;
  addedAt: Date;
  addedBy: string;
}

export interface InvestigationTask {
  id: string;
  type: TaskType;
  name: string;
  description: string;
  status: TaskStatus;
  phase: InvestigationPhase;
  priority: number;
  assignee?: string;
  dependencies: string[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  checkpoints: TaskCheckpoint[];
}

export type TaskType =
  | 'entity_enrichment'
  | 'graph_query'
  | 'pattern_detection'
  | 'correlation_analysis'
  | 'threat_assessment'
  | 'timeline_construction'
  | 'report_generation'
  | 'human_review'
  | 'external_lookup'
  | 'custom';

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'awaiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TaskCheckpoint {
  id: string;
  timestamp: Date;
  state: Record<string, unknown>;
  progress: number;
}

export interface Finding {
  id: string;
  type: 'observation' | 'correlation' | 'attribution' | 'indicator' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  relatedEntities: string[];
  relatedTasks: string[];
  evidence: Evidence[];
  createdAt: Date;
  createdBy: string;
  validated: boolean;
  validatedBy?: string;
}

export interface Evidence {
  type: 'query_result' | 'enrichment' | 'pattern_match' | 'analyst_note' | 'external_source';
  source: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'entity_added' | 'task_completed' | 'finding_created' | 'phase_changed' | 'note_added';
  description: string;
  actor: string;
  relatedIds: string[];
  metadata?: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  type: 'report' | 'export' | 'visualization' | 'query_result' | 'attachment';
  name: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
  createdBy: string;
}

export interface InvestigationMetadata {
  source?: string;
  externalIds?: Record<string, string>;
  customFields?: Record<string, unknown>;
  sharing?: {
    level: 'private' | 'team' | 'organization' | 'community';
    recipients?: string[];
  };
}

// =============================================================================
// WORKFLOW ENGINE
// =============================================================================

export class InvestigationWorkflowEngine extends EventEmitter {
  private config: WorkflowConfig;
  private postgres: Pool;
  private redis: Redis;
  private activeInvestigations: Map<string, Investigation> = new Map();
  private taskExecutors: Map<TaskType, TaskExecutor> = new Map();

  constructor(config: WorkflowConfig) {
    super();
    this.config = {
      maxConcurrentTasks: 5,
      checkpointIntervalMs: 30000,
      taskTimeoutMs: 300000,
      ...config,
    };

    this.postgres = config.postgres;
    this.redis = config.redis;

    this.registerTaskExecutors();
  }

  private registerTaskExecutors(): void {
    // Entity enrichment executor
    this.taskExecutors.set('entity_enrichment', {
      execute: async (task, investigation, ctx) => {
        const entities = task.input.entities as string[];
        const results = [];

        for (const entityId of entities) {
          const entity = investigation.entities.find(e => e.id === entityId);
          if (!entity) continue;

          const enrichment = await this.config.enrichmentService.enrich({
            entityType: entity.type as any,
            entityValue: entity.value,
          });

          entity.enrichmentStatus = enrichment.enrichments.some(e => e.success) ? 'enriched' : 'failed';
          entity.enrichmentData = {
            aggregatedScore: enrichment.aggregatedScore,
            enrichments: enrichment.enrichments,
          };

          results.push({ entityId, enrichment });
        }

        return { success: true, results };
      },
    });

    // Graph query executor
    this.taskExecutors.set('graph_query', {
      execute: async (task, investigation, ctx) => {
        const query = task.input.query as string;

        const translation = await this.config.graphTranslator.translate({
          query,
          context: {
            clearance: ctx.clearance,
            tenantId: ctx.tenantId,
            recentEntities: investigation.entities.map(e => e.value),
          },
        });

        const results = await this.config.graphTranslator.executeQuery(
          translation.cypher,
          translation.parameters
        );

        return { success: true, query: translation.cypher, results };
      },
    });

    // Pattern detection executor
    this.taskExecutors.set('pattern_detection', {
      execute: async (task, investigation, ctx) => {
        const agentTask: AgentTask = {
          id: uuidv4(),
          sessionId: ctx.sessionId,
          query: `Analyze entities and find patterns: ${investigation.entities.map(e => e.value).join(', ')}`,
          context: {
            conversationHistory: [],
            extractedEntities: investigation.entities.map(e => ({
              type: e.type,
              value: e.value,
            })),
            previousResults: {},
            investigation: {
              id: investigation.id,
              name: investigation.name,
              phase: investigation.phase,
            },
          },
          securityContext: ctx,
        };

        const result = await this.config.agentExecutor.execute(agentTask, 'researcher');

        return {
          success: result.success,
          patterns: result.answer,
          trace: result.trace,
        };
      },
    });

    // Correlation analysis executor
    this.taskExecutors.set('correlation_analysis', {
      execute: async (task, investigation, ctx) => {
        // Find relationships between entities
        const correlations = [];

        for (let i = 0; i < investigation.entities.length; i++) {
          for (let j = i + 1; j < investigation.entities.length; j++) {
            const entityA = investigation.entities[i];
            const entityB = investigation.entities[j];

            // Query for paths between entities
            const translation = await this.config.graphTranslator.translate({
              query: `Find paths between "${entityA.value}" and "${entityB.value}"`,
              context: { tenantId: ctx.tenantId },
            });

            const paths = await this.config.graphTranslator.executeQuery(
              translation.cypher,
              translation.parameters
            );

            if (paths.length > 0) {
              correlations.push({
                entityA: entityA.value,
                entityB: entityB.value,
                pathCount: paths.length,
                shortestPath: paths[0],
              });
            }
          }
        }

        return { success: true, correlations };
      },
    });

    // Report generation executor
    this.taskExecutors.set('report_generation', {
      execute: async (task, investigation, ctx) => {
        const agentTask: AgentTask = {
          id: uuidv4(),
          sessionId: ctx.sessionId,
          query: `Generate an investigation report for: ${investigation.name}

Key findings:
${investigation.findings.map(f => `- ${f.title}: ${f.description}`).join('\n')}

Entities analyzed: ${investigation.entities.length}
Tasks completed: ${investigation.tasks.filter(t => t.status === 'completed').length}`,
          context: {
            conversationHistory: [],
            extractedEntities: [],
            previousResults: {
              findings: investigation.findings,
              entities: investigation.entities,
            },
            investigation: {
              id: investigation.id,
              name: investigation.name,
              phase: investigation.phase,
            },
          },
          securityContext: ctx,
        };

        const result = await this.config.agentExecutor.execute(agentTask, 'synthesizer');

        return {
          success: result.success,
          report: result.answer,
        };
      },
    });

    // Human review executor (creates approval request)
    this.taskExecutors.set('human_review', {
      execute: async (task, investigation, ctx) => {
        // This task requires human input - mark as awaiting
        return {
          success: false,
          awaitingInput: true,
          message: 'Awaiting human review',
          reviewData: task.input,
        };
      },
    });
  }

  // ===========================================================================
  // INVESTIGATION LIFECYCLE
  // ===========================================================================

  async createInvestigation(params: {
    name: string;
    description: string;
    hypothesis?: string;
    priority: Investigation['priority'];
    classification: string;
    seedEntities: Array<{ type: string; value: string }>;
    securityContext: SecurityContext;
  }): Promise<Investigation> {
    const investigation: Investigation = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      hypothesis: params.hypothesis,
      phase: 'planning',
      priority: params.priority,
      classification: params.classification,
      owner: params.securityContext.userId,
      team: [params.securityContext.userId],
      tags: [],
      entities: params.seedEntities.map(e => ({
        id: uuidv4(),
        type: e.type,
        value: e.value,
        role: 'seed',
        confidence: 1.0,
        enrichmentStatus: 'pending',
        addedAt: new Date(),
        addedBy: params.securityContext.userId,
      })),
      tasks: [],
      findings: [],
      timeline: [{
        id: uuidv4(),
        timestamp: new Date(),
        type: 'phase_changed',
        description: 'Investigation created',
        actor: params.securityContext.userId,
        relatedIds: [],
      }],
      artifacts: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate initial tasks based on seed entities
    investigation.tasks = this.generateInitialTasks(investigation);

    // Persist to database
    await this.saveInvestigation(investigation);

    this.activeInvestigations.set(investigation.id, investigation);

    this.emit('investigation:created', { investigation });

    return investigation;
  }

  async getInvestigation(id: string): Promise<Investigation | null> {
    // Check active cache
    if (this.activeInvestigations.has(id)) {
      return this.activeInvestigations.get(id)!;
    }

    // Load from database
    const result = await this.postgres.query(
      `SELECT * FROM investigations WHERE id = $1`,
      [id]
    );

    if (!result.rows[0]) return null;

    const investigation = this.rowToInvestigation(result.rows[0]);
    this.activeInvestigations.set(id, investigation);

    return investigation;
  }

  async advancePhase(
    investigationId: string,
    securityContext: SecurityContext
  ): Promise<Investigation> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const phaseOrder: InvestigationPhase[] = [
      'planning',
      'collection',
      'processing',
      'analysis',
      'production',
      'dissemination',
      'completed',
    ];

    const currentIndex = phaseOrder.indexOf(investigation.phase);
    if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
      throw new Error(`Cannot advance from phase: ${investigation.phase}`);
    }

    const newPhase = phaseOrder[currentIndex + 1];
    investigation.phase = newPhase;
    investigation.updatedAt = new Date();

    if (newPhase === 'completed') {
      investigation.completedAt = new Date();
    }

    // Add timeline event
    investigation.timeline.push({
      id: uuidv4(),
      timestamp: new Date(),
      type: 'phase_changed',
      description: `Phase changed to ${newPhase}`,
      actor: securityContext.userId,
      relatedIds: [],
    });

    // Generate phase-specific tasks
    const newTasks = this.generatePhaseTasks(investigation, newPhase);
    investigation.tasks.push(...newTasks);

    await this.saveInvestigation(investigation);

    this.emit('investigation:phaseChanged', {
      investigationId,
      oldPhase: phaseOrder[currentIndex],
      newPhase,
    });

    return investigation;
  }

  // ===========================================================================
  // TASK EXECUTION
  // ===========================================================================

  async executeTask(
    investigationId: string,
    taskId: string,
    securityContext: SecurityContext
  ): Promise<InvestigationTask> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const task = investigation.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Check dependencies
    for (const depId of task.dependencies) {
      const dep = investigation.tasks.find(t => t.id === depId);
      if (dep && dep.status !== 'completed') {
        throw new Error(`Dependency not completed: ${depId}`);
      }
    }

    // Get executor
    const executor = this.taskExecutors.get(task.type);
    if (!executor) {
      throw new Error(`No executor for task type: ${task.type}`);
    }

    // Update status
    task.status = 'running';
    task.startedAt = new Date();
    await this.saveInvestigation(investigation);

    this.emit('task:started', { investigationId, taskId });

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeoutMs)
      );

      const result = await Promise.race([
        executor.execute(task, investigation, securityContext),
        timeoutPromise,
      ]);

      if (result.awaitingInput) {
        task.status = 'awaiting_input';
      } else {
        task.status = 'completed';
        task.output = result;
      }

      task.completedAt = new Date();

      // Auto-create findings from results
      if (result.success && !result.awaitingInput) {
        await this.processTaskResults(investigation, task, result, securityContext);
      }

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.retryCount++;

      // Retry if under limit
      if (task.retryCount < task.maxRetries) {
        task.status = 'pending';
      }
    }

    // Add timeline event
    investigation.timeline.push({
      id: uuidv4(),
      timestamp: new Date(),
      type: 'task_completed',
      description: `Task "${task.name}" ${task.status}`,
      actor: securityContext.userId,
      relatedIds: [taskId],
    });

    await this.saveInvestigation(investigation);

    this.emit('task:completed', { investigationId, taskId, status: task.status });

    return task;
  }

  async executeAllPendingTasks(
    investigationId: string,
    securityContext: SecurityContext
  ): Promise<void> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) return;

    const pendingTasks = investigation.tasks.filter(t => t.status === 'pending');

    // Execute tasks respecting dependencies and concurrency
    const executing = new Set<string>();

    while (pendingTasks.length > 0 || executing.size > 0) {
      // Find executable tasks
      const executable = pendingTasks.filter(t => {
        // All dependencies completed
        const depsCompleted = t.dependencies.every(depId => {
          const dep = investigation.tasks.find(dt => dt.id === depId);
          return dep?.status === 'completed';
        });
        return depsCompleted;
      });

      // Start tasks up to concurrency limit
      for (const task of executable) {
        if (executing.size >= this.config.maxConcurrentTasks!) break;

        const index = pendingTasks.indexOf(task);
        pendingTasks.splice(index, 1);
        executing.add(task.id);

        // Execute async
        this.executeTask(investigationId, task.id, securityContext)
          .finally(() => executing.delete(task.id));
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // ===========================================================================
  // FINDINGS & ENTITIES
  // ===========================================================================

  async addFinding(
    investigationId: string,
    finding: Omit<Finding, 'id' | 'createdAt' | 'validated' | 'validatedBy'>,
    securityContext: SecurityContext
  ): Promise<Finding> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const newFinding: Finding = {
      ...finding,
      id: uuidv4(),
      createdAt: new Date(),
      validated: false,
    };

    investigation.findings.push(newFinding);

    investigation.timeline.push({
      id: uuidv4(),
      timestamp: new Date(),
      type: 'finding_created',
      description: `Finding: ${newFinding.title}`,
      actor: securityContext.userId,
      relatedIds: [newFinding.id],
    });

    await this.saveInvestigation(investigation);

    this.emit('finding:created', { investigationId, finding: newFinding });

    return newFinding;
  }

  async addEntity(
    investigationId: string,
    entity: { type: string; value: string; role: InvestigationEntity['role'] },
    securityContext: SecurityContext
  ): Promise<InvestigationEntity> {
    const investigation = await this.getInvestigation(investigationId);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    // Check for duplicates
    const existing = investigation.entities.find(
      e => e.type === entity.type && e.value === entity.value
    );
    if (existing) {
      return existing;
    }

    const newEntity: InvestigationEntity = {
      id: uuidv4(),
      type: entity.type,
      value: entity.value,
      role: entity.role,
      confidence: entity.role === 'discovered' ? 0.7 : 0.9,
      enrichmentStatus: 'pending',
      addedAt: new Date(),
      addedBy: securityContext.userId,
    };

    investigation.entities.push(newEntity);

    investigation.timeline.push({
      id: uuidv4(),
      timestamp: new Date(),
      type: 'entity_added',
      description: `Entity added: ${entity.type}:${entity.value}`,
      actor: securityContext.userId,
      relatedIds: [newEntity.id],
    });

    // Create enrichment task
    investigation.tasks.push({
      id: uuidv4(),
      type: 'entity_enrichment',
      name: `Enrich ${entity.value}`,
      description: `Enrich ${entity.type} entity`,
      status: 'pending',
      phase: investigation.phase,
      priority: 5,
      dependencies: [],
      input: { entities: [newEntity.id] },
      retryCount: 0,
      maxRetries: 3,
      checkpoints: [],
    });

    await this.saveInvestigation(investigation);

    this.emit('entity:added', { investigationId, entity: newEntity });

    return newEntity;
  }

  // ===========================================================================
  // TASK GENERATION
  // ===========================================================================

  private generateInitialTasks(investigation: Investigation): InvestigationTask[] {
    const tasks: InvestigationTask[] = [];

    // Enrichment task for all seed entities
    if (investigation.entities.length > 0) {
      tasks.push({
        id: uuidv4(),
        type: 'entity_enrichment',
        name: 'Enrich seed entities',
        description: 'Enrich all seed entities with threat intelligence',
        status: 'pending',
        phase: 'collection',
        priority: 10,
        dependencies: [],
        input: { entities: investigation.entities.map(e => e.id) },
        retryCount: 0,
        maxRetries: 3,
        checkpoints: [],
      });
    }

    return tasks;
  }

  private generatePhaseTasks(
    investigation: Investigation,
    phase: InvestigationPhase
  ): InvestigationTask[] {
    const tasks: InvestigationTask[] = [];
    const enrichmentTaskId = investigation.tasks.find(t => t.type === 'entity_enrichment')?.id;

    switch (phase) {
      case 'collection':
        // Graph queries for seed entities
        tasks.push({
          id: uuidv4(),
          type: 'graph_query',
          name: 'Query entity relationships',
          description: 'Find related entities in the knowledge graph',
          status: 'pending',
          phase,
          priority: 8,
          dependencies: enrichmentTaskId ? [enrichmentTaskId] : [],
          input: {
            query: `Find all relationships for entities: ${investigation.entities.map(e => e.value).join(', ')}`,
          },
          retryCount: 0,
          maxRetries: 3,
          checkpoints: [],
        });
        break;

      case 'analysis':
        tasks.push({
          id: uuidv4(),
          type: 'pattern_detection',
          name: 'Detect patterns',
          description: 'Analyze entities and relationships for patterns',
          status: 'pending',
          phase,
          priority: 9,
          dependencies: investigation.tasks.filter(t => t.phase === 'collection').map(t => t.id),
          input: {},
          retryCount: 0,
          maxRetries: 2,
          checkpoints: [],
        });

        tasks.push({
          id: uuidv4(),
          type: 'correlation_analysis',
          name: 'Correlation analysis',
          description: 'Find correlations between entities',
          status: 'pending',
          phase,
          priority: 8,
          dependencies: investigation.tasks.filter(t => t.phase === 'collection').map(t => t.id),
          input: {},
          retryCount: 0,
          maxRetries: 2,
          checkpoints: [],
        });
        break;

      case 'production':
        tasks.push({
          id: uuidv4(),
          type: 'report_generation',
          name: 'Generate report',
          description: 'Generate investigation report',
          status: 'pending',
          phase,
          priority: 10,
          dependencies: investigation.tasks.filter(t => t.phase === 'analysis').map(t => t.id),
          input: {},
          retryCount: 0,
          maxRetries: 2,
          checkpoints: [],
        });

        tasks.push({
          id: uuidv4(),
          type: 'human_review',
          name: 'Review findings',
          description: 'Human review of findings before dissemination',
          status: 'pending',
          phase,
          priority: 10,
          dependencies: [],
          input: { findings: investigation.findings.map(f => f.id) },
          retryCount: 0,
          maxRetries: 0,
          checkpoints: [],
        });
        break;
    }

    return tasks;
  }

  private async processTaskResults(
    investigation: Investigation,
    task: InvestigationTask,
    result: Record<string, unknown>,
    securityContext: SecurityContext
  ): Promise<void> {
    // Auto-generate findings based on task results
    if (task.type === 'pattern_detection' && result.patterns) {
      await this.addFinding(investigation.id, {
        type: 'observation',
        title: 'Pattern Detection Results',
        description: result.patterns as string,
        confidence: 0.7,
        severity: 'medium',
        relatedEntities: investigation.entities.map(e => e.id),
        relatedTasks: [task.id],
        evidence: [{
          type: 'pattern_match',
          source: 'pattern_detection_agent',
          data: result,
          timestamp: new Date(),
        }],
        createdBy: 'system',
      }, securityContext);
    }

    if (task.type === 'correlation_analysis' && result.correlations) {
      const correlations = result.correlations as Array<{
        entityA: string;
        entityB: string;
        pathCount: number;
      }>;

      for (const corr of correlations.filter(c => c.pathCount > 0)) {
        await this.addFinding(investigation.id, {
          type: 'correlation',
          title: `Correlation: ${corr.entityA} ↔ ${corr.entityB}`,
          description: `Found ${corr.pathCount} connection path(s) between entities`,
          confidence: Math.min(0.5 + corr.pathCount * 0.1, 0.95),
          severity: corr.pathCount > 3 ? 'high' : 'medium',
          relatedEntities: investigation.entities
            .filter(e => e.value === corr.entityA || e.value === corr.entityB)
            .map(e => e.id),
          relatedTasks: [task.id],
          evidence: [{
            type: 'query_result',
            source: 'correlation_analysis',
            data: corr,
            timestamp: new Date(),
          }],
          createdBy: 'system',
        }, securityContext);
      }
    }
  }

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  private async saveInvestigation(investigation: Investigation): Promise<void> {
    investigation.updatedAt = new Date();

    await this.postgres.query(
      `INSERT INTO investigations (id, name, data, phase, owner, tenant_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         data = $3, phase = $4, updated_at = $8`,
      [
        investigation.id,
        investigation.name,
        JSON.stringify(investigation),
        investigation.phase,
        investigation.owner,
        'default', // tenant_id
        investigation.createdAt,
        investigation.updatedAt,
      ]
    );

    // Update cache
    this.activeInvestigations.set(investigation.id, investigation);
  }

  private rowToInvestigation(row: Record<string, unknown>): Investigation {
    return row.data as Investigation;
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface TaskExecutor {
  execute(
    task: InvestigationTask,
    investigation: Investigation,
    securityContext: SecurityContext
  ): Promise<Record<string, unknown>>;
}

// =============================================================================
// FACTORY
// =============================================================================

export function createWorkflowEngine(config: WorkflowConfig): InvestigationWorkflowEngine {
  return new InvestigationWorkflowEngine(config);
}
