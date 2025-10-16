/**
 * Blockchain Address Clustering Engine
 * Sprint 28C: Advanced on-chain analytics for financial crime investigation
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface BlockchainAddress {
  id: string;
  address: string;
  blockchain:
    | 'bitcoin'
    | 'ethereum'
    | 'polygon'
    | 'arbitrum'
    | 'optimism'
    | 'bsc';
  addressType:
    | 'p2pkh'
    | 'p2sh'
    | 'p2wpkh'
    | 'p2wsh'
    | 'eoa'
    | 'contract'
    | 'multisig';
  metadata: {
    firstSeen: Date;
    lastSeen: Date;
    transactionCount: number;
    totalReceived: number;
    totalSent: number;
    currentBalance: number;
    labels: Array<{
      source: string;
      label: string;
      confidence: number;
      assignedAt: Date;
    }>;
  };
  riskIndicators: {
    sanctionsHit: boolean;
    darknetMarket: boolean;
    mixer: boolean;
    exchange: boolean;
    gambling: boolean;
    ransomware: boolean;
    phishing: boolean;
    highRiskJurisdiction: boolean;
  };
  analysis: {
    behaviorPattern:
      | 'normal'
      | 'mixer'
      | 'exchange'
      | 'merchant'
      | 'mining'
      | 'gambling'
      | 'suspicious';
    privacyScore: number;
    activityScore: number;
    riskScore: number;
  };
}

export interface AddressCluster {
  id: string;
  name?: string;
  addresses: string[];
  blockchain: string;
  clusterType:
    | 'exchange'
    | 'service'
    | 'individual'
    | 'entity'
    | 'mixer'
    | 'bridge'
    | 'unknown';
  confidence: number;
  heuristics: Array<{
    type:
      | 'common_input'
      | 'change_address'
      | 'temporal_clustering'
      | 'behavioral_pattern'
      | 'external_label';
    strength: number;
    evidence: Array<{
      txHash: string;
      description: string;
      confidence: number;
    }>;
  }>;
  entity?: {
    name: string;
    type: 'exchange' | 'service' | 'institution' | 'individual';
    jurisdiction?: string;
    compliance?: {
      kyc: boolean;
      aml: boolean;
      licensing: string[];
    };
  };
  statistics: {
    totalTransactions: number;
    totalVolume: number;
    uniqueCounterparties: number;
    averageTransactionSize: number;
    medianTransactionSize: number;
    timespan: { start: Date; end: Date };
  };
  tags: Array<{
    category: 'service' | 'risk' | 'compliance' | 'behavioral';
    tag: string;
    confidence: number;
    source: string;
  }>;
  lastUpdated: Date;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  hash: string;
  blockchain: string;
  blockHeight: number;
  timestamp: Date;
  inputs: Array<{
    address: string;
    value: number;
    utxoHash?: string;
    utxoIndex?: number;
  }>;
  outputs: Array<{
    address: string;
    value: number;
    isChange?: boolean;
  }>;
  fee: number;
  size: number;
  metadata: {
    confirmed: boolean;
    confirmations: number;
    gasUsed?: number;
    gasPrice?: number;
    contractCalls?: Array<{
      contract: string;
      method: string;
      value: number;
    }>;
  };
  analysis: {
    mixing: boolean;
    peeling: boolean;
    consolidation: boolean;
    splitting: boolean;
    roundAmount: boolean;
    privacyEnhancing: boolean;
    suspiciousPatterns: string[];
  };
}

export interface ClusteringJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  blockchain: string;
  scope: {
    addresses?: string[];
    transactions?: string[];
    dateRange?: { start: Date; end: Date };
    maxHops?: number;
  };
  config: {
    heuristics: Array<{
      type: string;
      enabled: boolean;
      weight: number;
      threshold: number;
    }>;
    minClusterSize: number;
    confidenceThreshold: number;
    maxIterations: number;
  };
  progress: {
    phase:
      | 'initialization'
      | 'graph_building'
      | 'clustering'
      | 'validation'
      | 'finalization';
    addressesProcessed: number;
    transactionsProcessed: number;
    clustersFound: number;
    estimatedCompletion?: Date;
  };
  results?: {
    clustersCreated: string[];
    addressesClustered: number;
    totalClusters: number;
    averageClusterSize: number;
    maxClusterSize: number;
    confidenceDistribution: Record<string, number>;
  };
  timing: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
  };
  performance: {
    memoryUsed: number;
    cpuTime: number;
    networkRequests: number;
  };
}

export interface FlowAnalysis {
  id: string;
  sourceAddress: string;
  targetAddress?: string;
  blockchain: string;
  maxHops: number;
  maxAmount?: number;
  timeWindow?: { start: Date; end: Date };
  paths: Array<{
    id: string;
    hops: Array<{
      fromAddress: string;
      toAddress: string;
      transaction: string;
      amount: number;
      timestamp: Date;
    }>;
    totalAmount: number;
    totalTime: number;
    riskScore: number;
    mixingEvents: number;
    suspiciousHops: Array<{
      hopIndex: number;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }>;
  summary: {
    totalPaths: number;
    totalAmount: number;
    averageHops: number;
    riskDistribution: Record<string, number>;
    mixingDetected: boolean;
    sanctionsExposure: boolean;
  };
  createdAt: Date;
}

export class AddressClusterer extends EventEmitter {
  private addresses = new Map<string, BlockchainAddress>();
  private clusters = new Map<string, AddressCluster>();
  private transactions = new Map<string, Transaction>();
  private clusteringJobs = new Map<string, ClusteringJob>();
  private flowAnalyses = new Map<string, FlowAnalysis>();

  // Graph structure for clustering
  private addressGraph = new Map<string, Set<string>>();
  private transactionGraph = new Map<
    string,
    Array<{ to: string; weight: number; evidence: any }>
  >();

  constructor() {
    super();
  }

  /**
   * Ingest blockchain address with metadata
   */
  async ingestAddress(
    address: Omit<BlockchainAddress, 'id' | 'analysis'>,
  ): Promise<BlockchainAddress> {
    const fullAddress: BlockchainAddress = {
      ...address,
      id: crypto.randomUUID(),
      analysis: {
        behaviorPattern: await this.analyzeBehaviorPattern(address),
        privacyScore: await this.calculatePrivacyScore(address),
        activityScore: await this.calculateActivityScore(address),
        riskScore: await this.calculateRiskScore(address),
      },
    };

    this.addresses.set(fullAddress.address, fullAddress);
    this.emit('address_ingested', fullAddress);

    return fullAddress;
  }

  /**
   * Ingest transaction for clustering analysis
   */
  async ingestTransaction(
    transaction: Omit<Transaction, 'id' | 'analysis'>,
  ): Promise<Transaction> {
    const fullTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      analysis: await this.analyzeTransaction(transaction),
    };

    this.transactions.set(fullTransaction.hash, fullTransaction);

    // Update address graph
    await this.updateAddressGraph(fullTransaction);

    this.emit('transaction_ingested', fullTransaction);

    return fullTransaction;
  }

  /**
   * Execute clustering algorithm with multiple heuristics
   */
  async executeClusteringJob(
    blockchain: string,
    scope: ClusteringJob['scope'],
    config: Partial<ClusteringJob['config']> = {},
  ): Promise<ClusteringJob> {
    const job: ClusteringJob = {
      id: crypto.randomUUID(),
      status: 'pending',
      blockchain,
      scope,
      config: {
        heuristics: [
          { type: 'common_input', enabled: true, weight: 0.8, threshold: 0.7 },
          {
            type: 'change_address',
            enabled: true,
            weight: 0.7,
            threshold: 0.6,
          },
          {
            type: 'temporal_clustering',
            enabled: true,
            weight: 0.5,
            threshold: 0.5,
          },
          {
            type: 'behavioral_pattern',
            enabled: true,
            weight: 0.6,
            threshold: 0.6,
          },
        ],
        minClusterSize: 2,
        confidenceThreshold: 0.7,
        maxIterations: 100,
        ...config,
      },
      progress: {
        phase: 'initialization',
        addressesProcessed: 0,
        transactionsProcessed: 0,
        clustersFound: 0,
      },
      timing: {
        startTime: new Date(),
      },
      performance: {
        memoryUsed: 0,
        cpuTime: 0,
        networkRequests: 0,
      },
    };

    this.clusteringJobs.set(job.id, job);

    // Execute clustering asynchronously
    this.executeClusteringAsync(job).catch((error) => {
      job.status = 'failed';
      job.timing.endTime = new Date();
      this.clusteringJobs.set(job.id, job);
      this.emit('clustering_failed', { jobId: job.id, error: error.message });
    });

    return job;
  }

  /**
   * Perform flow analysis between addresses
   */
  async analyzeFlow(
    sourceAddress: string,
    targetAddress: string | undefined,
    maxHops: number = 4,
    maxAmount?: number,
    timeWindow?: { start: Date; end: Date },
  ): Promise<FlowAnalysis> {
    const analysis: FlowAnalysis = {
      id: crypto.randomUUID(),
      sourceAddress,
      targetAddress,
      blockchain: this.getAddressBlockchain(sourceAddress),
      maxHops,
      maxAmount,
      timeWindow,
      paths: [],
      summary: {
        totalPaths: 0,
        totalAmount: 0,
        averageHops: 0,
        riskDistribution: {},
        mixingDetected: false,
        sanctionsExposure: false,
      },
      createdAt: new Date(),
    };

    // Find paths using BFS with constraints
    const paths = await this.findPaths(
      sourceAddress,
      targetAddress,
      maxHops,
      maxAmount,
      timeWindow,
    );

    analysis.paths = paths.map((path) => ({
      id: crypto.randomUUID(),
      hops: path.hops,
      totalAmount: path.hops.reduce((sum, hop) => sum + hop.amount, 0),
      totalTime:
        path.hops.length > 0
          ? path.hops[path.hops.length - 1].timestamp.getTime() -
            path.hops[0].timestamp.getTime()
          : 0,
      riskScore: await this.calculatePathRiskScore(path.hops),
      mixingEvents: await this.countMixingEvents(path.hops),
      suspiciousHops: await this.identifySuspiciousHops(path.hops),
    }));

    // Calculate summary statistics
    analysis.summary = {
      totalPaths: analysis.paths.length,
      totalAmount: analysis.paths.reduce(
        (sum, path) => sum + path.totalAmount,
        0,
      ),
      averageHops:
        analysis.paths.length > 0
          ? analysis.paths.reduce((sum, path) => sum + path.hops.length, 0) /
            analysis.paths.length
          : 0,
      riskDistribution: this.calculateRiskDistribution(analysis.paths),
      mixingDetected: analysis.paths.some((path) => path.mixingEvents > 0),
      sanctionsExposure: await this.checkSanctionsExposure(analysis.paths),
    };

    this.flowAnalyses.set(analysis.id, analysis);
    this.emit('flow_analysis_completed', analysis);

    return analysis;
  }

  /**
   * Detect mixer usage patterns
   */
  async detectMixerUsage(
    address: string,
    timeWindow?: { start: Date; end: Date },
  ): Promise<{
    mixerEvents: Array<{
      mixer: string;
      mixerType: 'centralized' | 'decentralized' | 'coin_join' | 'tumbler';
      inputAmount: number;
      outputAmount: number;
      timestamp: Date;
      confidence: number;
      technique: string;
    }>;
    totalMixed: number;
    mixingFrequency: number;
    suspicionLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const mixerEvents: Array<{
      mixer: string;
      mixerType: 'centralized' | 'decentralized' | 'coin_join' | 'tumbler';
      inputAmount: number;
      outputAmount: number;
      timestamp: Date;
      confidence: number;
      technique: string;
    }> = [];

    // Get transactions for the address
    const addressTransactions = Array.from(this.transactions.values()).filter(
      (tx) => {
        const hasAddress =
          tx.inputs.some((inp) => inp.address === address) ||
          tx.outputs.some((out) => out.address === address);

        if (!hasAddress) return false;

        if (timeWindow) {
          return (
            tx.timestamp >= timeWindow.start && tx.timestamp <= timeWindow.end
          );
        }

        return true;
      },
    );

    // Analyze each transaction for mixer patterns
    for (const tx of addressTransactions) {
      const mixerIndicators = await this.analyzeMixerIndicators(tx, address);

      if (mixerIndicators.confidence > 0.6) {
        mixerEvents.push({
          mixer: mixerIndicators.mixer,
          mixerType: mixerIndicators.type,
          inputAmount: mixerIndicators.inputAmount,
          outputAmount: mixerIndicators.outputAmount,
          timestamp: tx.timestamp,
          confidence: mixerIndicators.confidence,
          technique: mixerIndicators.technique,
        });
      }
    }

    const totalMixed = mixerEvents.reduce(
      (sum, event) => sum + event.inputAmount,
      0,
    );
    const timeSpan = timeWindow
      ? timeWindow.end.getTime() - timeWindow.start.getTime()
      : addressTransactions.length > 0
        ? Math.max(...addressTransactions.map((tx) => tx.timestamp.getTime())) -
          Math.min(...addressTransactions.map((tx) => tx.timestamp.getTime()))
        : 0;

    const mixingFrequency =
      timeSpan > 0
        ? mixerEvents.length / (timeSpan / (1000 * 60 * 60 * 24))
        : 0;

    let suspicionLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (mixingFrequency > 5) suspicionLevel = 'critical';
    else if (mixingFrequency > 2) suspicionLevel = 'high';
    else if (mixingFrequency > 0.5) suspicionLevel = 'medium';

    return {
      mixerEvents,
      totalMixed,
      mixingFrequency,
      suspicionLevel,
    };
  }

  /**
   * Get cluster by address
   */
  getClusterByAddress(address: string): AddressCluster | null {
    return (
      Array.from(this.clusters.values()).find((cluster) =>
        cluster.addresses.includes(address),
      ) || null
    );
  }

  /**
   * Get clustering statistics
   */
  getClusteringStatistics(): {
    totalAddresses: number;
    totalClusters: number;
    clusteredAddresses: number;
    averageClusterSize: number;
    largestCluster: number;
    clusteringRatio: number;
    confidenceDistribution: Record<string, number>;
  } {
    const totalAddresses = this.addresses.size;
    const totalClusters = this.clusters.size;

    const clusteredAddresses = Array.from(this.clusters.values()).reduce(
      (sum, cluster) => sum + cluster.addresses.length,
      0,
    );

    const clusterSizes = Array.from(this.clusters.values()).map(
      (c) => c.addresses.length,
    );
    const averageClusterSize =
      clusterSizes.length > 0
        ? clusterSizes.reduce((a, b) => a + b, 0) / clusterSizes.length
        : 0;

    const largestCluster =
      clusterSizes.length > 0 ? Math.max(...clusterSizes) : 0;
    const clusteringRatio =
      totalAddresses > 0 ? clusteredAddresses / totalAddresses : 0;

    const confidences = Array.from(this.clusters.values()).map(
      (c) => c.confidence,
    );
    const confidenceDistribution = this.calculateDistribution(confidences, 0.1);

    return {
      totalAddresses,
      totalClusters,
      clusteredAddresses,
      averageClusterSize,
      largestCluster,
      clusteringRatio,
      confidenceDistribution,
    };
  }

  private async executeClusteringAsync(job: ClusteringJob): Promise<void> {
    const startTime = Date.now();

    try {
      job.status = 'running';

      // Phase 1: Initialization
      job.progress.phase = 'initialization';
      const addresses = await this.getScopedAddresses(
        job.scope,
        job.blockchain,
      );
      const transactions = await this.getScopedTransactions(
        job.scope,
        job.blockchain,
      );

      // Phase 2: Graph building
      job.progress.phase = 'graph_building';
      await this.buildClusteringGraph(addresses, transactions, job);

      // Phase 3: Clustering
      job.progress.phase = 'clustering';
      const clusters = await this.performClustering(job);

      // Phase 4: Validation
      job.progress.phase = 'validation';
      const validatedClusters = await this.validateClusters(clusters, job);

      // Phase 5: Finalization
      job.progress.phase = 'finalization';
      await this.finalizeClusters(validatedClusters, job);

      job.status = 'completed';
      job.timing.endTime = new Date();
      job.timing.duration = Date.now() - startTime;

      job.results = {
        clustersCreated: validatedClusters.map((c) => c.id),
        addressesClustered: validatedClusters.reduce(
          (sum, c) => sum + c.addresses.length,
          0,
        ),
        totalClusters: validatedClusters.length,
        averageClusterSize:
          validatedClusters.length > 0
            ? validatedClusters.reduce(
                (sum, c) => sum + c.addresses.length,
                0,
              ) / validatedClusters.length
            : 0,
        maxClusterSize:
          validatedClusters.length > 0
            ? Math.max(...validatedClusters.map((c) => c.addresses.length))
            : 0,
        confidenceDistribution: this.calculateDistribution(
          validatedClusters.map((c) => c.confidence),
          0.1,
        ),
      };

      this.clusteringJobs.set(job.id, job);
      this.emit('clustering_completed', job);
    } catch (error) {
      job.status = 'failed';
      job.timing.endTime = new Date();
      this.clusteringJobs.set(job.id, job);
      throw error;
    }
  }

  private async getScopedAddresses(
    scope: ClusteringJob['scope'],
    blockchain: string,
  ): Promise<BlockchainAddress[]> {
    let addresses = Array.from(this.addresses.values()).filter(
      (addr) => addr.blockchain === blockchain,
    );

    if (scope.addresses) {
      addresses = addresses.filter((addr) =>
        scope.addresses!.includes(addr.address),
      );
    }

    if (scope.dateRange) {
      addresses = addresses.filter(
        (addr) =>
          addr.metadata.firstSeen >= scope.dateRange!.start &&
          addr.metadata.lastSeen <= scope.dateRange!.end,
      );
    }

    return addresses;
  }

  private async getScopedTransactions(
    scope: ClusteringJob['scope'],
    blockchain: string,
  ): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values()).filter(
      (tx) => tx.blockchain === blockchain,
    );

    if (scope.transactions) {
      transactions = transactions.filter((tx) =>
        scope.transactions!.includes(tx.hash),
      );
    }

    if (scope.dateRange) {
      transactions = transactions.filter(
        (tx) =>
          tx.timestamp >= scope.dateRange!.start &&
          tx.timestamp <= scope.dateRange!.end,
      );
    }

    return transactions;
  }

  private async buildClusteringGraph(
    addresses: BlockchainAddress[],
    transactions: Transaction[],
    job: ClusteringJob,
  ): Promise<void> {
    // Build graph based on transaction relationships
    for (const tx of transactions) {
      // Common input heuristic
      if (tx.inputs.length > 1) {
        for (let i = 0; i < tx.inputs.length; i++) {
          for (let j = i + 1; j < tx.inputs.length; j++) {
            this.addGraphEdge(
              tx.inputs[i].address,
              tx.inputs[j].address,
              0.8, // High confidence for common input
              { type: 'common_input', transaction: tx.hash },
            );
          }
        }
      }

      // Change address heuristic
      if (tx.outputs.length === 2 && tx.inputs.length === 1) {
        const changeOutput = tx.outputs.find((out) => out.isChange);
        if (changeOutput) {
          this.addGraphEdge(
            tx.inputs[0].address,
            changeOutput.address,
            0.7, // Medium-high confidence for change address
            { type: 'change_address', transaction: tx.hash },
          );
        }
      }

      job.progress.transactionsProcessed++;
    }

    job.progress.addressesProcessed = addresses.length;
  }

  private addGraphEdge(
    from: string,
    to: string,
    weight: number,
    evidence: any,
  ): void {
    if (!this.transactionGraph.has(from)) {
      this.transactionGraph.set(from, []);
    }

    const edges = this.transactionGraph.get(from)!;
    const existingEdge = edges.find((edge) => edge.to === to);

    if (existingEdge) {
      // Strengthen existing edge
      existingEdge.weight = Math.max(existingEdge.weight, weight);
      if (!existingEdge.evidence.includes(evidence)) {
        existingEdge.evidence.push(evidence);
      }
    } else {
      edges.push({ to, weight, evidence: [evidence] });
    }
  }

  private async performClustering(
    job: ClusteringJob,
  ): Promise<AddressCluster[]> {
    const clusters: AddressCluster[] = [];
    const visited = new Set<string>();

    // Use Union-Find algorithm for clustering
    const unionFind = new Map<string, string>();

    // Initialize union-find
    for (const [address] of this.transactionGraph) {
      unionFind.set(address, address);
    }

    // Find root of component
    const find = (x: string): string => {
      if (unionFind.get(x) !== x) {
        unionFind.set(x, find(unionFind.get(x)!));
      }
      return unionFind.get(x)!;
    };

    // Union two components
    const union = (x: string, y: string): void => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        unionFind.set(rootX, rootY);
      }
    };

    // Apply heuristics to merge addresses
    for (const [fromAddr, edges] of this.transactionGraph) {
      for (const edge of edges) {
        if (edge.weight >= job.config.confidenceThreshold) {
          union(fromAddr, edge.to);
        }
      }
    }

    // Group addresses by root
    const components = new Map<string, string[]>();
    for (const [address] of this.transactionGraph) {
      const root = find(address);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(address);
    }

    // Create clusters
    for (const [root, addresses] of components) {
      if (addresses.length >= job.config.minClusterSize) {
        const cluster = await this.createCluster(addresses, job);
        clusters.push(cluster);
        job.progress.clustersFound++;
      }
    }

    return clusters;
  }

  private async createCluster(
    addresses: string[],
    job: ClusteringJob,
  ): Promise<AddressCluster> {
    const clusterId = crypto.randomUUID();

    // Analyze cluster characteristics
    const transactions = Array.from(this.transactions.values()).filter(
      (tx) =>
        tx.inputs.some((inp) => addresses.includes(inp.address)) ||
        tx.outputs.some((out) => addresses.includes(out.address)),
    );

    const totalVolume = transactions.reduce(
      (sum, tx) =>
        sum + tx.inputs.reduce((inputSum, inp) => inputSum + inp.value, 0),
      0,
    );

    const uniqueCounterparties = new Set<string>();
    transactions.forEach((tx) => {
      tx.inputs.forEach((inp) => {
        if (!addresses.includes(inp.address))
          uniqueCounterparties.add(inp.address);
      });
      tx.outputs.forEach((out) => {
        if (!addresses.includes(out.address))
          uniqueCounterparties.add(out.address);
      });
    });

    const amounts = transactions.map((tx) =>
      tx.inputs.reduce((sum, inp) => sum + inp.value, 0),
    );

    const cluster: AddressCluster = {
      id: clusterId,
      addresses,
      blockchain: job.blockchain,
      clusterType: await this.determineClusterType(addresses, transactions),
      confidence: await this.calculateClusterConfidence(addresses, job),
      heuristics: await this.getClusterHeuristics(addresses),
      statistics: {
        totalTransactions: transactions.length,
        totalVolume,
        uniqueCounterparties: uniqueCounterparties.size,
        averageTransactionSize:
          amounts.length > 0
            ? amounts.reduce((a, b) => a + b, 0) / amounts.length
            : 0,
        medianTransactionSize: this.calculateMedian(amounts),
        timespan: {
          start:
            transactions.length > 0
              ? new Date(
                  Math.min(...transactions.map((tx) => tx.timestamp.getTime())),
                )
              : new Date(),
          end:
            transactions.length > 0
              ? new Date(
                  Math.max(...transactions.map((tx) => tx.timestamp.getTime())),
                )
              : new Date(),
        },
      },
      tags: await this.generateClusterTags(addresses, transactions),
      lastUpdated: new Date(),
      createdAt: new Date(),
    };

    this.clusters.set(clusterId, cluster);
    return cluster;
  }

  private async validateClusters(
    clusters: AddressCluster[],
    job: ClusteringJob,
  ): Promise<AddressCluster[]> {
    const validatedClusters: AddressCluster[] = [];

    for (const cluster of clusters) {
      // Validate cluster coherence
      const coherenceScore = await this.calculateClusterCoherence(cluster);

      // Validate against known labels
      const labelConsistency = await this.validateLabelConsistency(cluster);

      // Validate size and confidence
      const meetsThresholds =
        cluster.addresses.length >= job.config.minClusterSize &&
        cluster.confidence >= job.config.confidenceThreshold;

      if (coherenceScore > 0.6 && labelConsistency > 0.7 && meetsThresholds) {
        validatedClusters.push(cluster);
      }
    }

    return validatedClusters;
  }

  private async finalizeClusters(
    clusters: AddressCluster[],
    job: ClusteringJob,
  ): Promise<void> {
    for (const cluster of clusters) {
      // Update address metadata with cluster assignment
      for (const address of cluster.addresses) {
        const addressObj = this.addresses.get(address);
        if (addressObj) {
          addressObj.metadata.labels.push({
            source: 'clustering',
            label: `cluster:${cluster.id}`,
            confidence: cluster.confidence,
            assignedAt: new Date(),
          });
          this.addresses.set(address, addressObj);
        }
      }

      this.emit('cluster_created', cluster);
    }
  }

  private async findPaths(
    sourceAddress: string,
    targetAddress: string | undefined,
    maxHops: number,
    maxAmount?: number,
    timeWindow?: { start: Date; end: Date },
  ): Promise<
    Array<{
      hops: Array<{
        fromAddress: string;
        toAddress: string;
        transaction: string;
        amount: number;
        timestamp: Date;
      }>;
    }>
  > {
    const paths: Array<{
      hops: Array<{
        fromAddress: string;
        toAddress: string;
        transaction: string;
        amount: number;
        timestamp: Date;
      }>;
    }> = [];
    const visited = new Set<string>();

    // BFS to find paths
    const queue: Array<{
      currentAddress: string;
      path: Array<{
        fromAddress: string;
        toAddress: string;
        transaction: string;
        amount: number;
        timestamp: Date;
      }>;
      totalAmount: number;
    }> = [{ currentAddress: sourceAddress, path: [], totalAmount: 0 }];

    while (queue.length > 0 && paths.length < 1000) {
      // Limit to prevent infinite loops
      const { currentAddress, path, totalAmount } = queue.shift()!;

      if (path.length >= maxHops) continue;
      if (visited.has(currentAddress)) continue;
      if (maxAmount && totalAmount > maxAmount) continue;

      visited.add(currentAddress);

      // If we have a target and reached it, add the path
      if (
        targetAddress &&
        currentAddress === targetAddress &&
        path.length > 0
      ) {
        paths.push({ hops: [...path] });
        continue;
      }

      // Find outgoing transactions from current address
      const outgoingTxs = Array.from(this.transactions.values()).filter(
        (tx) => {
          const hasOutput = tx.inputs.some(
            (inp) => inp.address === currentAddress,
          );
          if (!hasOutput) return false;

          if (timeWindow) {
            return (
              tx.timestamp >= timeWindow.start && tx.timestamp <= timeWindow.end
            );
          }

          return true;
        },
      );

      // Add next hops to queue
      for (const tx of outgoingTxs) {
        for (const output of tx.outputs) {
          if (
            output.address !== currentAddress &&
            !visited.has(output.address)
          ) {
            const newPath = [
              ...path,
              {
                fromAddress: currentAddress,
                toAddress: output.address,
                transaction: tx.hash,
                amount: output.value,
                timestamp: tx.timestamp,
              },
            ];

            queue.push({
              currentAddress: output.address,
              path: newPath,
              totalAmount: totalAmount + output.value,
            });
          }
        }
      }
    }

    // If no target specified, return all discovered paths
    if (!targetAddress) {
      return queue
        .filter((item) => item.path.length > 0)
        .map((item) => ({ hops: item.path }))
        .slice(0, 100); // Limit results
    }

    return paths;
  }

  private async analyzeBehaviorPattern(
    address: Omit<BlockchainAddress, 'id' | 'analysis'>,
  ): Promise<BlockchainAddress['analysis']['behaviorPattern']> {
    // Analyze transaction patterns to determine behavior
    const riskScore = this.calculateRiskScore(address);

    if (address.riskIndicators.mixer) return 'mixer';
    if (address.riskIndicators.exchange) return 'exchange';
    if (address.riskIndicators.gambling) return 'gambling';

    // Analyze transaction volume and frequency patterns
    const txCount = address.metadata.transactionCount;
    const avgTxSize = address.metadata.totalReceived / Math.max(txCount, 1);

    if (txCount > 1000 && avgTxSize > 10) return 'exchange';
    if (address.metadata.totalReceived > address.metadata.totalSent * 10)
      return 'mining';
    if (riskScore > 0.8) return 'suspicious';

    return 'normal';
  }

  private async calculatePrivacyScore(
    address: Omit<BlockchainAddress, 'id' | 'analysis'>,
  ): Promise<number> {
    let score = 0;

    // Higher score indicates more privacy-preserving behavior
    if (address.riskIndicators.mixer) score += 0.8;

    // Analyze transaction patterns for privacy indicators
    const txCount = address.metadata.transactionCount;
    const uniqueCounterparties = Math.min(txCount * 0.8, 100); // Estimate

    if (uniqueCounterparties / Math.max(txCount, 1) > 0.8) score += 0.3;

    return Math.min(score, 1.0);
  }

  private async calculateActivityScore(
    address: Omit<BlockchainAddress, 'id' | 'analysis'>,
  ): Promise<number> {
    const txCount = address.metadata.transactionCount;
    const totalVolume =
      address.metadata.totalReceived + address.metadata.totalSent;

    // Normalize activity score based on transaction count and volume
    const activityScore = Math.min(
      (txCount / 1000) * 0.5 + (Math.log10(totalVolume + 1) / 10) * 0.5,
      1.0,
    );

    return activityScore;
  }

  private calculateRiskScore(
    address: Omit<BlockchainAddress, 'id' | 'analysis'>,
  ): number {
    let riskScore = 0;

    // Risk indicators contribute to score
    if (address.riskIndicators.sanctionsHit) riskScore += 1.0;
    if (address.riskIndicators.darknetMarket) riskScore += 0.9;
    if (address.riskIndicators.ransomware) riskScore += 0.9;
    if (address.riskIndicators.phishing) riskScore += 0.8;
    if (address.riskIndicators.mixer) riskScore += 0.6;
    if (address.riskIndicators.gambling) riskScore += 0.3;
    if (address.riskIndicators.highRiskJurisdiction) riskScore += 0.4;

    return Math.min(riskScore, 1.0);
  }

  private async analyzeTransaction(
    transaction: Omit<Transaction, 'id' | 'analysis'>,
  ): Promise<Transaction['analysis']> {
    const analysis: Transaction['analysis'] = {
      mixing: false,
      peeling: false,
      consolidation: false,
      splitting: false,
      roundAmount: false,
      privacyEnhancing: false,
      suspiciousPatterns: [],
    };

    // Detect mixing patterns
    if (transaction.inputs.length > 10 && transaction.outputs.length > 10) {
      analysis.mixing = true;
      analysis.privacyEnhancing = true;
    }

    // Detect peeling chains
    if (transaction.outputs.length === 2 && transaction.inputs.length === 1) {
      const amounts = transaction.outputs.map((out) => out.value);
      const ratio = Math.min(...amounts) / Math.max(...amounts);
      if (ratio < 0.1) {
        analysis.peeling = true;
      }
    }

    // Detect consolidation
    if (transaction.inputs.length > 5 && transaction.outputs.length <= 2) {
      analysis.consolidation = true;
    }

    // Detect splitting
    if (transaction.inputs.length <= 2 && transaction.outputs.length > 5) {
      analysis.splitting = true;
    }

    // Detect round amounts
    const totalInput = transaction.inputs.reduce(
      (sum, inp) => sum + inp.value,
      0,
    );
    if (totalInput % 1 === 0 && totalInput % 1000000 === 0) {
      // Round numbers
      analysis.roundAmount = true;
    }

    // Identify suspicious patterns
    if (analysis.mixing) analysis.suspiciousPatterns.push('mixing');
    if (analysis.peeling) analysis.suspiciousPatterns.push('peeling');
    if (analysis.roundAmount) analysis.suspiciousPatterns.push('round_amount');

    return analysis;
  }

  private async updateAddressGraph(transaction: Transaction): Promise<void> {
    // Update the address relationship graph based on transaction
    for (const input of transaction.inputs) {
      if (!this.addressGraph.has(input.address)) {
        this.addressGraph.set(input.address, new Set());
      }

      for (const output of transaction.outputs) {
        this.addressGraph.get(input.address)!.add(output.address);
      }
    }
  }

  private getAddressBlockchain(address: string): string {
    const addressObj = this.addresses.get(address);
    return addressObj?.blockchain || 'unknown';
  }

  private async calculatePathRiskScore(
    hops: Array<{
      fromAddress: string;
      toAddress: string;
      transaction: string;
      amount: number;
      timestamp: Date;
    }>,
  ): Promise<number> {
    let riskScore = 0;

    for (const hop of hops) {
      const fromAddr = this.addresses.get(hop.fromAddress);
      const toAddr = this.addresses.get(hop.toAddress);

      if (fromAddr?.analysis.riskScore)
        riskScore += fromAddr.analysis.riskScore * 0.3;
      if (toAddr?.analysis.riskScore)
        riskScore += toAddr.analysis.riskScore * 0.3;

      // Check transaction for suspicious patterns
      const tx = this.transactions.get(hop.transaction);
      if (tx?.analysis.suspiciousPatterns.length) {
        riskScore += tx.analysis.suspiciousPatterns.length * 0.1;
      }
    }

    return Math.min(riskScore / hops.length, 1.0);
  }

  private async countMixingEvents(
    hops: Array<{
      fromAddress: string;
      toAddress: string;
      transaction: string;
      amount: number;
      timestamp: Date;
    }>,
  ): Promise<number> {
    let mixingEvents = 0;

    for (const hop of hops) {
      const tx = this.transactions.get(hop.transaction);
      if (tx?.analysis.mixing) {
        mixingEvents++;
      }

      const fromAddr = this.addresses.get(hop.fromAddress);
      const toAddr = this.addresses.get(hop.toAddress);

      if (fromAddr?.riskIndicators.mixer || toAddr?.riskIndicators.mixer) {
        mixingEvents++;
      }
    }

    return mixingEvents;
  }

  private async identifySuspiciousHops(
    hops: Array<{
      fromAddress: string;
      toAddress: string;
      transaction: string;
      amount: number;
      timestamp: Date;
    }>,
  ): Promise<
    Array<{
      hopIndex: number;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }>
  > {
    const suspiciousHops: Array<{
      hopIndex: number;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    hops.forEach((hop, index) => {
      const fromAddr = this.addresses.get(hop.fromAddress);
      const toAddr = this.addresses.get(hop.toAddress);

      if (
        fromAddr?.riskIndicators.sanctionsHit ||
        toAddr?.riskIndicators.sanctionsHit
      ) {
        suspiciousHops.push({
          hopIndex: index,
          reason: 'Sanctions hit',
          severity: 'high',
        });
      }

      if (fromAddr?.riskIndicators.mixer || toAddr?.riskIndicators.mixer) {
        suspiciousHops.push({
          hopIndex: index,
          reason: 'Mixer usage',
          severity: 'medium',
        });
      }

      if (
        fromAddr?.riskIndicators.darknetMarket ||
        toAddr?.riskIndicators.darknetMarket
      ) {
        suspiciousHops.push({
          hopIndex: index,
          reason: 'Darknet market',
          severity: 'high',
        });
      }
    });

    return suspiciousHops;
  }

  private calculateRiskDistribution(
    paths: Array<{ riskScore: number }>,
  ): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };

    paths.forEach((path) => {
      if (path.riskScore >= 0.8) distribution.critical++;
      else if (path.riskScore >= 0.6) distribution.high++;
      else if (path.riskScore >= 0.3) distribution.medium++;
      else distribution.low++;
    });

    return distribution;
  }

  private async checkSanctionsExposure(
    paths: Array<{ hops: Array<{ fromAddress: string; toAddress: string }> }>,
  ): Promise<boolean> {
    for (const path of paths) {
      for (const hop of path.hops) {
        const fromAddr = this.addresses.get(hop.fromAddress);
        const toAddr = this.addresses.get(hop.toAddress);

        if (
          fromAddr?.riskIndicators.sanctionsHit ||
          toAddr?.riskIndicators.sanctionsHit
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private async analyzeMixerIndicators(
    tx: Transaction,
    address: string,
  ): Promise<{
    mixer: string;
    type: 'centralized' | 'decentralized' | 'coin_join' | 'tumbler';
    inputAmount: number;
    outputAmount: number;
    confidence: number;
    technique: string;
  }> {
    // Mock mixer detection logic
    const inputAmount = tx.inputs
      .filter((inp) => inp.address === address)
      .reduce((sum, inp) => sum + inp.value, 0);

    const outputAmount = tx.outputs
      .filter((out) => out.address === address)
      .reduce((sum, out) => sum + out.value, 0);

    let confidence = 0;
    let mixerType: 'centralized' | 'decentralized' | 'coin_join' | 'tumbler' =
      'centralized';
    let technique = 'unknown';

    // Detect mixing patterns
    if (tx.inputs.length > 10 && tx.outputs.length > 10) {
      confidence += 0.6;
      mixerType = 'decentralized';
      technique = 'multi_input_output';
    }

    if (tx.analysis.mixing) {
      confidence += 0.4;
      technique = 'transaction_mixing';
    }

    return {
      mixer: 'detected_mixer',
      type: mixerType,
      inputAmount,
      outputAmount,
      confidence: Math.min(confidence, 1.0),
      technique,
    };
  }

  private async determineClusterType(
    addresses: string[],
    transactions: Transaction[],
  ): Promise<AddressCluster['clusterType']> {
    // Analyze cluster characteristics to determine type
    const hasExchangePatterns = transactions.some(
      (tx) => tx.inputs.length > 5 || tx.outputs.length > 5,
    );

    const hasMixerPatterns = transactions.some((tx) => tx.analysis.mixing);

    if (hasMixerPatterns) return 'mixer';
    if (hasExchangePatterns) return 'exchange';

    // Default classification based on size and behavior
    if (addresses.length > 100) return 'service';
    if (addresses.length > 10) return 'entity';

    return 'individual';
  }

  private async calculateClusterConfidence(
    addresses: string[],
    job: ClusteringJob,
  ): Promise<number> {
    // Calculate confidence based on heuristic strengths
    let totalWeight = 0;
    let totalScore = 0;

    for (const heuristic of job.config.heuristics) {
      if (heuristic.enabled) {
        totalWeight += heuristic.weight;
        totalScore += heuristic.weight * heuristic.threshold;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private async getClusterHeuristics(
    addresses: string[],
  ): Promise<AddressCluster['heuristics']> {
    // Analyze which heuristics were used to create this cluster
    return [
      {
        type: 'common_input',
        strength: 0.8,
        evidence: [],
      },
      {
        type: 'change_address',
        strength: 0.7,
        evidence: [],
      },
    ];
  }

  private async generateClusterTags(
    addresses: string[],
    transactions: Transaction[],
  ): Promise<AddressCluster['tags']> {
    const tags: AddressCluster['tags'] = [];

    // Analyze cluster characteristics
    const hasMixing = transactions.some((tx) => tx.analysis.mixing);
    const hasHighVolume =
      transactions.reduce(
        (sum, tx) =>
          sum + tx.inputs.reduce((inputSum, inp) => inputSum + inp.value, 0),
        0,
      ) > 1000;

    if (hasMixing) {
      tags.push({
        category: 'risk',
        tag: 'mixing_activity',
        confidence: 0.8,
        source: 'transaction_analysis',
      });
    }

    if (hasHighVolume) {
      tags.push({
        category: 'behavioral',
        tag: 'high_volume',
        confidence: 0.9,
        source: 'volume_analysis',
      });
    }

    return tags;
  }

  private async calculateClusterCoherence(
    cluster: AddressCluster,
  ): Promise<number> {
    // Calculate how coherent/consistent the cluster is
    const addressCount = cluster.addresses.length;
    const heuristicStrength =
      cluster.heuristics.reduce((sum, h) => sum + h.strength, 0) /
      cluster.heuristics.length;

    return Math.min(heuristicStrength * (Math.log(addressCount) / 10), 1.0);
  }

  private async validateLabelConsistency(
    cluster: AddressCluster,
  ): Promise<number> {
    // Check if addresses in cluster have consistent labels
    let consistentLabels = 0;
    let totalLabels = 0;

    for (const address of cluster.addresses) {
      const addressObj = this.addresses.get(address);
      if (addressObj) {
        totalLabels += addressObj.metadata.labels.length;
        // Mock: assume most labels are consistent
        consistentLabels += addressObj.metadata.labels.length * 0.8;
      }
    }

    return totalLabels > 0 ? consistentLabels / totalLabels : 0.5;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }

  private calculateDistribution(
    values: number[],
    bucketSize: number,
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    values.forEach((value) => {
      const bucket = Math.floor(value / bucketSize) * bucketSize;
      const key = `${bucket}-${bucket + bucketSize}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });

    return distribution;
  }
}
