import type {
  CompositeMarketSnapshot,
  CollectibleSignalDatum,
  DemandForecastDatum,
  EnergyMarketDatum,
  FinancialMarketDatum,
  ConsumerMarketDatum,
  RegulatoryDatum
} from './types.js';

export interface DataFeed {
  fetchFinancial(): Promise<FinancialMarketDatum[]>;
  fetchConsumer(): Promise<ConsumerMarketDatum[]>;
  fetchCollectibles(): Promise<CollectibleSignalDatum[]>;
  fetchEnergy(): Promise<EnergyMarketDatum[]>;
  fetchDemand(): Promise<DemandForecastDatum[]>;
  fetchRegulation(): Promise<RegulatoryDatum[]>;
}

export class CompositeDataFeed {
  constructor(private readonly sources: DataFeed[]) {}

  async fetchSnapshot(): Promise<CompositeMarketSnapshot> {
    const [financialRaw, consumerRaw, collectiblesRaw, energyRaw, demandRaw, regulationRaw] =
      await Promise.all([
        this.collect(source => source.fetchFinancial()),
        this.collect(source => source.fetchConsumer()),
        this.collect(source => source.fetchCollectibles()),
        this.collect(source => source.fetchEnergy()),
        this.collect(source => source.fetchDemand()),
        this.collect(source => source.fetchRegulation())
      ]);

    const timestamps = [
      ...financialRaw.map(entry => entry.timestamp),
      ...consumerRaw.map(entry => entry.timestamp),
      ...collectiblesRaw.map(entry => entry.timestamp),
      ...energyRaw.map(entry => entry.timestamp),
      ...demandRaw.map(entry => entry.timestamp),
      ...regulationRaw.map(entry => entry.effectiveDate)
    ];

    const financial = this.mergeFinancial(financialRaw);
    const consumer = this.mergeConsumer(consumerRaw);
    const collectibles = this.mergeCollectibles(collectiblesRaw);
    const energy = this.mergeEnergy(energyRaw);
    const demand = this.mergeDemand(demandRaw);
    const regulation = this.mergeRegulation(regulationRaw);

    return {
      generatedAt: this.resolveGeneratedAt(timestamps),
      financial,
      consumer,
      collectibles,
      energy,
      demand,
      regulation
    };
  }

  private async collect<T>(fetcher: (source: DataFeed) => Promise<T[]>): Promise<T[]> {
    const results = await Promise.all(this.sources.map(source => fetcher(source)));
    return results.flat();
  }

  private resolveGeneratedAt(timestamps: (string | undefined)[]): string {
    const parsed = timestamps
      .map(value => (value ? Date.parse(value) : Number.NaN))
      .filter(value => Number.isFinite(value));
    const latest = parsed.length ? Math.max(...parsed) : Date.now();
    return new Date(latest).toISOString();
  }

  private mergeFinancial(data: FinancialMarketDatum[]): FinancialMarketDatum[] {
    const byKey = new Map<
      string,
      {
        provider: string;
        region: string;
        currency: string;
        spotSum: number;
        reservedSum: number;
        count: number;
        latestTimestamp: number;
      }
    >();

    for (const datum of data) {
      const key = `${datum.provider}:${datum.region}`;
      const timestamp = Date.parse(datum.timestamp ?? '') || 0;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          provider: datum.provider,
          region: datum.region,
          currency: datum.currency,
          spotSum: datum.spotPricePerUnit,
          reservedSum: datum.reservedPricePerUnit,
          count: 1,
          latestTimestamp: timestamp
        });
        continue;
      }

      existing.spotSum += datum.spotPricePerUnit;
      existing.reservedSum += datum.reservedPricePerUnit;
      existing.count += 1;
      if (timestamp > existing.latestTimestamp) {
        existing.currency = datum.currency;
        existing.latestTimestamp = timestamp;
      }
    }

    return Array.from(byKey.values()).map(entry => ({
      provider: entry.provider,
      region: entry.region,
      spotPricePerUnit: entry.spotSum / entry.count,
      reservedPricePerUnit: entry.reservedSum / entry.count,
      currency: entry.currency,
      timestamp: new Date(entry.latestTimestamp || Date.now()).toISOString()
    }));
  }

  private mergeConsumer(data: ConsumerMarketDatum[]): ConsumerMarketDatum[] {
    const byKey = new Map<
      string,
      {
        marketplace: string;
        region: string;
        category: string;
        priceSum: number;
        priceWeight: number;
        volumeTotal: number;
        priceChangeSum: number;
        demandSum: number;
        sentimentSum: number;
        latestTimestamp: number;
      }
    >();

    for (const datum of data) {
      const key = `${datum.marketplace}:${datum.region}:${datum.category}`;
      const timestamp = Date.parse(datum.timestamp ?? '') || 0;
      const weight = datum.volume24h > 0 ? datum.volume24h : 1;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          marketplace: datum.marketplace,
          region: datum.region,
          category: datum.category,
          priceSum: datum.averagePrice * weight,
          priceWeight: weight,
          volumeTotal: Math.max(0, datum.volume24h),
          priceChangeSum: datum.priceChangePercent * weight,
          demandSum: datum.demandScore * weight,
          sentimentSum: datum.sentimentScore * weight,
          latestTimestamp: timestamp
        });
        continue;
      }

      existing.priceSum += datum.averagePrice * weight;
      existing.priceWeight += weight;
      existing.volumeTotal += Math.max(0, datum.volume24h);
      existing.priceChangeSum += datum.priceChangePercent * weight;
      existing.demandSum += datum.demandScore * weight;
      existing.sentimentSum += datum.sentimentScore * weight;
      if (timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = timestamp;
      }
    }

    return Array.from(byKey.values()).map(entry => ({
      marketplace: entry.marketplace,
      region: entry.region,
      category: entry.category,
      averagePrice: entry.priceWeight ? entry.priceSum / entry.priceWeight : 0,
      volume24h: entry.volumeTotal,
      priceChangePercent: entry.priceWeight ? entry.priceChangeSum / entry.priceWeight : 0,
      demandScore: entry.priceWeight ? entry.demandSum / entry.priceWeight : 0,
      sentimentScore: entry.priceWeight ? entry.sentimentSum / entry.priceWeight : 0,
      timestamp: new Date(entry.latestTimestamp || Date.now()).toISOString()
    }));
  }

  private mergeCollectibles(data: CollectibleSignalDatum[]): CollectibleSignalDatum[] {
    const byKey = new Map<
      string,
      {
        platform: string;
        region: string;
        collection: string;
        currency: string;
        floorPriceSum: number;
        floorWeight: number;
        scarcitySum: number;
        auctionClearSum: number;
        sentimentSum: number;
        count: number;
        latestTimestamp: number;
      }
    >();

    for (const datum of data) {
      const key = `${datum.platform}:${datum.region}:${datum.collection}`;
      const timestamp = Date.parse(datum.timestamp ?? '') || 0;
      const weight = datum.scarcityScore > 0 ? datum.scarcityScore : 1;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          platform: datum.platform,
          region: datum.region,
          collection: datum.collection,
          currency: datum.currency,
          floorPriceSum: datum.floorPrice * weight,
          floorWeight: weight,
          scarcitySum: datum.scarcityScore,
          auctionClearSum: datum.auctionClearRate,
          sentimentSum: datum.sentimentScore,
          count: 1,
          latestTimestamp: timestamp
        });
        continue;
      }

      existing.floorPriceSum += datum.floorPrice * weight;
      existing.floorWeight += weight;
      existing.scarcitySum += datum.scarcityScore;
      existing.auctionClearSum += datum.auctionClearRate;
      existing.sentimentSum += datum.sentimentScore;
      existing.count += 1;
      if (timestamp > existing.latestTimestamp) {
        existing.currency = datum.currency;
        existing.latestTimestamp = timestamp;
      }
    }

    return Array.from(byKey.values()).map(entry => ({
      platform: entry.platform,
      region: entry.region,
      collection: entry.collection,
      floorPrice: entry.floorWeight ? entry.floorPriceSum / entry.floorWeight : 0,
      currency: entry.currency,
      scarcityScore: entry.count ? entry.scarcitySum / entry.count : 0,
      auctionClearRate: entry.count ? entry.auctionClearSum / entry.count : 0,
      sentimentScore: entry.count ? entry.sentimentSum / entry.count : 0,
      timestamp: new Date(entry.latestTimestamp || Date.now()).toISOString()
    }));
  }

  private mergeEnergy(data: EnergyMarketDatum[]): EnergyMarketDatum[] {
    const byKey = new Map<
      string,
      {
        region: string;
        carbonSum: number;
        priceSum: number;
        count: number;
        latestTimestamp: number;
      }
    >();

    for (const datum of data) {
      const key = datum.region;
      const timestamp = Date.parse(datum.timestamp ?? '') || 0;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          region: datum.region,
          carbonSum: datum.carbonIntensityGramsPerKwh,
          priceSum: datum.pricePerKwh,
          count: 1,
          latestTimestamp: timestamp
        });
        continue;
      }

      existing.carbonSum += datum.carbonIntensityGramsPerKwh;
      existing.priceSum += datum.pricePerKwh;
      existing.count += 1;
      if (timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = timestamp;
      }
    }

    return Array.from(byKey.values()).map(entry => ({
      region: entry.region,
      carbonIntensityGramsPerKwh: entry.carbonSum / entry.count,
      pricePerKwh: entry.priceSum / entry.count,
      timestamp: new Date(entry.latestTimestamp || Date.now()).toISOString()
    }));
  }

  private mergeDemand(data: DemandForecastDatum[]): DemandForecastDatum[] {
    const byKey = new Map<
      string,
      {
        provider: string;
        region: string;
        resource: string;
        utilizationSum: number;
        confidenceSum: number;
        count: number;
        latestTimestamp: number;
      }
    >();

    for (const datum of data) {
      const key = `${datum.provider}:${datum.region}:${datum.resource}`;
      const timestamp = Date.parse(datum.timestamp ?? '') || 0;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          provider: datum.provider,
          region: datum.region,
          resource: datum.resource,
          utilizationSum: datum.predictedUtilization,
          confidenceSum: datum.confidence,
          count: 1,
          latestTimestamp: timestamp
        });
        continue;
      }

      existing.utilizationSum += datum.predictedUtilization;
      existing.confidenceSum += datum.confidence;
      existing.count += 1;
      if (timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = timestamp;
      }
    }

    return Array.from(byKey.values()).map(entry => ({
      provider: entry.provider,
      region: entry.region,
      resource: entry.resource as DemandForecastDatum['resource'],
      predictedUtilization: entry.utilizationSum / entry.count,
      confidence: entry.confidenceSum / entry.count,
      timestamp: new Date(entry.latestTimestamp || Date.now()).toISOString()
    }));
  }

  private mergeRegulation(data: RegulatoryDatum[]): RegulatoryDatum[] {
    const byKey = new Map<
      string,
      {
        provider: string;
        region: string;
        incentivePerUnit: number;
        penaltyPerUnit: number;
        notes: string;
        effectiveDate: string;
        effectiveTimestamp: number;
      }
    >();

    for (const datum of data) {
      const key = `${datum.provider}:${datum.region}`;
      const timestamp = Date.parse(datum.effectiveDate ?? '') || 0;
      const existing = byKey.get(key);
      if (!existing || timestamp >= existing.effectiveTimestamp) {
        byKey.set(key, {
          provider: datum.provider,
          region: datum.region,
          incentivePerUnit: datum.incentivePerUnit,
          penaltyPerUnit: datum.penaltyPerUnit,
          notes: datum.notes,
          effectiveDate: datum.effectiveDate,
          effectiveTimestamp: timestamp
        });
      }
    }

    return Array.from(byKey.values()).map(entry => ({
      provider: entry.provider,
      region: entry.region,
      incentivePerUnit: entry.incentivePerUnit,
      penaltyPerUnit: entry.penaltyPerUnit,
      notes: entry.notes,
      effectiveDate: entry.effectiveDate
    }));
  }
}

export class InMemoryDataFeed implements DataFeed {
  constructor(
    private readonly financial: FinancialMarketDatum[],
    private readonly consumer: ConsumerMarketDatum[],
    private readonly collectibles: CollectibleSignalDatum[],
    private readonly energy: EnergyMarketDatum[],
    private readonly demand: DemandForecastDatum[],
    private readonly regulation: RegulatoryDatum[]
  ) {}

  async fetchFinancial(): Promise<FinancialMarketDatum[]> {
    return [...this.financial];
  }

  async fetchConsumer(): Promise<ConsumerMarketDatum[]> {
    return [...this.consumer];
  }

  async fetchCollectibles(): Promise<CollectibleSignalDatum[]> {
    return [...this.collectibles];
  }

  async fetchEnergy(): Promise<EnergyMarketDatum[]> {
    return [...this.energy];
  }

  async fetchDemand(): Promise<DemandForecastDatum[]> {
    return [...this.demand];
  }

  async fetchRegulation(): Promise<RegulatoryDatum[]> {
    return [...this.regulation];
  }
}
