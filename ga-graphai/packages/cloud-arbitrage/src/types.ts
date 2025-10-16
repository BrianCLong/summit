export type ResourceClass = 'compute' | 'storage' | 'network';

export interface ProviderRegionKey {
  provider: string;
  region: string;
}

export interface FinancialMarketDatum {
  provider: string;
  region: string;
  spotPricePerUnit: number;
  reservedPricePerUnit: number;
  currency: string;
  timestamp: string;
}

export interface EnergyMarketDatum {
  region: string;
  carbonIntensityGramsPerKwh: number;
  pricePerKwh: number;
  timestamp: string;
}

export interface DemandForecastDatum {
  provider: string;
  region: string;
  resource: ResourceClass;
  predictedUtilization: number;
  confidence: number;
  timestamp: string;
}

export interface RegulatoryDatum {
  provider: string;
  region: string;
  incentivePerUnit: number;
  penaltyPerUnit: number;
  notes: string;
  effectiveDate: string;
}

export interface ConsumerMarketDatum {
  marketplace: string;
  region: string;
  category: string;
  sku: string;
  averagePrice: number;
  priceChange24h: number;
  volume24h: number;
  arbitrageSpread: number;
  demandSurgeProbability: number;
  sentimentScore: number;
  timestamp: string;
}

export interface CollectibleMarketDatum {
  platform: string;
  region: string;
  assetId: string;
  assetType: string;
  grade?: string;
  medianPrice: number;
  priceChange7d: number;
  scarcityIndex: number;
  liquidityScore: number;
  sentimentScore: number;
  timestamp: string;
}

export interface PredictionMarketDatum {
  market: string;
  contractId: string;
  region?: string;
  category: string;
  outcome: string;
  probability: number;
  impliedOddsChange24h: number;
  liquidity: number;
  crowdMomentum: number;
  linkedAssets?: string[];
  timestamp: string;
}

export interface HedgeInstrumentDatum {
  provider: string;
  region: string;
  instrumentType: 'option' | 'future' | 'swap' | 'binary' | 'structured-note';
  symbol: string;
  strike: number;
  expiry: string;
  premium: number;
  delta: number;
  referenceMarket: string;
  confidence: number;
}

export interface CrossMarketAction {
  domain: 'consumer' | 'collectible' | 'prediction' | 'hedge';
  description: string;
  expectedValue: number;
  confidence: number;
  linkedAssets: string[];
}

export interface CompositeMarketSnapshot {
  generatedAt: string;
  financial: FinancialMarketDatum[];
  energy: EnergyMarketDatum[];
  demand: DemandForecastDatum[];
  regulation: RegulatoryDatum[];
  consumer: ConsumerMarketDatum[];
  collectibles: CollectibleMarketDatum[];
  prediction: PredictionMarketDatum[];
  hedges: HedgeInstrumentDatum[];
}

export interface StrategyInput {
  snapshot: CompositeMarketSnapshot;
  workloadProfile: WorkloadProfile;
}

export interface WorkloadProfile {
  id: string;
  description: string;
  resourceBreakdown: Record<ResourceClass, number>;
  availabilityTier: 'mission-critical' | 'standard' | 'flex';
  burstable: boolean;
  sustainabilityWeight: number;
}

export interface StrategyRecommendation {
  strategy: string;
  provider: string;
  region: string;
  resource: ResourceClass;
  expectedUnitPrice: number;
  expectedPerformanceScore: number;
  sustainabilityScore: number;
  regulatoryScore: number;
  totalScore: number;
  hedgeEffectiveness: number;
  crossMarketActions: CrossMarketAction[];
}

export interface StrategySummary {
  strategy: string;
  provider: string;
  region: string;
  blendedUnitPrice: number;
  estimatedSavings: number;
  confidence: number;
  hedgeEffectiveness: number;
  crossMarketActionCount: number;
}

export interface HeadToHeadResult {
  baselineTool: 'aws-compute-optimizer' | 'spot-io' | 'google-recommender';
  workloadId: string;
  agentSummary: StrategySummary;
  baselineSavings: number;
  agentSavings: number;
  netBenefit: number;
}

export interface EvaluationReport {
  generatedAt: string;
  results: HeadToHeadResult[];
  aggregateNetBenefit: number;
}
