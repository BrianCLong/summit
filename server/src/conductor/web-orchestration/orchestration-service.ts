import logger from '../../config/logger.js';
import { PremiumModelRouter } from '../premium-routing/premium-model-router.js';

export interface OrchestrationRequest {
  query: string;
  context: {
    userId: string;
    tenantId: string;
    purpose: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    budgetLimit?: number;
    qualityThreshold?: number;
    expectedOutputLength?: number;
  };
  constraints?: Record<string, unknown>;
}

export interface OrchestrationResult {
  orchestrationId: string;
  answer: string;
  confidence: number;
  citations: Array<{ url: string; title: string; snippet: string; domain: string }>;
  metadata: {
    sourcesUsed: number;
    synthesisMethod: string;
    totalCost: number;
    processingTime: number;
    complianceScore: number;
    contradictionsFound: number;
    provenanceHash: string;
  };
  warnings?: string[];
  fallbacksUsed?: string[];
}

export class OrchestrationService {
  private premiumRouter: PremiumModelRouter;

  constructor() {
    this.premiumRouter = new PremiumModelRouter();
  }

  async initialize(): Promise<void> {
    await this.premiumRouter.connect();
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const orchestrationId = `maestro-${Date.now()}`;
    const startedAt = Date.now();

    try {
      const routingDecision = await this.premiumRouter.routeToOptimalModel({
        query: request.query,
        context: {
          userId: request.context.userId,
          tenantId: request.context.tenantId,
          taskType: 'orchestration',
          complexity: 0.3,
          budget: request.context.budgetLimit ?? 10,
          urgency: request.context.urgency ?? 'medium',
          qualityRequirement: request.context.qualityThreshold ?? 0.6,
          expectedOutputLength: request.context.expectedOutputLength ?? 512,
        },
        constraints: {},
      });

      return {
        orchestrationId,
        answer: request.query,
        confidence: routingDecision.confidence,
        citations: [],
        metadata: {
          sourcesUsed: 0,
          synthesisMethod: routingDecision.routingStrategy,
          totalCost: routingDecision.expectedCost,
          processingTime: Date.now() - startedAt,
          complianceScore: 1,
          contradictionsFound: 0,
          provenanceHash: `${orchestrationId}-${routingDecision.selectedModel.id}`,
        },
      };
    } catch (error) {
      logger.warn('Orchestration fallback due to error', { error: (error as Error).message });
      return {
        orchestrationId,
        answer: request.query,
        confidence: 0.4,
        citations: [],
        metadata: {
          sourcesUsed: 0,
          synthesisMethod: 'basic',
          totalCost: 0,
          processingTime: Date.now() - startedAt,
          complianceScore: 1,
          contradictionsFound: 0,
          provenanceHash: orchestrationId,
        },
        warnings: ['Returned basic orchestration result'],
        fallbacksUsed: ['premium-routing-unavailable'],
      };
    }
  }
}
