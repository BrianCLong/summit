import type {
  CollectibleMarketDatum,
  CompositeMarketSnapshot,
  ConsumerMarketDatum,
  DemandForecastDatum,
  EnergyMarketDatum,
  FinancialMarketDatum,
  HedgeInstrumentDatum,
  PredictionMarketDatum,
  RegulatoryDatum
} from './types.js';

export interface DataFeed {
  fetchFinancial(): Promise<FinancialMarketDatum[]>;
  fetchEnergy(): Promise<EnergyMarketDatum[]>;
  fetchDemand(): Promise<DemandForecastDatum[]>;
  fetchRegulation(): Promise<RegulatoryDatum[]>;
  fetchConsumer(): Promise<ConsumerMarketDatum[]>;
  fetchCollectibles(): Promise<CollectibleMarketDatum[]>;
  fetchPrediction(): Promise<PredictionMarketDatum[]>;
  fetchHedges(): Promise<HedgeInstrumentDatum[]>;
}

export class CompositeDataFeed {
  constructor(private readonly sources: DataFeed[]) {}

  async fetchSnapshot(): Promise<CompositeMarketSnapshot> {
    const [financial, energy, demand, regulation, consumer, collectibles, prediction, hedges] =
      await Promise.all([
        this.collect(source => source.fetchFinancial()),
        this.collect(source => source.fetchEnergy()),
        this.collect(source => source.fetchDemand()),
        this.collect(source => source.fetchRegulation()),
        this.collect(source => source.fetchConsumer()),
        this.collect(source => source.fetchCollectibles()),
        this.collect(source => source.fetchPrediction()),
        this.collect(source => source.fetchHedges())
      ]);

    return {
      generatedAt: new Date().toISOString(),
      financial,
      energy,
      demand,
      regulation,
      consumer,
      collectibles,
      prediction,
      hedges
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
    private readonly demand: DemandForecastDatum[],
    private readonly regulation: RegulatoryDatum[],
    private readonly consumer: ConsumerMarketDatum[] = [],
    private readonly collectibles: CollectibleMarketDatum[] = [],
    private readonly prediction: PredictionMarketDatum[] = [],
    private readonly hedges: HedgeInstrumentDatum[] = []
  ) {}

  async fetchFinancial(): Promise<FinancialMarketDatum[]> {
    return [...this.financial];
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

  async fetchConsumer(): Promise<ConsumerMarketDatum[]> {
    return [...this.consumer];
  }

  async fetchCollectibles(): Promise<CollectibleMarketDatum[]> {
    return [...this.collectibles];
  }

  async fetchPrediction(): Promise<PredictionMarketDatum[]> {
    return [...this.prediction];
  }

  async fetchHedges(): Promise<HedgeInstrumentDatum[]> {
    return [...this.hedges];
  }
}
