
import { tenantCostService } from './TenantCostService';
import { CostOptimizationService } from './CostOptimizationService';
import logger from '../utils/logger';

interface ResourceCostAnalysis {
  tenantId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  totalCost: number;
  currency: string;
  serviceBreakdown: {
    serviceName: string;
    cost: number;
    percentage: number;
    usage: {
      computeUnits: number;
      storageGB: number;
      networkGB: number;
      apiCalls: number;
    };
  }[];
  optimizations: {
    serviceName: string;
    suggestion: string;
    potentialSavings: number;
    priority: 'low' | 'medium' | 'high';
  }[];
}

export class ResourceCostAnalyzerService {
  private costOptimizationService: CostOptimizationService;

  constructor() {
    this.costOptimizationService = new CostOptimizationService();
  }

  /**
   * Generates a comprehensive cost analysis for a tenant, including breakdown by service
   * and optimization suggestions.
   */
  public async getServiceCostAnalysis(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ResourceCostAnalysis> {
    try {
      // 1. Get Service Breakdown from TenantCostService
      const breakdown = await tenantCostService.getServiceCostBreakdown(tenantId, period);

      const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);

      // 2. Get Optimization Suggestions
      const optimizationOpportunities = await this.costOptimizationService.identifyOptimizationOpportunities(tenantId);

      // 3. Map Optimizations to Services
      const mappedOptimizations = optimizationOpportunities.map(opt => {
        let serviceName = opt.serviceName || 'General';

        // Fallback inference if serviceName not set (backward compatibility)
        if (serviceName === 'General') {
          if (opt.id.includes('docling')) serviceName = 'DoclingService';
          else if (opt.id.includes('db-pool')) serviceName = 'DatabaseService';
          else if (opt.id.includes('ai-batch')) serviceName = 'LLMService';
          else if (opt.type.includes('storage')) serviceName = 'StorageService';
          else if (opt.type.includes('query')) serviceName = 'DatabaseService';
        }

        return {
          serviceName,
          suggestion: opt.description,
          potentialSavings: opt.potentialSavingsUSD,
          priority: opt.potentialSavingsUSD > 50 ? 'high' as const : (opt.potentialSavingsUSD > 10 ? 'medium' as const : 'low' as const)
        };
      });

      return {
        tenantId,
        period,
        totalCost,
        currency: 'USD',
        serviceBreakdown: breakdown,
        optimizations: mappedOptimizations
      };

    } catch (error) {
      logger.error('Failed to generate resource cost analysis', { tenantId, error: (error as Error).message });
      throw error;
    }
  }
}

export const resourceCostAnalyzerService = new ResourceCostAnalyzerService();
