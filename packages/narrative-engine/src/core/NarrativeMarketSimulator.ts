import type {
  IdentityCluster,
  MarketSnapshot,
  NarrativeAlignment,
  NarrativeMarket,
} from './types.js';

export class NarrativeMarketSimulator {
  private markets = new Map<string, NarrativeMarket>();
  private clusters = new Map<string, IdentityCluster>();
  private alignments = new Map<string, NarrativeAlignment[]>(); // NarrativeID -> Alignments
  private narrativeShares = new Map<string, number>(); // NarrativeID -> Share
  private substitutionMatrix = new Map<string, Map<string, number>>(); // NarrativeID -> { NarrativeID -> SubstitutionRate }

  constructor() {}

  configureMarket(market: NarrativeMarket, clusters: IdentityCluster[]) {
    this.markets.set(market.id, market);
    clusters.forEach((cluster) => this.clusters.set(cluster.id, cluster));
    // Initialize shares uniformly if not set
    const share = 1.0 / market.narrativeIds.length;
    market.narrativeIds.forEach((nid) => {
      if (!this.narrativeShares.has(nid)) {
        this.narrativeShares.set(nid, share);
      }
    });
  }

  setAlignments(alignments: NarrativeAlignment[]) {
    alignments.forEach((align) => {
      const list = this.alignments.get(align.narrativeId) ?? [];
      list.push(align);
      this.alignments.set(align.narrativeId, list);
    });
  }

  setSubstitution(fromNarrativeId: string, toNarrativeId: string, rate: number) {
    let subs = this.substitutionMatrix.get(fromNarrativeId);
    if (!subs) {
      subs = new Map();
      this.substitutionMatrix.set(fromNarrativeId, subs);
    }
    subs.set(toNarrativeId, rate);
  }

  simulateMarketStep(marketId: string, timestamp: number): MarketSnapshot {
    const market = this.markets.get(marketId);
    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }

    const currentShares = new Map<string, number>();
    market.narrativeIds.forEach((nid) => {
      currentShares.set(nid, this.narrativeShares.get(nid) ?? 0);
    });

    const newShares = new Map(currentShares);
    const totalClusterSize = Array.from(this.clusters.values()).reduce((acc, c) => acc + c.size, 0);

    // 1. Calculate Growth based on Alignment
    market.narrativeIds.forEach((nid) => {
      const alignments = this.alignments.get(nid) ?? [];
      let alignmentFactor = 0;
      alignments.forEach((align) => {
        const cluster = this.clusters.get(align.clusterId);
        if (cluster) {
          // Weighted by cluster size and alignment score
          alignmentFactor += align.score * (cluster.size / totalClusterSize);
        }
      });

      // Growth or decay based on alignment
      const currentShare = currentShares.get(nid) ?? 0;
      const growth = currentShare * alignmentFactor * 0.1; // 10% growth rate factor
      newShares.set(nid, Math.max(0, Math.min(1, currentShare + growth)));
    });

    // 2. Apply Substitution/Competition
    market.narrativeIds.forEach((nidA) => {
      const subs = this.substitutionMatrix.get(nidA);
      if (subs) {
        subs.forEach((rate, nidB) => {
          if (market.narrativeIds.includes(nidB)) {
            const shareA = newShares.get(nidA) ?? 0;
            const transfer = shareA * rate;
            newShares.set(nidA, Math.max(0, shareA - transfer));
            newShares.set(nidB, Math.min(1, (newShares.get(nidB) ?? 0) + transfer));
          }
        });
      }
    });

    // Normalize shares to sum to 1.0 (assuming closed market for simplicity, or we can allow < 1.0 for "apathy")
    // For this epic, we'll normalize to 1.0 to represent "share of voice"
    let totalShare = 0;
    newShares.forEach((s) => totalShare += s);
    if (totalShare > 0) {
      newShares.forEach((s, k) => newShares.set(k, s / totalShare));
    }

    // Update state
    newShares.forEach((s, k) => this.narrativeShares.set(k, s));

    // Calculate Cluster Saturation (simplified: sum of shares of aligned narratives)
    const clusterSaturation: Record<string, number> = {};
    this.clusters.forEach((cluster) => {
      let saturation = 0;
      market.narrativeIds.forEach((nid) => {
        const alignments = this.alignments.get(nid) ?? [];
        const align = alignments.find((a) => a.clusterId === cluster.id);
        if (align && align.score > 0) {
          saturation += (newShares.get(nid) ?? 0) * align.score;
        }
      });
      clusterSaturation[cluster.id] = Math.min(1, saturation);
    });

    return {
      timestamp,
      marketId,
      narrativeShares: Object.fromEntries(newShares),
      clusterSaturation,
    };
  }

  getMarketState(marketId: string): MarketSnapshot | null {
      const market = this.markets.get(marketId);
      if (!market) return null;

      const shares: Record<string, number> = {};
      market.narrativeIds.forEach(nid => {
          shares[nid] = this.narrativeShares.get(nid) ?? 0;
      });

      // Recalculate saturation for current state (could be cached)
      const clusterSaturation: Record<string, number> = {};
      this.clusters.forEach((cluster) => {
        let saturation = 0;
        market.narrativeIds.forEach((nid) => {
          const alignments = this.alignments.get(nid) ?? [];
          const align = alignments.find((a) => a.clusterId === cluster.id);
          if (align && align.score > 0) {
            saturation += (shares[nid] ?? 0) * align.score;
          }
        });
        clusterSaturation[cluster.id] = Math.min(1, saturation);
      });

      return {
          timestamp: Date.now(),
          marketId,
          narrativeShares: shares,
          clusterSaturation
      };
  }
}
