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

export interface ConsumerMarketplaceDatum {
  marketplace: string;
  region: string;
  category: string;
  sku: string;
  averagePrice: number;
  priceChange24hPct: number;
  volume24h: number;
  sentimentScore: number;
  timestamp: string;
}

export interface CollectibleMarketDatum {
  venue: string;
  region: string;
  collection: string;
  assetId: string;
  scarcityIndex: number;
  clearingPrice: number;
  clearingPriceChange24hPct: number;
  bidCoverageRatio: number;
  auctionSentiment: number;
  timestamp: string;
}

export interface PredictionMarketDatum {
  market: string;
  region: string;
  eventId: string;
  contract: string;
  impliedProbability: number;
  liquidityScore: number;
  volume24h: number;
  priceChange24hPct: number;
  timestamp: string;
}

export interface CryptoMarketDatum {
  exchange: string;
  region: string;
  pair: string;
  price: number;
  priceChange1hPct: number;
  fundingRate: number;
  openInterestChangePct: number;
  volume24h: number;
  timestamp: string;
}

export interface ForexMarketDatum {
  venue: string;
  region: string;
  pair: string;
  spotRate: number;
  rateChange1hPct: number;
  spreadPips: number;
  volatilityScore: number;
  timestamp: string;
}

export interface DerivativesFlowDatum {
  venue: string;
  region: string;
  instrument: string;
  optionType: 'call' | 'put' | 'binary' | 'structured';
  notionalUsd: number;
  skewScore: number;
  ivPercentile: number;
  flowBalance: number;
  timestamp: string;
}

export interface CommodityMarketDatum {
  venue: string;
  region: string;
  commodity: string;
  spotPrice: number;
  storageCostPct: number;
  backwardationPct: number;
  supplyStressScore: number;
  timestamp: string;
}

export interface SportsPredictionDatum {
  book: string;
  region: string;
  eventId: string;
  marketType: string;
  impliedEdgePct: number;
  liquidityScore: number;
  priceChange1hPct: number;
  timestamp: string;
}

export interface ExoticOpportunityDatum {
  venue: string;
  region: string;
  assetType: string;
  opportunityLabel: string;
  expectedValuePct: number;
  scarcityScore: number;
  regulatoryRiskScore: number;
  timestamp: string;
}

export interface MetaSignalInsight {
  region: string;
  leadingIndicator: string;
  targetSignal: string;
  leadTimeSeconds: number;
  confidence: number;
  expectedImpactScore: number;
  cascadeDepth: number;
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
  energy: EnergyMarketDatum[];
  consumer: ConsumerMarketplaceDatum[];
  collectibles: CollectibleMarketDatum[];
  prediction: PredictionMarketDatum[];
  crypto: CryptoMarketDatum[];
  forex: ForexMarketDatum[];
  derivatives: DerivativesFlowDatum[];
  commodities: CommodityMarketDatum[];
  sports: SportsPredictionDatum[];
  exotic: ExoticOpportunityDatum[];
  metaSignals: MetaSignalInsight[];
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
  consumerScore: number;
  collectibleScore: number;
  predictionScore: number;
  cryptoScore: number;
  forexScore: number;
  derivativesScore: number;
  commodityScore: number;
  sportsScore: number;
  exoticScore: number;
  metaSignalScore: number;
  cascadeScore: number;
  frontRunConfidence: number;
  crossMarketScore: number;
  arbitrageSignalStrength: number;
  hedgeSignalStrength: number;
  totalScore: number;
}

export interface StrategySummary {
  strategy: string;
  provider: string;
  region: string;
  blendedUnitPrice: number;
  estimatedSavings: number;
  consumerScore: number;
  collectibleScore: number;
  predictionScore: number;
  cryptoScore: number;
  forexScore: number;
  derivativesScore: number;
  commodityScore: number;
  sportsScore: number;
  exoticScore: number;
  metaSignalScore: number;
  cascadeScore: number;
  frontRunConfidence: number;
  crossMarketScore: number;
  arbitrageStrength: number;
  hedgeStrength: number;
  confidence: number;
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
