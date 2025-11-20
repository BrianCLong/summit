/**
 * Federated Learning Types and Interfaces
 */

export interface ModelWeights {
  [layerName: string]: number[] | number[][];
}

export interface ClientUpdate {
  clientId: string;
  roundNumber: number;
  weights: ModelWeights;
  numSamples: number;
  loss: number;
  accuracy?: number;
  timestamp: Date;
  signature?: string;
}

export interface FederatedRound {
  roundNumber: number;
  selectedClients: string[];
  globalWeights: ModelWeights;
  aggregatedWeights?: ModelWeights;
  metrics: RoundMetrics;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface RoundMetrics {
  totalClients: number;
  participatingClients: number;
  averageLoss: number;
  averageAccuracy?: number;
  aggregationTime: number;
  communicationCost: number;
}

export interface FederatedConfig {
  minClientsPerRound: number;
  maxClientsPerRound: number;
  clientFraction: number; // Fraction of clients to sample
  numRounds: number;
  learningRate: number;
  batchSize: number;
  localEpochs: number;
  aggregationStrategy: 'fedavg' | 'fedprox' | 'fedopt' | 'scaffold';
  secureAggregation: boolean;
  differentialPrivacy: boolean;
  privacyBudget?: {
    epsilon: number;
    delta: number;
  };
  convergenceThreshold?: number;
  timeout: number; // milliseconds
}

export interface ClientConfig {
  clientId: string;
  dataSize: number;
  computeCapability: number;
  bandwidth: number;
  availability: number; // 0-1
  isReliable: boolean;
}

export interface AggregationResult {
  aggregatedWeights: ModelWeights;
  participatingClients: string[];
  totalSamples: number;
  metrics: RoundMetrics;
}

export interface SecureAggregationConfig {
  threshold: number; // Minimum clients needed
  secretShares: number;
  useHomomorphicEncryption: boolean;
  verifyIntegrity: boolean;
}

export interface ClientSelectionStrategy {
  strategy: 'random' | 'importance' | 'fairness' | 'clustered';
  parameters?: Record<string, any>;
}

export interface FederatedSession {
  sessionId: string;
  config: FederatedConfig;
  currentRound: number;
  rounds: FederatedRound[];
  clients: ClientConfig[];
  status: 'initialized' | 'running' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelCompression {
  method: 'quantization' | 'pruning' | 'sparsification' | 'sketching';
  compressionRatio: number;
  parameters?: Record<string, any>;
}

export interface AsynchronousConfig {
  enabled: boolean;
  staleness: number; // Max rounds a client can be behind
  bufferSize: number;
  mixingHyperparameter: number; // For asynchronous federated optimization
}

export interface HierarchicalConfig {
  enabled: boolean;
  levels: number;
  aggregatorsPerLevel: number[];
  crossSiloAggregation: boolean;
}

export interface ByzantineDefense {
  enabled: boolean;
  strategy: 'krum' | 'median' | 'trimmed_mean' | 'bulyan';
  faultyClientsPercentage: number;
}
