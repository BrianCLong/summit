import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { RegulationFeedMonitor } from '../agents/RegulationFeedMonitor.js';
import { RegulationAnalysisAgent } from '../agents/RegulationAnalysisAgent.js';
import { ComplianceImpactAssessor } from '../agents/ComplianceImpactAssessor.js';
import { WorkflowAdaptationAgent } from '../agents/WorkflowAdaptationAgent.js';
import type {
  RegulationSource,
  Regulation,
  ImpactAssessment,
  WorkflowAdaptation,
  AgentEvent,
  REGULATORY_SOURCES,
} from '../types/index.js';
import { createAgentLogger } from '../utils/logger.js';

const logger = createAgentLogger('ComplianceOrchestrator');

export interface ComplianceOrchestratorConfig {
  autoApplyLowRiskAdaptations: boolean;
  riskThresholdForAutoApply: number;
  enableCrossBorderMonitoring: boolean;
  jurisdictions: string[];
}

export interface ComplianceReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    regulationsDetected: number;
    impactAssessments: number;
    adaptationsCreated: number;
    adaptationsApplied: number;
    averageRiskScore: number;
  };
  regulations: Array<{
    regulation: Regulation;
    assessment: ImpactAssessment | null;
    adaptations: WorkflowAdaptation[];
  }>;
}

/**
 * ComplianceOrchestrator - Coordinates all compliance monitoring agents
 * to provide end-to-end autonomous regulatory compliance management.
 */
export class ComplianceOrchestrator extends EventEmitter {
  private feedMonitor: RegulationFeedMonitor;
  private analysisAgent: RegulationAnalysisAgent;
  private impactAssessor: ComplianceImpactAssessor;
  private adaptationAgent: WorkflowAdaptationAgent;
  private pg: Pool;
  private config: ComplianceOrchestratorConfig;

  // Track processing state
  private regulationStore: Map<string, Regulation> = new Map();
  private assessmentStore: Map<string, ImpactAssessment> = new Map();
  private adaptationStore: Map<string, WorkflowAdaptation[]> = new Map();
  private eventLog: AgentEvent[] = [];

  constructor(pgPool?: Pool, config?: Partial<ComplianceOrchestratorConfig>) {
    super();

    this.pg = pgPool || new Pool({ connectionString: process.env.DATABASE_URL });
    this.config = {
      autoApplyLowRiskAdaptations: true,
      riskThresholdForAutoApply: 30,
      enableCrossBorderMonitoring: true,
      jurisdictions: ['US', 'EU', 'UK'],
      ...config,
    };

    // Initialize agents
    this.feedMonitor = new RegulationFeedMonitor();
    this.analysisAgent = new RegulationAnalysisAgent();
    this.impactAssessor = new ComplianceImpactAssessor(this.pg);
    this.adaptationAgent = new WorkflowAdaptationAgent(this.pg);

    this.wireAgentEvents();
  }

  /**
   * Wire up agent event handlers for autonomous processing
   */
  private wireAgentEvents(): void {
    // Feed Monitor -> Analysis Agent
    this.feedMonitor.on('regulation_detected', async (event: AgentEvent) => {
      this.eventLog.push(event);
      const regulation = event.payload as Regulation;
      this.regulationStore.set(regulation.id, regulation);

      logger.info({ regulationId: regulation.id }, 'Processing detected regulation');
      await this.analysisAgent.queueForAnalysis(regulation);
    });

    // Analysis Agent -> Impact Assessor
    this.analysisAgent.on('analysis_complete', async (event: AgentEvent) => {
      this.eventLog.push(event);
      const { regulation, analysis } = event.payload as {
        regulation: Regulation;
        analysis: unknown;
      };

      logger.info({ regulationId: regulation.id }, 'Running impact assessment');
      await this.impactAssessor.assessImpact(regulation, analysis as Parameters<ComplianceImpactAssessor['assessImpact']>[1]);
    });

    // Impact Assessor -> Adaptation Agent
    this.impactAssessor.on('impact_assessed', async (event: AgentEvent) => {
      this.eventLog.push(event);
      const { regulation, assessment } = event.payload as {
        regulation: Regulation;
        assessment: ImpactAssessment;
      };

      this.assessmentStore.set(regulation.id, assessment);

      logger.info({ regulationId: regulation.id, riskScore: assessment.riskScore }, 'Generating adaptations');
      const adaptations = await this.adaptationAgent.generateAdaptations(regulation, assessment);
      this.adaptationStore.set(regulation.id, adaptations);

      // Always apply adaptations that are already approved (e.g., notifications)
      for (const adaptation of adaptations) {
        if (!adaptation.requiresApproval && adaptation.status === 'approved') {
          await this.adaptationAgent.applyAdaptation(adaptation.id);
        }
      }

      // Auto-apply low-risk adaptations if configured
      if (this.config.autoApplyLowRiskAdaptations && assessment.riskScore < this.config.riskThresholdForAutoApply) {
        for (const adaptation of adaptations) {
          if (adaptation.requiresApproval && adaptation.status === 'approved') {
            await this.adaptationAgent.applyAdaptation(adaptation.id);
          }
        }
      }

      // Emit orchestrator event
      this.emit('compliance_cycle_complete', {
        regulationId: regulation.id,
        assessment,
        adaptations,
      });
    });

    // Track adaptation events
    this.adaptationAgent.on('adaptation_created', (event: AgentEvent) => {
      this.eventLog.push(event);
    });
  }

  /**
   * Initialize and start the compliance monitoring system
   */
  async start(sources?: Omit<RegulationSource, 'id' | 'lastChecked'>[]): Promise<void> {
    logger.info('Starting Compliance Orchestrator');

    // Load system inventory
    await this.impactAssessor.loadSystemInventory();

    // Register regulatory sources
    const regulatorySources = sources || (await import('../types/index.js')).REGULATORY_SOURCES;

    for (const source of regulatorySources) {
      // Filter by configured jurisdictions
      if (this.config.jurisdictions.includes(source.jurisdiction) ||
          (this.config.enableCrossBorderMonitoring && source.jurisdiction === 'INTL')) {
        this.feedMonitor.registerSource({
          ...source,
          id: uuid(),
        });
      }
    }

    // Start monitoring
    this.feedMonitor.startMonitoring();
    logger.info({ sourceCount: this.feedMonitor.getStats().sourcesActive }, 'Compliance monitoring started');
  }

  /**
   * Stop compliance monitoring
   */
  stop(): void {
    this.feedMonitor.stopMonitoring();
    logger.info('Compliance monitoring stopped');
  }

  /**
   * Manually trigger analysis of a regulation URL
   */
  async analyzeRegulationUrl(url: string, jurisdiction: string): Promise<{
    regulation: Regulation;
    assessment: ImpactAssessment;
    adaptations: WorkflowAdaptation[];
  }> {
    const regulation: Regulation = {
      id: uuid(),
      sourceId: 'manual',
      externalId: url,
      title: `Manual regulation from ${url}`,
      jurisdiction: jurisdiction as Regulation['jurisdiction'],
      regulatoryBody: 'Manual Entry',
      categories: [],
      publishedDate: new Date(),
      status: 'proposed',
      url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.regulationStore.set(regulation.id, regulation);

    // Process through the pipeline
    await this.analysisAgent.queueForAnalysis(regulation);

    // Wait for processing (simplified - in production use proper async coordination)
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      regulation,
      assessment: this.assessmentStore.get(regulation.id)!,
      adaptations: this.adaptationStore.get(regulation.id) || [],
    };
  }

  /**
   * Generate compliance report
   */
  generateReport(startDate?: Date, endDate?: Date): ComplianceReport {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const regulations = Array.from(this.regulationStore.values())
      .filter(r => r.createdAt >= start && r.createdAt <= end);

    const assessments = Array.from(this.assessmentStore.values());
    const allAdaptations = Array.from(this.adaptationStore.values()).flat();

    const appliedAdaptations = allAdaptations.filter(a => a.status === 'applied');
    const avgRiskScore = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length
      : 0;

    return {
      id: uuid(),
      generatedAt: new Date(),
      period: { start, end },
      summary: {
        regulationsDetected: regulations.length,
        impactAssessments: assessments.length,
        adaptationsCreated: allAdaptations.length,
        adaptationsApplied: appliedAdaptations.length,
        averageRiskScore: Math.round(avgRiskScore),
      },
      regulations: regulations.map(regulation => ({
        regulation,
        assessment: this.assessmentStore.get(regulation.id) || null,
        adaptations: this.adaptationStore.get(regulation.id) || [],
      })),
    };
  }

  /**
   * Approve a pending adaptation
   */
  approveAdaptation(adaptationId: string, approvedBy: string): boolean {
    return this.adaptationAgent.approveAdaptation(adaptationId, approvedBy);
  }

  /**
   * Apply an approved adaptation
   */
  async applyAdaptation(adaptationId: string): Promise<boolean> {
    return this.adaptationAgent.applyAdaptation(adaptationId);
  }

  /**
   * Get all pending adaptations
   */
  getPendingAdaptations(): WorkflowAdaptation[] {
    return this.adaptationAgent.getPendingAdaptations();
  }

  /**
   * Get system statistics
   */
  getStats(): {
    feedMonitor: ReturnType<RegulationFeedMonitor['getStats']>;
    analysisAgent: ReturnType<RegulationAnalysisAgent['getStats']>;
    regulationsTracked: number;
    assessmentsCompleted: number;
    adaptationsGenerated: number;
    eventsLogged: number;
  } {
    return {
      feedMonitor: this.feedMonitor.getStats(),
      analysisAgent: this.analysisAgent.getStats(),
      regulationsTracked: this.regulationStore.size,
      assessmentsCompleted: this.assessmentStore.size,
      adaptationsGenerated: Array.from(this.adaptationStore.values()).flat().length,
      eventsLogged: this.eventLog.length,
    };
  }

  /**
   * Get event log
   */
  getEventLog(limit = 100): AgentEvent[] {
    return this.eventLog.slice(-limit);
  }
}
