/**
 * TwinCognitionOrchestrator - Central Integration Hub
 *
 * Integrates all cognition components into a unified system:
 * - CognitionEngine for reasoning
 * - MultiModalPerceptionEngine for sensing
 * - ContinualLearningSystem for adaptation
 * - SpecializedAgents for domain expertise
 * - GovernanceEngine for policy enforcement
 * - ExplainabilityEngine for transparency
 *
 * Provides a clean API for digital twin cognition operations.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import { CognitionEngine, type CognitionEngineConfig } from './CognitionEngine.js';
import {
  MultiModalPerceptionEngine,
  type PerceptionConfig,
  type PerceptionOutput,
} from '../perception/MultiModalPerceptionEngine.js';
import {
  ContinualLearningSystem,
  type LearningConfig,
  type LearningState,
} from '../learning/ContinualLearningSystem.js';
import {
  DiagnosticsAgent,
  OptimizationAgent,
  ComplianceAgent,
  OperationsAgent,
  AgentOrchestrator,
  type AgentResult,
} from '../agents/SpecializedAgents.js';
import {
  GovernanceEngine,
  type GovernanceConfig,
  type PolicyEvaluationResult,
} from '../governance/GovernanceEngine.js';
import {
  ExplainabilityEngine,
  type ExplanationConfig,
  type Explanation,
} from '../explainability/ExplainabilityEngine.js';

import type {
  CognitionSession,
  CognitionContext,
  Decision,
  Outcome,
  SensorReading,
  TextInput,
  ImageInput,
  DocumentInput,
  Alert,
} from '../types/index.js';

const logger = pino({ name: 'TwinCognitionOrchestrator' });

export interface OrchestratorConfig {
  cognition: Partial<CognitionEngineConfig>;
  perception: Partial<PerceptionConfig>;
  learning: Partial<LearningConfig>;
  governance: Partial<GovernanceConfig>;
  explainability: Partial<ExplanationConfig>;
  autoExecuteAgents: boolean;
  autoGenerateExplanations: boolean;
  enableRealTimeProcessing: boolean;
}

export interface CognitionCycleResult {
  sessionId: string;
  perception: PerceptionOutput;
  decisions: Decision[];
  agentResults: Map<string, AgentResult>;
  policyEvaluations: Map<string, PolicyEvaluationResult>;
  explanations: Map<string, Explanation>;
  executionTime: number;
  confidence: number;
}

export interface TwinCognitionStatus {
  activeSessions: number;
  totalDecisions: number;
  learningState: LearningState;
  agentStatus: Array<{ id: string; name: string; enabled: boolean }>;
  recentAlerts: number;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export class TwinCognitionOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;

  // Core components
  private cognitionEngine: CognitionEngine;
  private perceptionEngine: MultiModalPerceptionEngine;
  private learningSystem: ContinualLearningSystem;
  private agentOrchestrator: AgentOrchestrator;
  private governanceEngine: GovernanceEngine;
  private explainabilityEngine: ExplainabilityEngine;

  // State tracking
  private activeSessions: Map<string, CognitionSession> = new Map();
  private decisionHistory: Decision[] = [];
  private isProcessing: boolean = false;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();

    this.config = {
      cognition: config.cognition ?? {},
      perception: config.perception ?? {},
      learning: config.learning ?? {},
      governance: config.governance ?? {},
      explainability: config.explainability ?? {},
      autoExecuteAgents: config.autoExecuteAgents ?? true,
      autoGenerateExplanations: config.autoGenerateExplanations ?? true,
      enableRealTimeProcessing: config.enableRealTimeProcessing ?? true,
    };

    // Initialize components
    this.cognitionEngine = new CognitionEngine(this.config.cognition);
    this.perceptionEngine = new MultiModalPerceptionEngine(this.config.perception);
    this.learningSystem = new ContinualLearningSystem(this.config.learning);
    this.agentOrchestrator = new AgentOrchestrator();
    this.governanceEngine = new GovernanceEngine(this.config.governance);
    this.explainabilityEngine = new ExplainabilityEngine(this.config.explainability);

    // Register default agents
    this.registerDefaultAgents();

    // Wire up event handlers
    this.setupEventHandlers();

    logger.info('TwinCognitionOrchestrator initialized');
  }

  private registerDefaultAgents(): void {
    this.agentOrchestrator.registerAgent(
      new DiagnosticsAgent({ priority: 10 }),
    );
    this.agentOrchestrator.registerAgent(
      new OptimizationAgent({ priority: 8 }),
    );
    this.agentOrchestrator.registerAgent(
      new ComplianceAgent({ priority: 9 }),
    );
    this.agentOrchestrator.registerAgent(
      new OperationsAgent({ priority: 7 }),
    );
  }

  private setupEventHandlers(): void {
    // Learning from outcomes
    this.cognitionEngine.on('outcome:recorded', async (data) => {
      const { sessionId, decision, outcome } = data;
      const session = this.activeSessions.get(sessionId);
      if (session) {
        await this.learningSystem.recordExperience(session, decision, outcome);
      }
    });

    // Decision events
    this.cognitionEngine.on('decision:created', (data) => {
      const { decision } = data;
      this.decisionHistory.push(decision);

      // Keep history bounded
      if (this.decisionHistory.length > 1000) {
        this.decisionHistory.shift();
      }
    });

    // Drift detection
    this.learningSystem.on('drift:detected', (drift) => {
      logger.warn({ drift }, 'Concept drift detected');
      this.emit('system:drift-detected', drift);
    });

    // Policy violations
    this.governanceEngine.on('decision:evaluated', (data) => {
      if (!data.result.allowed) {
        logger.warn(
          { decisionId: data.decision.id, violations: data.result.violations },
          'Decision denied by policy',
        );
        this.emit('policy:violation', data);
      }
    });
  }

  /**
   * Start a new cognition session for a digital twin
   */
  async startSession(
    twinId: string,
    tenantId: string,
    initialContext?: Partial<CognitionContext>,
  ): Promise<CognitionSession> {
    const session = await this.cognitionEngine.startSession(
      twinId,
      tenantId,
      initialContext ?? {},
    );

    this.activeSessions.set(session.id, session);
    this.emit('session:started', { sessionId: session.id, twinId });

    logger.info({ sessionId: session.id, twinId }, 'Cognition session started');
    return session;
  }

  /**
   * Ingest data into the perception engine
   */
  async ingestData(data: {
    sensors?: SensorReading[];
    texts?: TextInput[];
    images?: ImageInput[];
    documents?: DocumentInput[];
  }): Promise<void> {
    if (data.sensors) {
      await this.perceptionEngine.ingestSensorData(data.sensors);
    }

    for (const text of data.texts ?? []) {
      await this.perceptionEngine.ingestTextInput(text);
    }

    for (const image of data.images ?? []) {
      await this.perceptionEngine.ingestImageInput(image);
    }

    for (const doc of data.documents ?? []) {
      await this.perceptionEngine.ingestDocumentInput(doc);
    }
  }

  /**
   * Run a complete cognition cycle
   */
  async runCognitionCycle(sessionId: string): Promise<CognitionCycleResult> {
    const startTime = Date.now();
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (this.isProcessing) {
      throw new Error('Another cognition cycle is in progress');
    }

    this.isProcessing = true;
    this.emit('cycle:started', { sessionId });

    try {
      // Phase 1: Multi-modal perception
      const perception = await this.perceptionEngine.perceive();

      // Update session context with perception results
      await this.cognitionEngine.updateContext(sessionId, {
        sensorData: perception.sensorFeatures.byType.size > 0
          ? Array.from(session.context.sensorData).slice(-500)
          : session.context.sensorData,
        recognizedPatterns: [
          ...session.context.recognizedPatterns,
          ...perception.extractedPatterns,
        ],
        activeAlerts: [
          ...session.context.activeAlerts,
          ...perception.alerts.map((a) => ({ ...a, twinId: session.twinId })),
        ],
      });

      // Phase 2: Run cognition engine
      const decisions = await this.cognitionEngine.runCognitionCycle(sessionId);

      // Phase 3: Run specialized agents
      let agentResults = new Map<string, AgentResult>();
      if (this.config.autoExecuteAgents) {
        const updatedSession = this.cognitionEngine.getSession(sessionId)!;
        agentResults = await this.agentOrchestrator.executeAll(
          updatedSession.context,
        );
      }

      // Phase 4: Evaluate decisions against policies
      const policyEvaluations = new Map<string, PolicyEvaluationResult>();
      for (const decision of decisions) {
        const evaluation = await this.governanceEngine.evaluateDecision(
          decision,
          {
            tenantId: session.tenantId,
            twinId: session.twinId,
          },
        );
        policyEvaluations.set(decision.id, evaluation);
      }

      // Phase 5: Generate explanations
      const explanations = new Map<string, Explanation>();
      if (this.config.autoGenerateExplanations) {
        const updatedSession = this.cognitionEngine.getSession(sessionId)!;
        for (const decision of decisions) {
          const explanation = await this.explainabilityEngine.explain(
            decision,
            updatedSession,
          );
          explanations.set(decision.id, explanation);
        }
      }

      // Phase 6: Check for drift
      await this.learningSystem.detectDrift();

      const executionTime = Date.now() - startTime;
      const avgConfidence = decisions.length > 0
        ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
        : 0;

      const result: CognitionCycleResult = {
        sessionId,
        perception,
        decisions,
        agentResults,
        policyEvaluations,
        explanations,
        executionTime,
        confidence: avgConfidence,
      };

      logger.info(
        {
          sessionId,
          decisions: decisions.length,
          executionTime,
          confidence: avgConfidence,
        },
        'Cognition cycle completed',
      );

      this.emit('cycle:completed', result);
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Record outcome of a decision for learning
   */
  async recordOutcome(
    sessionId: string,
    decisionId: string,
    outcome: Omit<Outcome, 'id' | 'decisionId'>,
  ): Promise<Outcome> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const result = await this.cognitionEngine.recordOutcome(
      sessionId,
      decisionId,
      outcome,
    );

    // Learn from outcome
    const decision = session.decisions.find((d) => d.id === decisionId);
    if (decision) {
      await this.learningSystem.recordExperience(session, decision, result);
    }

    return result;
  }

  /**
   * Ask the operations agent a question
   */
  async askQuestion(
    sessionId: string,
    question: string,
  ): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
    relatedTopics: string[];
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const operationsAgent = this.agentOrchestrator.getAgent<OperationsAgent>(
      Array.from(this.agentOrchestrator.listAgents())
        .find((a) => a.type === 'OperationsAgent')?.id ?? '',
    );

    if (!operationsAgent) {
      throw new Error('Operations agent not available');
    }

    return operationsAgent.answerQuestion(
      { question },
      session.context,
    );
  }

  /**
   * Get explanation for a decision
   */
  async explainDecision(
    sessionId: string,
    decisionId: string,
  ): Promise<Explanation> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const decision = session.decisions.find((d) => d.id === decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    return this.explainabilityEngine.explain(decision, session);
  }

  /**
   * End a cognition session
   */
  async endSession(sessionId: string): Promise<CognitionSession> {
    const session = await this.cognitionEngine.endSession(sessionId);
    this.activeSessions.delete(sessionId);

    this.emit('session:ended', { sessionId });
    return session;
  }

  /**
   * Get system status
   */
  getStatus(): TwinCognitionStatus {
    const learningState = this.learningSystem.getLearningState();
    const agentStatus = this.agentOrchestrator.listAgents();
    const bufferStats = this.perceptionEngine.getBufferStats();

    // Determine system health
    let systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (learningState.driftEvents > 5) {
      systemHealth = 'DEGRADED';
    }
    if (learningState.performance.accuracy < 0.5) {
      systemHealth = 'CRITICAL';
    }

    return {
      activeSessions: this.activeSessions.size,
      totalDecisions: this.decisionHistory.length,
      learningState,
      agentStatus,
      recentAlerts: bufferStats.texts,
      systemHealth,
    };
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CognitionSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * List active sessions
   */
  listSessions(): Array<{
    id: string;
    twinId: string;
    state: string;
    startedAt: Date;
  }> {
    return Array.from(this.activeSessions.values()).map((s) => ({
      id: s.id,
      twinId: s.twinId,
      state: s.state,
      startedAt: s.startedAt,
    }));
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit: number = 10): Decision[] {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Export knowledge for persistence
   */
  exportKnowledge(): ReturnType<ContinualLearningSystem['exportKnowledge']> {
    return this.learningSystem.exportKnowledge();
  }

  /**
   * Import previously learned knowledge
   */
  importKnowledge(
    data: ReturnType<ContinualLearningSystem['exportKnowledge']>,
  ): void {
    this.learningSystem.importKnowledge(data);
  }

  /**
   * Register a custom policy
   */
  registerPolicy(
    policy: Parameters<GovernanceEngine['registerPolicy']>[0],
  ): void {
    this.governanceEngine.registerPolicy(policy);
  }

  /**
   * Get component references for advanced usage
   */
  getComponents(): {
    cognition: CognitionEngine;
    perception: MultiModalPerceptionEngine;
    learning: ContinualLearningSystem;
    agents: AgentOrchestrator;
    governance: GovernanceEngine;
    explainability: ExplainabilityEngine;
  } {
    return {
      cognition: this.cognitionEngine,
      perception: this.perceptionEngine,
      learning: this.learningSystem,
      agents: this.agentOrchestrator,
      governance: this.governanceEngine,
      explainability: this.explainabilityEngine,
    };
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.endSession(sessionId);
    }

    // Clear buffers
    this.perceptionEngine.clearBuffers();
    this.explainabilityEngine.clearCache();

    logger.info('TwinCognitionOrchestrator shutdown complete');
    this.emit('shutdown');
  }
}

export default TwinCognitionOrchestrator;
