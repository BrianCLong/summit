/**
 * Deal Service
 * Manages sales pipeline, deals, and forecasting
 */

import { EventEmitter } from 'events';
import type {
  Deal,
  DealStatus,
  DealPriority,
  LostReason,
  Pipeline,
  PipelineStage,
  DealProduct,
  FilterGroup,
  CustomFieldValue,
  Forecast,
  ForecastCategory,
  AuditLog,
  FieldChange,
} from '../models/types';

export interface DealCreateInput {
  name: string;
  value: number;
  currency?: string;
  pipelineId: string;
  stageId: string;
  expectedCloseDate?: Date;
  companyId?: string;
  contactIds?: string[];
  ownerId: string;
  source?: Deal['source'];
  tags?: string[];
  customFields?: Record<string, CustomFieldValue>;
  products?: DealProduct[];
  priority?: DealPriority;
}

export interface DealUpdateInput {
  name?: string;
  value?: number;
  expectedCloseDate?: Date;
  companyId?: string;
  contactIds?: string[];
  ownerId?: string;
  tags?: string[];
  customFields?: Record<string, CustomFieldValue>;
  products?: DealProduct[];
  priority?: DealPriority;
  nextStep?: string;
  nextStepDate?: Date;
}

export interface DealSearchParams {
  query?: string;
  filters?: FilterGroup;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  companyId?: string;
  status?: DealStatus[];
  priority?: DealPriority[];
  tags?: string[];
  minValue?: number;
  maxValue?: number;
  closeDateFrom?: Date;
  closeDateTo?: Date;
  isRotting?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DealSearchResult {
  deals: Deal[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PipelineStats {
  pipelineId: string;
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  avgDealSize: number;
  avgDaysInPipeline: number;
  stageStats: StageStats[];
}

export interface StageStats {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
  avgDaysInStage: number;
  conversionRate: number;
}

export interface WinLossAnalysis {
  period: string;
  won: { count: number; value: number };
  lost: { count: number; value: number };
  winRate: number;
  avgDealSize: number;
  avgSalesCycle: number;
  topLostReasons: { reason: LostReason; count: number }[];
}

export class DealService extends EventEmitter {
  private deals: Map<string, Deal> = new Map();
  private pipelines: Map<string, Pipeline> = new Map();
  private auditLogs: AuditLog[] = [];

  constructor() {
    super();
    this.initializeDefaultPipeline();
  }

  private initializeDefaultPipeline(): void {
    const defaultPipeline: Pipeline = {
      id: 'pipeline_default',
      name: 'Sales Pipeline',
      description: 'Default sales pipeline',
      stages: [
        { id: 'stage_lead', name: 'Lead', order: 1, probability: 10, rottingDays: 14, color: '#6B7280' },
        { id: 'stage_qualified', name: 'Qualified', order: 2, probability: 25, rottingDays: 14, color: '#3B82F6' },
        { id: 'stage_proposal', name: 'Proposal', order: 3, probability: 50, rottingDays: 7, color: '#8B5CF6' },
        { id: 'stage_negotiation', name: 'Negotiation', order: 4, probability: 75, rottingDays: 7, color: '#F59E0B' },
        { id: 'stage_won', name: 'Won', order: 5, probability: 100, rottingDays: 0, color: '#10B981', isWon: true },
        { id: 'stage_lost', name: 'Lost', order: 6, probability: 0, rottingDays: 0, color: '#EF4444', isLost: true },
      ],
      isDefault: true,
      dealRotting: { enabled: true, thresholdDays: 14, notifyOwner: true },
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.pipelines.set(defaultPipeline.id, defaultPipeline);
  }

  /**
   * Create a new deal
   */
  async create(input: DealCreateInput, userId: string): Promise<Deal> {
    const pipeline = this.pipelines.get(input.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${input.pipelineId} not found`);
    }

    const stage = pipeline.stages.find((s) => s.id === input.stageId);
    if (!stage) {
      throw new Error(`Stage ${input.stageId} not found in pipeline`);
    }

    const id = this.generateId();
    const now = new Date();

    const deal: Deal = {
      id,
      name: input.name,
      value: input.value,
      currency: input.currency || pipeline.currency,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      probability: stage.probability,
      expectedCloseDate: input.expectedCloseDate,
      companyId: input.companyId,
      contactIds: input.contactIds || [],
      ownerId: input.ownerId,
      coOwnerIds: [],
      source: input.source || 'other',
      tags: input.tags || [],
      customFields: input.customFields || {},
      products: input.products || [],
      weightedValue: input.value * (stage.probability / 100),
      stageEnteredAt: now,
      isRotting: false,
      rottingDays: 0,
      status: 'open',
      priority: input.priority || 'medium',
      createdAt: now,
      updatedAt: now,
    };

    this.deals.set(id, deal);
    this.logAudit(deal, 'create', [], userId);
    this.emit('deal:created', deal);

    return deal;
  }

  /**
   * Get deal by ID
   */
  async getById(id: string): Promise<Deal | null> {
    return this.deals.get(id) || null;
  }

  /**
   * Update deal
   */
  async update(id: string, input: DealUpdateInput, userId: string): Promise<Deal> {
    const deal = await this.getById(id);
    if (!deal) {
      throw new Error(`Deal ${id} not found`);
    }

    const changes: FieldChange[] = [];
    const updatedDeal = { ...deal, updatedAt: new Date() };

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && (deal as Record<string, unknown>)[key] !== value) {
        changes.push({
          field: key,
          oldValue: (deal as Record<string, unknown>)[key],
          newValue: value,
        });
        (updatedDeal as Record<string, unknown>)[key] = value;
      }
    }

    // Recalculate weighted value if value changed
    if (input.value !== undefined) {
      updatedDeal.weightedValue = input.value * (updatedDeal.probability / 100);
    }

    this.deals.set(id, updatedDeal);

    if (changes.length > 0) {
      this.logAudit(updatedDeal, 'update', changes, userId);
      this.emit('deal:updated', updatedDeal, changes);
    }

    return updatedDeal;
  }

  /**
   * Move deal to different stage
   */
  async moveStage(id: string, newStageId: string, userId: string): Promise<Deal> {
    const deal = await this.getById(id);
    if (!deal) {
      throw new Error(`Deal ${id} not found`);
    }

    const pipeline = this.pipelines.get(deal.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${deal.pipelineId} not found`);
    }

    const newStage = pipeline.stages.find((s) => s.id === newStageId);
    if (!newStage) {
      throw new Error(`Stage ${newStageId} not found`);
    }

    const oldStageId = deal.stageId;
    const oldStage = pipeline.stages.find((s) => s.id === oldStageId);

    deal.stageId = newStageId;
    deal.probability = newStage.probability;
    deal.weightedValue = deal.value * (newStage.probability / 100);
    deal.stageEnteredAt = new Date();
    deal.isRotting = false;
    deal.rottingDays = 0;
    deal.updatedAt = new Date();

    // Update status if moving to won/lost
    if (newStage.isWon) {
      deal.status = 'won';
      deal.closedAt = new Date();
      deal.actualCloseDate = new Date();
    } else if (newStage.isLost) {
      deal.status = 'lost';
      deal.closedAt = new Date();
    } else {
      deal.status = 'open';
    }

    this.deals.set(id, deal);

    this.logAudit(deal, 'update', [
      { field: 'stageId', oldValue: oldStageId, newValue: newStageId },
    ], userId);

    this.emit('deal:stageChanged', deal, oldStage, newStage);

    if (deal.status === 'won') {
      this.emit('deal:won', deal);
    } else if (deal.status === 'lost') {
      this.emit('deal:lost', deal);
    }

    return deal;
  }

  /**
   * Mark deal as won
   */
  async markWon(id: string, userId: string): Promise<Deal> {
    const deal = await this.getById(id);
    if (!deal) {
      throw new Error(`Deal ${id} not found`);
    }

    const pipeline = this.pipelines.get(deal.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found`);
    }

    const wonStage = pipeline.stages.find((s) => s.isWon);
    if (!wonStage) {
      throw new Error('No won stage defined in pipeline');
    }

    return this.moveStage(id, wonStage.id, userId);
  }

  /**
   * Mark deal as lost
   */
  async markLost(
    id: string,
    reason: LostReason,
    details?: string,
    userId?: string
  ): Promise<Deal> {
    const deal = await this.getById(id);
    if (!deal) {
      throw new Error(`Deal ${id} not found`);
    }

    deal.lostReason = reason;
    deal.lostReasonDetails = details;
    this.deals.set(id, deal);

    const pipeline = this.pipelines.get(deal.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found`);
    }

    const lostStage = pipeline.stages.find((s) => s.isLost);
    if (!lostStage) {
      throw new Error('No lost stage defined in pipeline');
    }

    return this.moveStage(id, lostStage.id, userId || deal.ownerId);
  }

  /**
   * Delete deal
   */
  async delete(id: string, userId: string): Promise<void> {
    const deal = await this.getById(id);
    if (!deal) {
      throw new Error(`Deal ${id} not found`);
    }

    this.deals.delete(id);
    this.logAudit(deal, 'delete', [], userId);
    this.emit('deal:deleted', deal);
  }

  /**
   * Search deals
   */
  async search(params: DealSearchParams): Promise<DealSearchResult> {
    let results = Array.from(this.deals.values());

    // Text search
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter((d) => d.name.toLowerCase().includes(query));
    }

    // Apply filters
    if (params.pipelineId) {
      results = results.filter((d) => d.pipelineId === params.pipelineId);
    }
    if (params.stageId) {
      results = results.filter((d) => d.stageId === params.stageId);
    }
    if (params.ownerId) {
      results = results.filter((d) => d.ownerId === params.ownerId);
    }
    if (params.companyId) {
      results = results.filter((d) => d.companyId === params.companyId);
    }
    if (params.status?.length) {
      results = results.filter((d) => params.status!.includes(d.status));
    }
    if (params.priority?.length) {
      results = results.filter((d) => params.priority!.includes(d.priority));
    }
    if (params.tags?.length) {
      results = results.filter((d) => params.tags!.some((tag) => d.tags.includes(tag)));
    }
    if (params.minValue !== undefined) {
      results = results.filter((d) => d.value >= params.minValue!);
    }
    if (params.maxValue !== undefined) {
      results = results.filter((d) => d.value <= params.maxValue!);
    }
    if (params.isRotting !== undefined) {
      results = results.filter((d) => d.isRotting === params.isRotting);
    }
    if (params.closeDateFrom) {
      results = results.filter(
        (d) => d.expectedCloseDate && d.expectedCloseDate >= params.closeDateFrom!
      );
    }
    if (params.closeDateTo) {
      results = results.filter(
        (d) => d.expectedCloseDate && d.expectedCloseDate <= params.closeDateTo!
      );
    }

    // Sort
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    results.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    return {
      deals: paginatedResults,
      total: results.length,
      page,
      limit,
      hasMore: start + limit < results.length,
    };
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(pipelineId: string): Promise<PipelineStats> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const deals = Array.from(this.deals.values()).filter(
      (d) => d.pipelineId === pipelineId && d.status === 'open'
    );

    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = deals.reduce((sum, d) => sum + d.weightedValue, 0);
    const dealCount = deals.length;
    const avgDealSize = dealCount > 0 ? totalValue / dealCount : 0;

    const now = Date.now();
    const totalDaysInPipeline = deals.reduce((sum, d) => {
      return sum + Math.floor((now - d.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    const avgDaysInPipeline = dealCount > 0 ? totalDaysInPipeline / dealCount : 0;

    const stageStats: StageStats[] = pipeline.stages
      .filter((s) => !s.isWon && !s.isLost)
      .map((stage) => {
        const stageDeals = deals.filter((d) => d.stageId === stage.id);
        const stageTotalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
        const stageWeightedValue = stageDeals.reduce((sum, d) => sum + d.weightedValue, 0);

        const totalDaysInStage = stageDeals.reduce((sum, d) => {
          return sum + Math.floor((now - d.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);

        return {
          stageId: stage.id,
          stageName: stage.name,
          dealCount: stageDeals.length,
          totalValue: stageTotalValue,
          weightedValue: stageWeightedValue,
          avgDaysInStage: stageDeals.length > 0 ? totalDaysInStage / stageDeals.length : 0,
          conversionRate: stage.probability,
        };
      });

    return {
      pipelineId,
      totalValue,
      weightedValue,
      dealCount,
      avgDealSize,
      avgDaysInPipeline,
      stageStats,
    };
  }

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(
    pipelineId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WinLossAnalysis> {
    const deals = Array.from(this.deals.values()).filter(
      (d) =>
        d.pipelineId === pipelineId &&
        d.closedAt &&
        d.closedAt >= startDate &&
        d.closedAt <= endDate
    );

    const wonDeals = deals.filter((d) => d.status === 'won');
    const lostDeals = deals.filter((d) => d.status === 'lost');

    const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const lostValue = lostDeals.reduce((sum, d) => sum + d.value, 0);

    const winRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;
    const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

    // Calculate average sales cycle for won deals
    const salesCycles = wonDeals.map((d) => {
      return Math.floor((d.closedAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgSalesCycle =
      salesCycles.length > 0
        ? salesCycles.reduce((sum, days) => sum + days, 0) / salesCycles.length
        : 0;

    // Count lost reasons
    const lostReasonCounts = new Map<LostReason, number>();
    for (const deal of lostDeals) {
      if (deal.lostReason) {
        lostReasonCounts.set(deal.lostReason, (lostReasonCounts.get(deal.lostReason) || 0) + 1);
      }
    }

    const topLostReasons = Array.from(lostReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      won: { count: wonDeals.length, value: wonValue },
      lost: { count: lostDeals.length, value: lostValue },
      winRate,
      avgDealSize,
      avgSalesCycle,
      topLostReasons,
    };
  }

  /**
   * Check for rotting deals
   */
  async checkRottingDeals(): Promise<Deal[]> {
    const rottingDeals: Deal[] = [];
    const now = Date.now();

    for (const deal of this.deals.values()) {
      if (deal.status !== 'open') continue;

      const pipeline = this.pipelines.get(deal.pipelineId);
      if (!pipeline || !pipeline.dealRotting.enabled) continue;

      const stage = pipeline.stages.find((s) => s.id === deal.stageId);
      if (!stage || stage.rottingDays === 0) continue;

      const daysInStage = Math.floor(
        (now - deal.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysInStage > stage.rottingDays) {
        deal.isRotting = true;
        deal.rottingDays = daysInStage - stage.rottingDays;
        this.deals.set(deal.id, deal);
        rottingDeals.push(deal);
      }
    }

    if (rottingDeals.length > 0) {
      this.emit('deals:rotting', rottingDeals);
    }

    return rottingDeals;
  }

  /**
   * Generate forecast
   */
  async generateForecast(
    pipelineId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ForecastCategory[]> {
    const deals = Array.from(this.deals.values()).filter(
      (d) =>
        d.pipelineId === pipelineId &&
        d.status === 'open' &&
        d.expectedCloseDate &&
        d.expectedCloseDate >= startDate &&
        d.expectedCloseDate <= endDate
    );

    const categories: ForecastCategory[] = [
      { name: 'commit', amount: 0, dealIds: [] },
      { name: 'best_case', amount: 0, dealIds: [] },
      { name: 'pipeline', amount: 0, dealIds: [] },
      { name: 'omitted', amount: 0, dealIds: [] },
    ];

    for (const deal of deals) {
      if (deal.probability >= 90) {
        categories[0].amount += deal.value;
        categories[0].dealIds.push(deal.id);
      } else if (deal.probability >= 50) {
        categories[1].amount += deal.value;
        categories[1].dealIds.push(deal.id);
      } else if (deal.probability >= 10) {
        categories[2].amount += deal.value;
        categories[2].dealIds.push(deal.id);
      } else {
        categories[3].amount += deal.value;
        categories[3].dealIds.push(deal.id);
      }
    }

    return categories;
  }

  // Pipeline management

  /**
   * Get all pipelines
   */
  async getPipelines(): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get pipeline by ID
   */
  async getPipeline(id: string): Promise<Pipeline | null> {
    return this.pipelines.get(id) || null;
  }

  /**
   * Create pipeline
   */
  async createPipeline(pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pipeline> {
    const id = `pipeline_${Date.now()}`;
    const now = new Date();

    const newPipeline: Pipeline = {
      ...pipeline,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.pipelines.set(id, newPipeline);
    return newPipeline;
  }

  private logAudit(
    deal: Deal,
    action: AuditLog['action'],
    changes: FieldChange[],
    userId: string
  ): void {
    this.auditLogs.push({
      id: this.generateId(),
      entityType: 'deal',
      entityId: deal.id,
      action,
      userId,
      userName: userId,
      changes,
      timestamp: new Date(),
    });
  }

  private generateId(): string {
    return `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const dealService = new DealService();
