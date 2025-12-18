/**
 * Ghost Analyst Driver
 * Simulates human analyst workflows interacting with the IntelGraph platform
 */

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  GhostAnalystSession,
  WorkflowStep,
  Workflow,
  ScenarioData,
  HarnessConfig,
  SessionMetrics,
} from '../types/index.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';
import { Logger } from '../utils/Logger.js';

/**
 * GraphQL queries used by the ghost analyst
 */
const QUERIES = {
  healthCheck: `
    query {
      __typename
    }
  `,

  createInvestigation: `
    mutation CreateInvestigation($input: CreateInvestigationInput!) {
      createInvestigation(input: $input) {
        id
        name
        description
        status
        createdAt
      }
    }
  `,

  addEntity: `
    mutation AddEntity($input: CreateEntityInput!) {
      createEntity(input: $input) {
        id
        type
        name
        properties
      }
    }
  `,

  addRelationship: `
    mutation AddRelationship($input: CreateRelationshipInput!) {
      createRelationship(input: $input) {
        id
        type
        fromEntityId
        toEntityId
        properties
      }
    }
  `,

  queryEntities: `
    query QueryEntities($investigationId: ID!, $type: String, $limit: Int) {
      investigation(id: $investigationId) {
        entities(type: $type, limit: $limit) {
          id
          type
          name
          properties
        }
      }
    }
  `,

  queryRelationships: `
    query QueryRelationships($investigationId: ID!, $entityId: ID) {
      investigation(id: $investigationId) {
        relationships(entityId: $entityId) {
          id
          type
          fromEntityId
          toEntityId
          properties
        }
      }
    }
  `,

  expandNetwork: `
    query ExpandNetwork($investigationId: ID!, $entityId: ID!, $depth: Int!) {
      investigation(id: $investigationId) {
        expandNetwork(entityId: $entityId, depth: $depth) {
          entities {
            id
            type
            name
          }
          relationships {
            id
            type
            fromEntityId
            toEntityId
          }
        }
      }
    }
  `,

  startCopilotRun: `
    mutation StartCopilotRun($goal: String!, $investigationId: ID!) {
      startCopilotRun(goal: $goal, investigationId: $investigationId) {
        id
        goal
        status
        createdAt
      }
    }
  `,

  getCopilotRunStatus: `
    query GetCopilotRunStatus($id: ID!) {
      copilotRun(id: $id) {
        id
        status
        results
        completedAt
      }
    }
  `,

  searchEntities: `
    query SearchEntities($investigationId: ID!, $query: String!) {
      investigation(id: $investigationId) {
        searchEntities(query: $query) {
          id
          type
          name
          relevanceScore
        }
      }
    }
  `,

  analyzePath: `
    query AnalyzePath($investigationId: ID!, $fromId: ID!, $toId: ID!) {
      investigation(id: $investigationId) {
        analyzePath(fromId: $fromId, toId: $toId) {
          paths {
            entities {
              id
              name
            }
            relationships {
              id
              type
            }
            length
            strength
          }
        }
      }
    }
  `,

  getInvestigation: `
    query GetInvestigation($id: ID!) {
      investigation(id: $id) {
        id
        name
        entities {
          id
          type
          name
        }
        relationships {
          id
          type
          fromEntityId
          toEntityId
        }
      }
    }
  `,
};

export class GhostAnalyst {
  private client: AxiosInstance;
  private config: HarnessConfig;
  private metricsCollector: MetricsCollector;
  private logger: Logger;
  private activeSessions: Map<string, GhostAnalystSession> = new Map();

  constructor(config: HarnessConfig) {
    this.config = config;
    this.logger = new Logger('GhostAnalyst');
    this.metricsCollector = new MetricsCollector();

    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Simulation-Mode': 'true',
        'X-Non-Production': 'true',
        ...config.api.headers,
      },
    });

    this.validateSafetyConfig();
  }

  /**
   * Validate that we're not targeting production
   */
  private validateSafetyConfig(): void {
    if (!this.config.safety.nonProdOnly) {
      throw new Error(
        'SAFETY: nonProdOnly must be true. This harness cannot target production.'
      );
    }

    const url = this.config.api.baseUrl.toLowerCase();
    if (
      url.includes('prod') ||
      url.includes('production') ||
      url.includes('.com') ||
      url.includes('.io')
    ) {
      throw new Error(
        `SAFETY: URL appears to be production: ${url}. Only localhost or explicit dev endpoints allowed.`
      );
    }

    this.logger.info('Safety validation passed: non-production mode confirmed');
  }

  /**
   * Run a workflow session
   */
  async runWorkflow(
    workflow: Workflow,
    scenarioData: ScenarioData
  ): Promise<GhostAnalystSession> {
    const sessionId = uuidv4();
    const session: GhostAnalystSession = {
      id: sessionId,
      scenarioData,
      workflow,
      config: this.config,
      metrics: this.initializeMetrics(sessionId, scenarioData),
      state: {
        entityIds: [],
        relationshipIds: [],
        currentStep: 0,
        completed: false,
        failed: false,
      },
    };

    this.activeSessions.set(sessionId, session);
    this.metricsCollector.startSession(sessionId);

    this.logger.info(
      `Starting workflow session ${sessionId}: ${workflow.name}`
    );

    try {
      await this.executeWorkflow(session);
      session.state.completed = true;
      session.metrics = this.metricsCollector.endSession(sessionId);
      this.logger.info(`Workflow session ${sessionId} completed successfully`);
    } catch (error: any) {
      session.state.failed = true;
      session.metrics.errors.push({
        timestamp: new Date().toISOString(),
        type: 'WORKFLOW_FAILURE',
        message: error.message,
        step: `Step ${session.state.currentStep}`,
      });
      this.logger.error(
        `Workflow session ${sessionId} failed: ${error.message}`
      );
      throw error;
    } finally {
      this.activeSessions.delete(sessionId);
    }

    return session;
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflow(session: GhostAnalystSession): Promise<void> {
    for (let i = 0; i < session.workflow.steps.length; i++) {
      session.state.currentStep = i;
      const step = session.workflow.steps[i];

      this.logger.debug(
        `Executing step ${i + 1}/${session.workflow.steps.length}: ${step.type}`
      );

      try {
        await this.executeStep(session, step);

        // Think time between steps (simulate human behavior)
        if (this.config.ghostAnalyst.thinkTime > 0 && i < session.workflow.steps.length - 1) {
          await this.sleep(this.config.ghostAnalyst.thinkTime);
        }
      } catch (error: any) {
        this.logger.error(`Step ${step.type} failed: ${error.message}`);
        session.metrics.tasksFailed++;
        session.metrics.errors.push({
          timestamp: new Date().toISOString(),
          type: step.type,
          message: error.message,
          step: `Step ${i}`,
        });
        throw error;
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<void> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (step.type) {
        case 'CREATE_INVESTIGATION':
          result = await this.createInvestigation(session, step);
          break;
        case 'ADD_ENTITY':
          result = await this.addEntity(session, step);
          break;
        case 'ADD_RELATIONSHIP':
          result = await this.addRelationship(session, step);
          break;
        case 'QUERY_ENTITIES':
          result = await this.queryEntities(session, step);
          break;
        case 'QUERY_RELATIONSHIPS':
          result = await this.queryRelationships(session, step);
          break;
        case 'EXPAND_NETWORK':
          result = await this.expandNetwork(session, step);
          break;
        case 'RUN_COPILOT':
          result = await this.runCopilot(session, step);
          break;
        case 'SEARCH':
          result = await this.searchEntities(session, step);
          break;
        case 'ANALYZE_PATH':
          result = await this.analyzePath(session, step);
          break;
        case 'EXPORT_DATA':
          result = await this.exportData(session, step);
          break;
        case 'WAIT':
          await this.sleep(step.params.duration || 1000);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const duration = Date.now() - startTime;
      session.metrics.tasksCompleted++;
      session.metrics.totalQueries++;
      session.metrics.averageQueryTime =
        (session.metrics.averageQueryTime * (session.metrics.totalQueries - 1) +
          duration) /
        session.metrics.totalQueries;

      this.metricsCollector.recordStepCompletion(session.id, step.type, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordStepFailure(
        session.id,
        step.type,
        duration,
        error
      );
      throw error;
    }
  }

  // ==================== Step Implementations ====================

  private async createInvestigation(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    const { investigation } = session.scenarioData;
    const variables = {
      input: {
        name: investigation.name,
        description: investigation.description,
        type: investigation.type,
        ...step.params,
      },
    };

    const result = await this.graphqlRequest(
      QUERIES.createInvestigation,
      variables
    );
    session.state.investigationId = result.createInvestigation.id;

    this.logger.info(
      `Created investigation: ${session.state.investigationId}`
    );

    return result;
  }

  private async addEntity(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const entityIndex = step.params.entityIndex;
    const entity = session.scenarioData.entities[entityIndex];

    if (!entity) {
      throw new Error(`Entity at index ${entityIndex} not found`);
    }

    const variables = {
      input: {
        investigationId: session.state.investigationId,
        type: entity.type,
        name: entity.name,
        properties: entity.properties,
      },
    };

    const result = await this.graphqlRequest(QUERIES.addEntity, variables);
    const entityId = result.createEntity.id;
    session.state.entityIds[entityIndex] = entityId;
    session.metrics.entitiesExplored++;

    this.logger.debug(`Added entity: ${entity.name} (${entityId})`);

    return result;
  }

  private async addRelationship(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const relIndex = step.params.relationshipIndex;
    const relationship = session.scenarioData.relationships[relIndex];

    if (!relationship) {
      throw new Error(`Relationship at index ${relIndex} not found`);
    }

    const fromEntityId = session.state.entityIds[relationship.from];
    const toEntityId = session.state.entityIds[relationship.to];

    if (!fromEntityId || !toEntityId) {
      throw new Error('Entity IDs not available for relationship');
    }

    const variables = {
      input: {
        investigationId: session.state.investigationId,
        type: relationship.type,
        fromEntityId,
        toEntityId,
        properties: relationship.properties,
      },
    };

    const result = await this.graphqlRequest(
      QUERIES.addRelationship,
      variables
    );
    session.state.relationshipIds.push(result.createRelationship.id);
    session.metrics.relationshipsExplored++;

    this.logger.debug(`Added relationship: ${relationship.type}`);

    return result;
  }

  private async queryEntities(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const variables = {
      investigationId: session.state.investigationId,
      type: step.params.type,
      limit: step.params.limit || 100,
    };

    const result = await this.graphqlRequest(QUERIES.queryEntities, variables);

    this.logger.debug(
      `Queried entities: ${result.investigation.entities.length} found`
    );

    return result;
  }

  private async queryRelationships(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const variables = {
      investigationId: session.state.investigationId,
      entityId: step.params.entityId,
    };

    const result = await this.graphqlRequest(
      QUERIES.queryRelationships,
      variables
    );

    this.logger.debug(
      `Queried relationships: ${result.investigation.relationships.length} found`
    );

    return result;
  }

  private async expandNetwork(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const variables = {
      investigationId: session.state.investigationId,
      entityId: step.params.entityId,
      depth: step.params.depth || 2,
    };

    const result = await this.graphqlRequest(QUERIES.expandNetwork, variables);

    const expanded = result.investigation.expandNetwork;
    session.metrics.entitiesExplored += expanded.entities.length;
    session.metrics.relationshipsExplored += expanded.relationships.length;

    this.logger.debug(
      `Expanded network: ${expanded.entities.length} entities, ${expanded.relationships.length} relationships`
    );

    return result;
  }

  private async runCopilot(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const goal =
      step.params.goal || session.scenarioData.copilotGoal || 'Analyze network';

    const variables = {
      goal,
      investigationId: session.state.investigationId,
    };

    const startTime = Date.now();
    const result = await this.graphqlRequest(
      QUERIES.startCopilotRun,
      variables
    );
    const copilotRunId = result.startCopilotRun.id;

    this.logger.info(`Started Copilot run: ${copilotRunId}`);

    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = step.timeout ? step.timeout / 2000 : 30;

    while (!completed && attempts < maxAttempts) {
      await this.sleep(2000);
      attempts++;

      const statusResult = await this.graphqlRequest(
        QUERIES.getCopilotRunStatus,
        { id: copilotRunId }
      );

      const status = statusResult.copilotRun.status;
      if (status === 'COMPLETED' || status === 'FAILED') {
        completed = true;
        session.metrics.copilotQueriesCount++;

        if (status === 'COMPLETED') {
          session.metrics.copilotSuccessRate =
            session.metrics.copilotSuccessRate === 0
              ? 1
              : (session.metrics.copilotSuccessRate + 1) / 2;
        }

        const duration = Date.now() - startTime;
        session.metrics.copilotAverageResponseTime =
          (session.metrics.copilotAverageResponseTime *
            (session.metrics.copilotQueriesCount - 1) +
            duration) /
          session.metrics.copilotQueriesCount;

        this.logger.info(
          `Copilot run ${copilotRunId} ${status.toLowerCase()} in ${duration}ms`
        );

        return statusResult;
      }
    }

    if (!completed) {
      throw new Error(`Copilot run timed out after ${maxAttempts * 2}s`);
    }

    return result;
  }

  private async searchEntities(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const variables = {
      investigationId: session.state.investigationId,
      query: step.params.query,
    };

    const result = await this.graphqlRequest(QUERIES.searchEntities, variables);

    this.logger.debug(
      `Search completed: ${result.investigation.searchEntities.length} results`
    );

    return result;
  }

  private async analyzePath(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const variables = {
      investigationId: session.state.investigationId,
      fromId: step.params.fromId,
      toId: step.params.toId,
    };

    const result = await this.graphqlRequest(QUERIES.analyzePath, variables);

    this.logger.debug(
      `Path analysis: ${result.investigation.analyzePath.paths.length} paths found`
    );

    return result;
  }

  private async exportData(
    session: GhostAnalystSession,
    step: WorkflowStep
  ): Promise<any> {
    if (!session.state.investigationId) {
      throw new Error('No investigation ID available');
    }

    const result = await this.graphqlRequest(QUERIES.getInvestigation, {
      id: session.state.investigationId,
    });

    this.logger.info('Data export completed');

    return result;
  }

  // ==================== Helper Methods ====================

  private async graphqlRequest(
    query: string,
    variables: Record<string, any> = {}
  ): Promise<any> {
    try {
      const response = await this.client.post(this.config.api.graphqlUrl, {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL Error: ${JSON.stringify(response.data.errors)}`
        );
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `HTTP ${error.response.status}: ${error.response.statusText}`
        );
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private initializeMetrics(
    sessionId: string,
    scenarioData: ScenarioData
  ): SessionMetrics {
    return {
      sessionId,
      scenarioType: scenarioData.metadata?.parameters.type || 'custom',
      startTime: new Date().toISOString(),
      duration: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      successRate: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      entitiesExplored: 0,
      entitiesTotal: scenarioData.entities.length,
      coverageRate: 0,
      relationshipsExplored: 0,
      relationshipsTotal: scenarioData.relationships.length,
      keyEntitiesFound: 0,
      keyEntitiesExpected: 0,
      copilotQueriesCount: 0,
      copilotSuccessRate: 0,
      copilotAverageResponseTime: 0,
      errors: [],
    };
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): GhostAnalystSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get metrics collector
   */
  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }
}
