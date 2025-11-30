import {
  DataCloneRequest,
  DataCloneResult,
  SyntheticDataRequest,
  SyntheticDataResult,
  SandboxQueryRequest,
  SandboxQueryResult,
  ScenarioTemplate,
  ScenarioSimulationRequest,
  DataLabErrorCode,
  DataLabError,
} from '../types/index.js';
import { DataCloneService, getDataCloneService } from '../data/DataCloneService.js';
import { DataAnonymizer, getDataAnonymizer } from '../anonymization/DataAnonymizer.js';
import {
  SyntheticDataGenerator,
  getSyntheticDataGenerator,
} from '../synthetic/SyntheticDataGenerator.js';
import {
  PromotionWorkflow,
  getPromotionWorkflow,
} from '../promotion/PromotionWorkflow.js';
import {
  SandboxTenantProfile,
  SandboxConfigManager,
  getSandboxConfigManager,
  getSandboxEnforcer,
  OperationType,
  PromotionRequest,
} from '@intelgraph/sandbox-tenant-profile';
import { createLogger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('DataLabAPI');

/**
 * Data lab session for tracking operations
 */
interface DataLabSession {
  id: string;
  sandboxId: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  operationCount: number;
}

/**
 * DataLabAPI provides the main interface for data lab operations
 * including cloning, synthetic generation, and sandbox queries.
 */
export class DataLabAPI {
  private configManager: SandboxConfigManager;
  private cloneService: DataCloneService;
  private syntheticGenerator: SyntheticDataGenerator;
  private anonymizer: DataAnonymizer;
  private promotionWorkflow: PromotionWorkflow;
  private sessions: Map<string, DataLabSession> = new Map();
  private scenarioTemplates: Map<string, ScenarioTemplate> = new Map();

  constructor() {
    this.configManager = getSandboxConfigManager();
    this.cloneService = getDataCloneService();
    this.syntheticGenerator = getSyntheticDataGenerator();
    this.anonymizer = getDataAnonymizer();
    this.promotionWorkflow = getPromotionWorkflow();

    this.initializeDefaultScenarios();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Start a data lab session
   */
  async startSession(sandboxId: string, userId: string): Promise<DataLabSession> {
    const profile = await this.configManager.getProfile(sandboxId);
    if (!profile) {
      throw this.createError(
        DataLabErrorCode.VALIDATION_FAILED,
        `Sandbox not found: ${sandboxId}`,
        sandboxId
      );
    }

    const session: DataLabSession = {
      id: uuidv4(),
      sandboxId,
      userId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      operationCount: 0,
    };

    this.sessions.set(session.id, session);

    logger.info('Started data lab session', {
      sessionId: session.id,
      sandboxId,
      userId,
    });

    return session;
  }

  /**
   * End a data lab session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      logger.info('Ended data lab session', {
        sessionId,
        sandboxId: session.sandboxId,
        operationCount: session.operationCount,
        durationMs: Date.now() - session.startedAt.getTime(),
      });
      this.sessions.delete(sessionId);
    }
  }

  // ============================================================================
  // Data Cloning
  // ============================================================================

  /**
   * Clone data into sandbox
   */
  async cloneData(request: DataCloneRequest): Promise<DataCloneResult> {
    const profile = await this.configManager.getProfile(request.sandboxId);
    if (!profile) {
      throw this.createError(
        DataLabErrorCode.VALIDATION_FAILED,
        `Sandbox not found: ${request.sandboxId}`,
        request.sandboxId
      );
    }

    return this.cloneService.clone(request, profile);
  }

  // ============================================================================
  // Synthetic Data Generation
  // ============================================================================

  /**
   * Generate synthetic data
   */
  async generateSyntheticData(
    request: SyntheticDataRequest
  ): Promise<SyntheticDataResult> {
    const profile = await this.configManager.getProfile(request.sandboxId);
    if (!profile) {
      throw this.createError(
        DataLabErrorCode.VALIDATION_FAILED,
        `Sandbox not found: ${request.sandboxId}`,
        request.sandboxId
      );
    }

    // Validate quota
    if (request.config.totalEntities > profile.dataAccessPolicy.maxRecords) {
      throw this.createError(
        DataLabErrorCode.QUOTA_EXCEEDED,
        `Entity count ${request.config.totalEntities} exceeds maximum ${profile.dataAccessPolicy.maxRecords}`,
        request.sandboxId
      );
    }

    return this.syntheticGenerator.generate(request);
  }

  // ============================================================================
  // Scenario Simulation
  // ============================================================================

  /**
   * List available scenario templates
   */
  async listScenarioTemplates(
    category?: ScenarioTemplate['category']
  ): Promise<ScenarioTemplate[]> {
    const templates = Array.from(this.scenarioTemplates.values());

    if (category) {
      return templates.filter(t => t.category === category);
    }

    return templates;
  }

  /**
   * Get scenario template by ID
   */
  async getScenarioTemplate(
    templateId: string
  ): Promise<ScenarioTemplate | null> {
    return this.scenarioTemplates.get(templateId) || null;
  }

  /**
   * Create custom scenario template
   */
  async createScenarioTemplate(
    template: Omit<ScenarioTemplate, 'id' | 'createdAt'>
  ): Promise<ScenarioTemplate> {
    const fullTemplate: ScenarioTemplate = {
      ...template,
      id: uuidv4(),
      createdAt: new Date(),
    } as ScenarioTemplate;

    this.scenarioTemplates.set(fullTemplate.id, fullTemplate);

    logger.info('Created scenario template', {
      templateId: fullTemplate.id,
      name: fullTemplate.name,
      category: fullTemplate.category,
    });

    return fullTemplate;
  }

  /**
   * Run scenario simulation
   */
  async runScenario(
    request: ScenarioSimulationRequest
  ): Promise<SyntheticDataResult> {
    const template = await this.getScenarioTemplate(request.templateId);
    if (!template) {
      throw this.createError(
        DataLabErrorCode.SCENARIO_NOT_FOUND,
        `Scenario template not found: ${request.templateId}`,
        request.sandboxId
      );
    }

    // Build synthetic data request from template
    const syntheticRequest: SyntheticDataRequest = {
      sandboxId: request.sandboxId,
      name: request.name,
      schemas: template.entityTemplates.map(et => ({
        entityType: et.entityType,
        fields: et.schema.fields,
        relationshipTypes: et.schema.relationshipTypes,
      })),
      config: {
        totalEntities: Math.floor(
          template.entityTemplates.reduce((sum, et) => sum + et.count, 0) *
            request.scale
        ),
        seed: request.seed,
        locale: 'en',
        generateRelationships: true,
        connectivityDensity: 0.3,
      },
      outputFormat: request.outputFormat,
      requestedBy: request.requestedBy,
    };

    return this.generateSyntheticData(syntheticRequest);
  }

  // ============================================================================
  // Sandbox Queries
  // ============================================================================

  /**
   * Execute query in sandbox
   */
  async executeQuery(request: SandboxQueryRequest): Promise<SandboxQueryResult> {
    const profile = await this.configManager.getProfile(request.sandboxId);
    if (!profile) {
      throw this.createError(
        DataLabErrorCode.VALIDATION_FAILED,
        `Sandbox not found: ${request.sandboxId}`,
        request.sandboxId
      );
    }

    const enforcer = getSandboxEnforcer();
    const decision = await enforcer.enforce(profile, {
      sandboxId: profile.id,
      userId: request.requestedBy,
      operation: OperationType.QUERY,
    });

    if (!decision.allowed) {
      throw this.createError(
        DataLabErrorCode.QUERY_FAILED,
        `Query not allowed: ${decision.reason}`,
        request.sandboxId
      );
    }

    const startTime = Date.now();

    try {
      // In a real implementation, this would execute against sandbox database
      // with proper tenant isolation and query timeout

      logger.info('Executing sandbox query', {
        sandboxId: request.sandboxId,
        queryType: request.queryType,
        timeout: request.timeout,
      });

      // Simulated query execution
      const result: SandboxQueryResult = {
        id: uuidv4(),
        sandboxId: request.sandboxId,
        status: 'success',
        data: [], // Would contain actual results
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        warnings: decision.warnings,
      };

      return result;
    } catch (error) {
      return {
        id: uuidv4(),
        sandboxId: request.sandboxId,
        status: 'error',
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Query execution failed',
      };
    }
  }

  // ============================================================================
  // Promotion Workflow
  // ============================================================================

  /**
   * Create promotion request
   */
  async createPromotionRequest(
    sandboxId: string,
    targetTenantId: string,
    requesterId: string,
    artifactInfo: {
      type: PromotionRequest['promotionType'];
      id: string;
      name: string;
      version?: string;
    },
    justification: string,
    rollbackPlan?: string
  ): Promise<PromotionRequest> {
    return this.promotionWorkflow.createRequest(
      sandboxId,
      targetTenantId,
      requesterId,
      artifactInfo,
      justification,
      rollbackPlan
    );
  }

  /**
   * Submit promotion for review
   */
  async submitPromotionForReview(
    requestId: string,
    reviewers: string[]
  ): Promise<PromotionRequest> {
    return this.promotionWorkflow.submitForReview(requestId, reviewers);
  }

  /**
   * Approve/reject promotion
   */
  async reviewPromotion(
    requestId: string,
    reviewerId: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comments?: string
  ): Promise<PromotionRequest> {
    return this.promotionWorkflow.addApproval(
      requestId,
      reviewerId,
      decision,
      comments
    );
  }

  /**
   * Execute promotion
   */
  async executePromotion(requestId: string): Promise<PromotionRequest> {
    return this.promotionWorkflow.executePromotion(requestId);
  }

  /**
   * Get promotion request
   */
  async getPromotionRequest(requestId: string): Promise<PromotionRequest | null> {
    return this.promotionWorkflow.getRequest(requestId);
  }

  /**
   * List promotion requests for sandbox
   */
  async listPromotionRequests(sandboxId: string): Promise<PromotionRequest[]> {
    return this.promotionWorkflow.listRequests(sandboxId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createError(
    code: DataLabErrorCode,
    message: string,
    sandboxId?: string,
    operation?: string
  ): DataLabError {
    return {
      code,
      message,
      sandboxId,
      operation,
      timestamp: new Date(),
    };
  }

  private initializeDefaultScenarios(): void {
    // Intelligence Analysis scenario
    this.scenarioTemplates.set('intel-analysis-001', {
      id: 'intel-analysis-001',
      name: 'Intelligence Network Analysis',
      description: 'Simulates an intelligence network with persons, organizations, and communications',
      category: 'intelligence_analysis',
      entityTemplates: [
        {
          entityType: 'Person',
          count: 500,
          schema: {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'person.fullName', config: {} },
              { name: 'alias', type: 'string', generator: 'person.firstName', config: {}, nullable: true, nullProbability: 0.7 },
              { name: 'nationality', type: 'string', generator: 'location.country', config: {} },
            ],
            relationshipTypes: [
              { type: 'KNOWS', targetEntityType: 'Person', direction: 'both', probability: 0.3, minCount: 0, maxCount: 10 },
              { type: 'WORKS_FOR', targetEntityType: 'Organization', direction: 'outgoing', probability: 0.6, minCount: 0, maxCount: 2 },
            ],
          },
          clusters: 5,
        },
        {
          entityType: 'Organization',
          count: 50,
          schema: {
            entityType: 'Organization',
            fields: [
              { name: 'name', type: 'string', generator: 'company.name', config: {} },
              { name: 'industry', type: 'string', generator: 'company.industry', config: {} },
              { name: 'country', type: 'string', generator: 'location.country', config: {} },
            ],
            relationshipTypes: [],
          },
          clusters: 3,
        },
      ],
      relationshipTemplates: [
        {
          type: 'KNOWS',
          sourceType: 'Person',
          targetType: 'Person',
          probability: 0.2,
          properties: [],
        },
      ],
      parameters: {
        networkDensity: {
          type: 'number',
          label: 'Network Connectivity',
          default: 0.3,
        },
      },
      createdBy: 'system',
      createdAt: new Date(),
      isPublic: true,
      tags: ['intelligence', 'network-analysis', 'starter'],
    });

    // Fraud Detection scenario
    this.scenarioTemplates.set('fraud-detection-001', {
      id: 'fraud-detection-001',
      name: 'Fraud Detection Network',
      description: 'Simulates financial transactions and account relationships for fraud detection training',
      category: 'fraud_detection',
      entityTemplates: [
        {
          entityType: 'Account',
          count: 1000,
          schema: {
            entityType: 'Account',
            fields: [
              { name: 'accountNumber', type: 'string', generator: 'finance.accountNumber', config: {} },
              { name: 'accountType', type: 'string', generator: 'string.alphanumeric', config: {} },
              { name: 'balance', type: 'number', generator: 'finance.amount', config: {} },
            ],
            relationshipTypes: [
              { type: 'TRANSFERRED_TO', targetEntityType: 'Account', direction: 'outgoing', probability: 0.4, minCount: 0, maxCount: 20 },
            ],
          },
          clusters: 10,
        },
        {
          entityType: 'Transaction',
          count: 5000,
          schema: {
            entityType: 'Transaction',
            fields: [
              { name: 'amount', type: 'number', generator: 'finance.amount', config: {} },
              { name: 'timestamp', type: 'date', generator: 'date.recent', config: {} },
              { name: 'currency', type: 'string', generator: 'finance.currency', config: {} },
            ],
            relationshipTypes: [],
          },
          clusters: 1,
        },
      ],
      relationshipTemplates: [],
      parameters: {
        fraudRate: {
          type: 'number',
          label: 'Fraud Percentage',
          default: 0.05,
        },
      },
      createdBy: 'system',
      createdAt: new Date(),
      isPublic: true,
      tags: ['fraud', 'finance', 'detection'],
    });

    logger.info('Initialized default scenario templates', {
      count: this.scenarioTemplates.size,
    });
  }
}

/**
 * Singleton instance
 */
let apiInstance: DataLabAPI | null = null;

export function getDataLabAPI(): DataLabAPI {
  if (!apiInstance) {
    apiInstance = new DataLabAPI();
  }
  return apiInstance;
}
