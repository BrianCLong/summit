import type {
  CollectibleMarketDatum,
  CommodityMarketDatum,
  CompositeMarketSnapshot,
  ConsumerMarketplaceDatum,
  CryptoMarketDatum,
  DemandForecastDatum,
  DerivativesFlowDatum,
  EnergyMarketDatum,
  ExoticOpportunityDatum,
  FinancialMarketDatum,
  ForexMarketDatum,
  MetaSignalInsight,
  PredictionMarketDatum,
  RegulatoryDatum,
  SportsPredictionDatum
} from './types.js';

export interface DataFeed {
  fetchFinancial(): Promise<FinancialMarketDatum[]>;
  fetchEnergy(): Promise<EnergyMarketDatum[]>;
  fetchConsumer(): Promise<ConsumerMarketplaceDatum[]>;
  fetchCollectibles(): Promise<CollectibleMarketDatum[]>;
  fetchPrediction(): Promise<PredictionMarketDatum[]>;
  fetchCrypto(): Promise<CryptoMarketDatum[]>;
  fetchForex(): Promise<ForexMarketDatum[]>;
  fetchDerivatives(): Promise<DerivativesFlowDatum[]>;
  fetchCommodities(): Promise<CommodityMarketDatum[]>;
  fetchSports(): Promise<SportsPredictionDatum[]>;
  fetchExotic(): Promise<ExoticOpportunityDatum[]>;
  fetchMetaSignals(): Promise<MetaSignalInsight[]>;
  fetchDemand(): Promise<DemandForecastDatum[]>;
  fetchRegulation(): Promise<RegulatoryDatum[]>;
}

export class CompositeDataFeed {
  constructor(private readonly sources: DataFeed[]) {}

  async fetchSnapshot(): Promise<CompositeMarketSnapshot> {
    const [
      financial,
      energy,
      consumer,
      collectibles,
      prediction,
      crypto,
      forex,
      derivatives,
      commodities,
      sports,
      exotic,
      metaSignals,
      demand,
      regulation
    ] = await Promise.all([
      this.collect(source => source.fetchFinancial()),
      this.collect(source => source.fetchEnergy()),
      this.collect(source => source.fetchConsumer()),
      this.collect(source => source.fetchCollectibles()),
      this.collect(source => source.fetchPrediction()),
      this.collect(source => source.fetchCrypto()),
      this.collect(source => source.fetchForex()),
      this.collect(source => source.fetchDerivatives()),
      this.collect(source => source.fetchCommodities()),
      this.collect(source => source.fetchSports()),
      this.collect(source => source.fetchExotic()),
      this.collect(source => source.fetchMetaSignals()),
      this.collect(source => source.fetchDemand()),
      this.collect(source => source.fetchRegulation())
    ]);

    return {
      generatedAt: new Date().toISOString(),
      financial,
      energy,
      consumer,
      collectibles,
      prediction,
      crypto,
      forex,
      derivatives,
      commodities,
      sports,
      exotic,
      metaSignals,
      demand,
      regulation
    };
  }

  private async collect<T>(fetcher: (source: DataFeed) => Promise<T[]>): Promise<T[]> {
    const results = await Promise.all(this.sources.map(source => fetcher(source)));
    return results.flat();
  }
}

export class InMemoryDataFeed implements DataFeed {
  constructor(
    private readonly financial: FinancialMarketDatum[],
    private readonly energy: EnergyMarketDatum[],
    private readonly consumer: ConsumerMarketplaceDatum[],
    private readonly collectibles: CollectibleMarketDatum[],
    private readonly prediction: PredictionMarketDatum[],
    private readonly crypto: CryptoMarketDatum[],
    private readonly forex: ForexMarketDatum[],
    private readonly derivatives: DerivativesFlowDatum[],
    private readonly commodities: CommodityMarketDatum[],
    private readonly sports: SportsPredictionDatum[],
    private readonly exotic: ExoticOpportunityDatum[],
    private readonly metaSignals: MetaSignalInsight[],
    private readonly demand: DemandForecastDatum[],
    private readonly regulation: RegulatoryDatum[]
  ) {}

  async fetchFinancial(): Promise<FinancialMarketDatum[]> {
    return [...this.financial];
  }

  async fetchEnergy(): Promise<EnergyMarketDatum[]> {
    return [...this.energy];
  }

  async fetchConsumer(): Promise<ConsumerMarketplaceDatum[]> {
    return [...this.consumer];
  }

  async fetchCollectibles(): Promise<CollectibleMarketDatum[]> {
    return [...this.collectibles];
  }

  async fetchPrediction(): Promise<PredictionMarketDatum[]> {
    return [...this.prediction];
  }

  async fetchCrypto(): Promise<CryptoMarketDatum[]> {
    return [...this.crypto];
  }

  async fetchForex(): Promise<ForexMarketDatum[]> {
    return [...this.forex];
  }

  async fetchDerivatives(): Promise<DerivativesFlowDatum[]> {
    return [...this.derivatives];
  }

  async fetchCommodities(): Promise<CommodityMarketDatum[]> {
    return [...this.commodities];
  }

  async fetchSports(): Promise<SportsPredictionDatum[]> {
    return [...this.sports];
  }

  async fetchExotic(): Promise<ExoticOpportunityDatum[]> {
    return [...this.exotic];
  }

  async fetchMetaSignals(): Promise<MetaSignalInsight[]> {
    return [...this.metaSignals];
  }

  async fetchDemand(): Promise<DemandForecastDatum[]> {
    return [...this.demand];
  }

  async fetchRegulation(): Promise<RegulatoryDatum[]> {
    return [...this.regulation];
  }
}
