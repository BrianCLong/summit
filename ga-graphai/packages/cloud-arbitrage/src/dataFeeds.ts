import type {
  CompositeMarketSnapshot,
  DemandForecastDatum,
  EnergyMarketDatum,
  FinancialMarketDatum,
  RegulatoryDatum,
} from './types.js';

export interface DataFeed {
  fetchFinancial(): Promise<FinancialMarketDatum[]>;
  fetchEnergy(): Promise<EnergyMarketDatum[]>;
  fetchDemand(): Promise<DemandForecastDatum[]>;
  fetchRegulation(): Promise<RegulatoryDatum[]>;
}

export class CompositeDataFeed {
  constructor(private readonly sources: DataFeed[]) {}

  async fetchSnapshot(): Promise<CompositeMarketSnapshot> {
    const [financial, energy, demand, regulation] = await Promise.all([
      this.collect((source) => source.fetchFinancial()),
      this.collect((source) => source.fetchEnergy()),
      this.collect((source) => source.fetchDemand()),
      this.collect((source) => source.fetchRegulation()),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      financial,
      energy,
      demand,
      regulation,
    };
  }

  private async collect<T>(
    fetcher: (source: DataFeed) => Promise<T[]>,
  ): Promise<T[]> {
    const results = await Promise.all(
      this.sources.map((source) => fetcher(source)),
    );
    return results.flat();
  }
}

export class InMemoryDataFeed implements DataFeed {
  constructor(
    private readonly financial: FinancialMarketDatum[],
    private readonly energy: EnergyMarketDatum[],
    private readonly demand: DemandForecastDatum[],
    private readonly regulation: RegulatoryDatum[],
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
}
