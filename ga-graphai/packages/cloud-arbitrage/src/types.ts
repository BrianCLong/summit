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

export interface ConsumerMarketDatum {
  marketplace: string;
  region: string;
  category: string;
  averagePrice: number;
  volume24h: number;
  priceChangePercent: number;
  demandScore: number;
  sentimentScore: number;
  timestamp: string;
}

export interface CollectibleSignalDatum {
  platform: string;
  region: string;
  collection: string;
  floorPrice: number;
  currency: string;
  scarcityScore: number;
  auctionClearRate: number;
  sentimentScore: number;
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

export interface CompositeMarketSnapshot {
  generatedAt: string;
  financial: FinancialMarketDatum[];
  consumer: ConsumerMarketDatum[];
  collectibles: CollectibleSignalDatum[];
  energy: EnergyMarketDatum[];
  demand: DemandForecastDatum[];
  regulation: RegulatoryDatum[];
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
  consumerSignalScore: number;
  collectiblesSignalScore: number;
  arbitrageOpportunityScore: number;
  hedgeScore: number;
  totalScore: number;
}

export interface StrategySummary {
  strategy: string;
  provider: string;
  region: string;
  blendedUnitPrice: number;
  estimatedSavings: number;
  confidence: number;
  consumerSignalScore: number;
  collectiblesSignalScore: number;
  arbitrageOpportunityScore: number;
  hedgeScore: number;
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
