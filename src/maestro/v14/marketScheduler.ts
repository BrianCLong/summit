/**
 * Market-Based Scheduling System
 * Internal spot market to allocate scarce tokens/compute to highest value tasks
 */

import { EventEmitter } from 'events';

export interface ResourceBid {
  id: string;
  prId: string;
  bidder: string;
  valueEstimate: number;
  resourceNeeds: {
    llmTokens: number;
    ciMinutes: number;
    gpuMinutes: number;
  };
  maxPrice: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface BidResult {
  bidId: string;
  awarded: boolean;
  price: number;
  totalCost: number;
  carbonCost?: number;
  reason?: string;
  allocation: {
    llmTokens: number;
    ciMinutes: number;
    gpuMinutes: number;
  };
  estimatedDelay: number;
}

export interface ResourcePool {
  type: 'llm' | 'ci' | 'gpu';
  available: number;
  total: number;
  pricePerUnit: number;
  carbonPerUnit: number;
  region: string;
  queueLength: number;
}

export interface TenantQuota {
  tenantId: string;
  floor: {
    llmTokens: number;
    ciMinutes: number;
    gpuMinutes: number;
  };
  ceiling: {
    llmTokens: number;
    ciMinutes: number;
    gpuMinutes: number;
  };
  used: {
    llmTokens: number;
    ciMinutes: number;
    gpuMinutes: number;
  };
}

export interface AuctionRound {
  id: string;
  startTime: number;
  endTime: number;
  bids: ResourceBid[];
  winners: string[];
  clearingPrice: Record<string, number>;
  fairnessIndex: number;
}

export class MarketScheduler extends EventEmitter {
  private resourcePools: Map<string, ResourcePool> = new Map();
  private tenantQuotas: Map<string, TenantQuota> = new Map();
  private activeBids: Map<string, ResourceBid> = new Map();
  private auctionHistory: AuctionRound[] = [];
  private currentAuction: AuctionRound | null = null;
  private auctionInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeResourcePools();
    this.initializeTenantQuotas();
    this.startAuctionTimer();
  }

  private initializeResourcePools(): void {
    // LLM Token Pool
    this.resourcePools.set('llm-us-east', {
      type: 'llm',
      available: 1000000, // 1M tokens
      total: 1000000,
      pricePerUnit: 0.002, // $0.002 per 1k tokens
      carbonPerUnit: 0.001, // 1g CO2e per 1k tokens
      region: 'us-east-1',
      queueLength: 0,
    });

    // CI Compute Pool
    this.resourcePools.set('ci-us-east', {
      type: 'ci',
      available: 480, // 480 minutes (8 hours)
      total: 480,
      pricePerUnit: 0.008, // $0.008 per minute
      carbonPerUnit: 0.5, // 0.5g CO2e per minute
      region: 'us-east-1',
      queueLength: 0,
    });

    // GPU Pool
    this.resourcePools.set('gpu-us-east', {
      type: 'gpu',
      available: 120, // 120 GPU minutes
      total: 120,
      pricePerUnit: 0.5, // $0.50 per GPU minute
      carbonPerUnit: 2.0, // 2g CO2e per GPU minute
      region: 'us-east-1',
      queueLength: 0,
    });
  }

  private initializeTenantQuotas(): void {
    // Default tenant quotas
    this.tenantQuotas.set('default', {
      tenantId: 'default',
      floor: {
        llmTokens: 50000, // 50k tokens floor
        ciMinutes: 30,
        gpuMinutes: 10,
      },
      ceiling: {
        llmTokens: 500000, // 500k tokens ceiling
        ciMinutes: 180,
        gpuMinutes: 60,
      },
      used: {
        llmTokens: 0,
        ciMinutes: 0,
        gpuMinutes: 0,
      },
    });

    // Enterprise tenant
    this.tenantQuotas.set('enterprise', {
      tenantId: 'enterprise',
      floor: {
        llmTokens: 200000,
        ciMinutes: 120,
        gpuMinutes: 40,
      },
      ceiling: {
        llmTokens: 2000000,
        ciMinutes: 600,
        gpuMinutes: 200,
      },
      used: {
        llmTokens: 0,
        ciMinutes: 0,
        gpuMinutes: 0,
      },
    });
  }

  private startAuctionTimer(): void {
    // Run sealed-bid auctions every 5 minutes
    this.auctionInterval = setInterval(
      () => {
        this.runSealedBidAuction();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Submit a bid for resources
   */
  async submitBid(bidData: {
    prId: string;
    valueEstimate: number;
    resourceNeeds: {
      llmTokens: number;
      ciMinutes: number;
      gpuMinutes: number;
    };
    tenantId?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<BidResult> {
    const bidId = `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tenantId = bidData.tenantId || 'default';

    // Check tenant quotas
    const quotaCheck = this.checkTenantQuotas(tenantId, bidData.resourceNeeds);
    if (!quotaCheck.allowed) {
      return {
        bidId,
        awarded: false,
        price: 0,
        totalCost: 0,
        reason: quotaCheck.reason,
        allocation: { llmTokens: 0, ciMinutes: 0, gpuMinutes: 0 },
        estimatedDelay: 0,
      };
    }

    // Calculate bid price based on value density
    const bid: ResourceBid = {
      id: bidId,
      prId: bidData.prId,
      bidder: tenantId,
      valueEstimate: bidData.valueEstimate,
      resourceNeeds: bidData.resourceNeeds,
      maxPrice: this.calculateMaxPrice(
        bidData.valueEstimate,
        bidData.resourceNeeds,
      ),
      priority: bidData.priority || 'medium',
      timestamp: Date.now(),
    };

    // For high-priority bids, try immediate allocation
    if (bid.priority === 'critical' || bid.priority === 'high') {
      const immediateResult = await this.tryImmediateAllocation(bid);
      if (immediateResult.awarded) {
        return immediateResult;
      }
    }

    // Add to auction queue
    this.activeBids.set(bidId, bid);
    this.emit('bidSubmitted', bid);

    return {
      bidId,
      awarded: false,
      price: 0,
      totalCost: 0,
      reason: 'Bid queued for next auction',
      allocation: { llmTokens: 0, ciMinutes: 0, gpuMinutes: 0 },
      estimatedDelay: this.estimateDelay(bid),
    };
  }

  private checkTenantQuotas(
    tenantId: string,
    needs: { llmTokens: number; ciMinutes: number; gpuMinutes: number },
  ): { allowed: boolean; reason?: string } {
    const quota = this.tenantQuotas.get(tenantId);
    if (!quota) {
      return { allowed: false, reason: 'Unknown tenant' };
    }

    // Check against ceilings
    if (quota.used.llmTokens + needs.llmTokens > quota.ceiling.llmTokens) {
      return { allowed: false, reason: 'LLM token ceiling exceeded' };
    }
    if (quota.used.ciMinutes + needs.ciMinutes > quota.ceiling.ciMinutes) {
      return { allowed: false, reason: 'CI minutes ceiling exceeded' };
    }
    if (quota.used.gpuMinutes + needs.gpuMinutes > quota.ceiling.gpuMinutes) {
      return { allowed: false, reason: 'GPU minutes ceiling exceeded' };
    }

    return { allowed: true };
  }

  private calculateMaxPrice(valueEstimate: number, needs: any): number {
    // Value density = ROI / Cost
    const estimatedCost = this.estimateResourceCost(needs);
    const roi = valueEstimate / Math.max(estimatedCost, 0.01);

    // Max price is 80% of value estimate
    return Math.min(valueEstimate * 0.8, roi * estimatedCost);
  }

  private estimateResourceCost(needs: any): number {
    let cost = 0;

    // LLM cost
    const llmPool = this.resourcePools.get('llm-us-east');
    if (llmPool) {
      cost += (needs.llmTokens / 1000) * llmPool.pricePerUnit;
    }

    // CI cost
    const ciPool = this.resourcePools.get('ci-us-east');
    if (ciPool) {
      cost += needs.ciMinutes * ciPool.pricePerUnit;
    }

    // GPU cost
    const gpuPool = this.resourcePools.get('gpu-us-east');
    if (gpuPool) {
      cost += needs.gpuMinutes * gpuPool.pricePerUnit;
    }

    return cost;
  }

  private async tryImmediateAllocation(bid: ResourceBid): Promise<BidResult> {
    // Check if resources are immediately available
    const llmPool = this.resourcePools.get('llm-us-east')!;
    const ciPool = this.resourcePools.get('ci-us-east')!;
    const gpuPool = this.resourcePools.get('gpu-us-east')!;

    const hasLLM = llmPool.available >= bid.resourceNeeds.llmTokens;
    const hasCI = ciPool.available >= bid.resourceNeeds.ciMinutes;
    const hasGPU = gpuPool.available >= bid.resourceNeeds.gpuMinutes;

    if (hasLLM && hasCI && hasGPU) {
      // Allocate immediately at current prices
      const cost = this.calculateCost(bid.resourceNeeds);

      // Reserve resources
      llmPool.available -= bid.resourceNeeds.llmTokens;
      ciPool.available -= bid.resourceNeeds.ciMinutes;
      gpuPool.available -= bid.resourceNeeds.gpuMinutes;

      // Update tenant usage
      this.updateTenantUsage(bid.bidder, bid.resourceNeeds);

      this.emit('immediateAllocation', { bidId: bid.id, cost });

      return {
        bidId: bid.id,
        awarded: true,
        price: cost.price,
        totalCost: cost.total,
        carbonCost: cost.carbon,
        allocation: bid.resourceNeeds,
        estimatedDelay: 0,
      };
    }

    return {
      bidId: bid.id,
      awarded: false,
      price: 0,
      totalCost: 0,
      reason: 'Insufficient immediate capacity',
      allocation: { llmTokens: 0, ciMinutes: 0, gpuMinutes: 0 },
      estimatedDelay: this.estimateDelay(bid),
    };
  }

  private calculateCost(needs: any): {
    price: number;
    total: number;
    carbon: number;
  } {
    const llmPool = this.resourcePools.get('llm-us-east')!;
    const ciPool = this.resourcePools.get('ci-us-east')!;
    const gpuPool = this.resourcePools.get('gpu-us-east')!;

    const llmCost = (needs.llmTokens / 1000) * llmPool.pricePerUnit;
    const ciCost = needs.ciMinutes * ciPool.pricePerUnit;
    const gpuCost = needs.gpuMinutes * gpuPool.pricePerUnit;

    const llmCarbon = (needs.llmTokens / 1000) * llmPool.carbonPerUnit;
    const ciCarbon = needs.ciMinutes * ciPool.carbonPerUnit;
    const gpuCarbon = needs.gpuMinutes * gpuPool.carbonPerUnit;

    const total = llmCost + ciCost + gpuCost;
    const carbon = llmCarbon + ciCarbon + gpuCarbon;

    return {
      price: total,
      total,
      carbon,
    };
  }

  private estimateDelay(bid: ResourceBid): number {
    // Estimate delay based on queue length and resource availability
    const llmPool = this.resourcePools.get('llm-us-east')!;
    const ciPool = this.resourcePools.get('ci-us-east')!;
    const gpuPool = this.resourcePools.get('gpu-us-east')!;

    // Calculate bottleneck resource
    const llmWait = Math.max(
      0,
      (bid.resourceNeeds.llmTokens - llmPool.available) / 10000,
    ); // 10k tokens per minute
    const ciWait = Math.max(0, bid.resourceNeeds.ciMinutes - ciPool.available);
    const gpuWait = Math.max(
      0,
      bid.resourceNeeds.gpuMinutes - gpuPool.available,
    );

    return Math.max(llmWait, ciWait, gpuWait) * 60; // Convert to seconds
  }

  private updateTenantUsage(tenantId: string, usage: any): void {
    const quota = this.tenantQuotas.get(tenantId);
    if (quota) {
      quota.used.llmTokens += usage.llmTokens;
      quota.used.ciMinutes += usage.ciMinutes;
      quota.used.gpuMinutes += usage.gpuMinutes;
    }
  }

  /**
   * Run sealed-bid auction using Vickrey-style pricing
   */
  private async runSealedBidAuction(): Promise<void> {
    const auctionId = `auction-${Date.now()}`;
    const startTime = Date.now();

    // Get all active bids
    const bids = Array.from(this.activeBids.values());
    if (bids.length === 0) return;

    this.currentAuction = {
      id: auctionId,
      startTime,
      endTime: 0,
      bids,
      winners: [],
      clearingPrice: {},
      fairnessIndex: 0,
    };

    // Clear active bids
    this.activeBids.clear();

    try {
      // Run Vickrey auction for each resource type
      const llmResults = this.runVickreyAuction(bids, 'llmTokens');
      const ciResults = this.runVickreyAuction(bids, 'ciMinutes');
      const gpuResults = this.runVickreyAuction(bids, 'gpuMinutes');

      // Determine winners (bids that win all needed resources)
      const winners = this.determineAuctionWinners(
        bids,
        llmResults,
        ciResults,
        gpuResults,
      );

      // Calculate clearing prices
      const clearingPrice = {
        llm: llmResults.price || 0,
        ci: ciResults.price || 0,
        gpu: gpuResults.price || 0,
      };

      // Calculate fairness index
      const fairnessIndex = this.calculateFairnessIndex(bids, winners);

      // Update auction results
      this.currentAuction.endTime = Date.now();
      this.currentAuction.winners = winners.map((w) => w.id);
      this.currentAuction.clearingPrice = clearingPrice;
      this.currentAuction.fairnessIndex = fairnessIndex;

      // Allocate resources to winners
      for (const winner of winners) {
        await this.allocateResourcesToWinner(winner, clearingPrice);
      }

      // Store auction history
      this.auctionHistory.push(this.currentAuction);
      if (this.auctionHistory.length > 100) {
        this.auctionHistory.shift(); // Keep last 100 auctions
      }

      this.emit('auctionComplete', {
        auctionId,
        winners: winners.length,
        totalBids: bids.length,
        clearingPrice,
        fairnessIndex,
      });
    } catch (error) {
      this.emit('auctionError', { auctionId, error: error.message });
    }

    this.currentAuction = null;
  }

  /**
   * Vickrey auction implementation for a specific resource
   */
  private runVickreyAuction(
    bids: ResourceBid[],
    resourceType: 'llmTokens' | 'ciMinutes' | 'gpuMinutes',
  ): { winner: ResourceBid | null; price: number } {
    // Filter bids that need this resource
    const relevantBids = bids.filter(
      (bid) => bid.resourceNeeds[resourceType] > 0,
    );
    if (relevantBids.length === 0) return { winner: null, price: 0 };

    // Sort by value density (value per unit of resource)
    const sortedBids = relevantBids
      .map((bid) => ({
        bid,
        density: bid.valueEstimate / bid.resourceNeeds[resourceType],
      }))
      .sort((a, b) => b.density - a.density);

    if (sortedBids.length === 0) return { winner: null, price: 0 };

    const winner = sortedBids[0].bid;
    const secondPrice =
      sortedBids.length > 1 ? sortedBids[1].density : sortedBids[0].density;

    return {
      winner,
      price: secondPrice,
    };
  }

  private determineAuctionWinners(
    bids: ResourceBid[],
    llmResults: any,
    ciResults: any,
    gpuResults: any,
  ): ResourceBid[] {
    const winners: ResourceBid[] = [];

    for (const bid of bids) {
      const winsLLM =
        !bid.resourceNeeds.llmTokens || llmResults.winner?.id === bid.id;
      const winsCI =
        !bid.resourceNeeds.ciMinutes || ciResults.winner?.id === bid.id;
      const winsGPU =
        !bid.resourceNeeds.gpuMinutes || gpuResults.winner?.id === bid.id;

      if (winsLLM && winsCI && winsGPU) {
        winners.push(bid);
      }
    }

    return winners;
  }

  private calculateFairnessIndex(
    bids: ResourceBid[],
    winners: ResourceBid[],
  ): number {
    // Jain's fairness index
    if (bids.length === 0) return 1.0;

    const tenantWins = new Map<string, number>();
    const tenantTotal = new Map<string, number>();

    // Count wins and total bids per tenant
    for (const bid of bids) {
      tenantTotal.set(bid.bidder, (tenantTotal.get(bid.bidder) || 0) + 1);
    }

    for (const winner of winners) {
      tenantWins.set(winner.bidder, (tenantWins.get(winner.bidder) || 0) + 1);
    }

    // Calculate fairness using win ratios
    const ratios: number[] = [];
    for (const [tenant, total] of tenantTotal) {
      const wins = tenantWins.get(tenant) || 0;
      ratios.push(wins / total);
    }

    if (ratios.length === 0) return 1.0;

    const sum = ratios.reduce((a, b) => a + b, 0);
    const sumSquares = ratios.reduce((a, b) => a + b * b, 0);

    return (sum * sum) / (ratios.length * sumSquares);
  }

  private async allocateResourcesToWinner(
    winner: ResourceBid,
    clearingPrice: any,
  ): Promise<void> {
    // Calculate final cost
    const cost = {
      llm: (winner.resourceNeeds.llmTokens / 1000) * clearingPrice.llm,
      ci: winner.resourceNeeds.ciMinutes * clearingPrice.ci,
      gpu: winner.resourceNeeds.gpuMinutes * clearingPrice.gpu,
    };

    const totalCost = cost.llm + cost.ci + cost.gpu;

    // Update resource pools
    const llmPool = this.resourcePools.get('llm-us-east')!;
    const ciPool = this.resourcePools.get('ci-us-east')!;
    const gpuPool = this.resourcePools.get('gpu-us-east')!;

    llmPool.available -= winner.resourceNeeds.llmTokens;
    ciPool.available -= winner.resourceNeeds.ciMinutes;
    gpuPool.available -= winner.resourceNeeds.gpuMinutes;

    // Update tenant usage
    this.updateTenantUsage(winner.bidder, winner.resourceNeeds);

    this.emit('resourceAllocated', {
      bidId: winner.id,
      prId: winner.prId,
      tenant: winner.bidder,
      allocation: winner.resourceNeeds,
      cost: totalCost,
      clearingPrice,
    });
  }

  /**
   * Get current resource availability
   */
  getResourceAvailability(): Map<string, ResourcePool> {
    return this.resourcePools;
  }

  /**
   * Get tenant quotas
   */
  getTenantQuotas(): Map<string, TenantQuota> {
    return this.tenantQuotas;
  }

  /**
   * Get auction history
   */
  getAuctionHistory(): AuctionRound[] {
    return this.auctionHistory;
  }

  /**
   * Get current auction status
   */
  getCurrentAuctionStatus(): AuctionRound | null {
    return this.currentAuction;
  }

  /**
   * Force refresh resource pools (simulates resource replenishment)
   */
  refreshResourcePools(): void {
    for (const [poolId, pool] of this.resourcePools) {
      pool.available = Math.min(pool.total, pool.available + pool.total * 0.1); // 10% refresh
    }
    this.emit('resourcePoolsRefreshed');
  }

  /**
   * Update tenant quota
   */
  updateTenantQuota(tenantId: string, quotaUpdate: Partial<TenantQuota>): void {
    const existing = this.tenantQuotas.get(tenantId);
    if (existing) {
      Object.assign(existing, quotaUpdate);
    } else {
      this.tenantQuotas.set(tenantId, quotaUpdate as TenantQuota);
    }
    this.emit('tenantQuotaUpdated', {
      tenantId,
      quota: this.tenantQuotas.get(tenantId),
    });
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.auctionInterval) {
      clearInterval(this.auctionInterval);
    }
  }
}

export default MarketScheduler;
