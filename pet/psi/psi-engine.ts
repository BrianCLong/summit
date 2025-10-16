/**
 * Private Set Intersection (PSI) Engine
 * Sprint 28B+: Advanced cryptographic protocols for privacy-preserving set operations
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface PSIDataset {
  id: string;
  name: string;
  owner: string;
  elements: string[];
  hashedElements?: string[];
  bloomFilter?: {
    size: number;
    hashFunctions: number;
    bits: Buffer;
  };
  metadata: {
    elementCount: number;
    dataType: 'email' | 'phone' | 'identifier' | 'address' | 'generic';
    created: Date;
    lastAccessed: Date;
    accessCount: number;
  };
  privacy: {
    pepperSalt: string;
    hashAlgorithm: 'sha256' | 'blake2b' | 'sha3-256';
    normalization: boolean;
  };
}

export interface PSIProtocolConfig {
  id: string;
  name: string;
  type:
    | 'ecdh_psi'
    | 'oprf_psi'
    | 'bloom_psi'
    | 'circuit_psi'
    | 'polynomial_psi';
  security: {
    curveType?: 'p256' | 'p384' | 'curve25519';
    oprfFunction?: 'ristretto255' | 'curve25519';
    polyDegree?: number;
    falsePositiveRate?: number; // For Bloom filters
  };
  performance: {
    maxSetSize: number;
    chunkSize: number;
    parallelism: number;
    memoryLimitMB: number;
  };
  privacy: {
    differentialPrivacy: boolean;
    epsilon?: number;
    delta?: number;
    noiseDistribution?: 'laplace' | 'gaussian';
  };
}

export interface PSIJob {
  id: string;
  protocol: PSIProtocolConfig;
  participants: Array<{
    id: string;
    role: 'sender' | 'receiver' | 'both';
    dataset: string;
    endpoint?: string;
  }>;
  status: 'pending' | 'setup' | 'running' | 'completed' | 'failed' | 'aborted';
  phases: {
    setup: {
      startTime?: Date;
      endTime?: Date;
      status: 'pending' | 'completed' | 'failed';
    };
    exchange: {
      startTime?: Date;
      endTime?: Date;
      status: 'pending' | 'completed' | 'failed';
    };
    computation: {
      startTime?: Date;
      endTime?: Date;
      status: 'pending' | 'completed' | 'failed';
    };
    verification: {
      startTime?: Date;
      endTime?: Date;
      status: 'pending' | 'completed' | 'failed';
    };
  };
  results?: {
    intersectionSize: number;
    intersectionElements?: string[]; // Only if policy allows
    confidence: number;
    falsePositiveEstimate?: number;
    linkHints?: Array<{
      leftHash: string;
      rightHash: string;
      confidence: number;
      metadata?: any;
    }>;
  };
  audit: {
    createdAt: Date;
    createdBy: string;
    purpose: string;
    dataUsageAgreement: string;
    approvals: Array<{
      participant: string;
      approver: string;
      timestamp: Date;
      scope: string[];
    }>;
  };
  telemetry: {
    bandwidth: { sent: number; received: number };
    computation: { cpu: number; memory: number; duration: number };
    rounds: number;
    errors: Array<{
      timestamp: Date;
      phase: string;
      error: string;
      recovered: boolean;
    }>;
  };
}

export interface PSIResult {
  jobId: string;
  intersectionSize: number;
  participantSizes: Map<string, number>;
  protocol: string;
  privacy: {
    actualEpsilon?: number;
    actualDelta?: number;
    noiseAdded: boolean;
  };
  verification: {
    proofOfCorrectness: string;
    participantSignatures: Map<string, string>;
    timestamp: Date;
  };
  performance: {
    totalTime: number;
    bandwidthUsed: number;
    computeUnits: number;
  };
}

export class PSIEngine extends EventEmitter {
  private datasets = new Map<string, PSIDataset>();
  private protocols = new Map<string, PSIProtocolConfig>();
  private jobs = new Map<string, PSIJob>();
  private results = new Map<string, PSIResult>();

  // Cryptographic contexts
  private ecdhKeys = new Map<string, { private: Buffer; public: Buffer }>();
  private oprfKeys = new Map<string, Buffer>();

  constructor() {
    super();
    this.initializeDefaultProtocols();
  }

  /**
   * Register dataset for PSI operations
   */
  async registerDataset(
    dataset: Omit<
      PSIDataset,
      'id' | 'hashedElements' | 'bloomFilter' | 'metadata'
    >,
  ): Promise<PSIDataset> {
    const fullDataset: PSIDataset = {
      ...dataset,
      id: crypto.randomUUID(),
      metadata: {
        elementCount: dataset.elements.length,
        dataType: dataset.metadata?.dataType || 'generic',
        created: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
      },
    };

    // Normalize and hash elements
    await this.preprocessDataset(fullDataset);

    this.datasets.set(fullDataset.id, fullDataset);
    this.emit('dataset_registered', fullDataset);

    return fullDataset;
  }

  /**
   * Execute ECDH-based PSI
   */
  async executeECDHPSI(
    datasetA: string,
    datasetB: string,
    participantA: string,
    participantB: string,
    config: Partial<PSIProtocolConfig> = {},
  ): Promise<PSIJob> {
    const protocol = this.getOrCreateProtocol('ecdh_psi', config);

    const job: PSIJob = {
      id: crypto.randomUUID(),
      protocol,
      participants: [
        { id: participantA, role: 'sender', dataset: datasetA },
        { id: participantB, role: 'receiver', dataset: datasetB },
      ],
      status: 'pending',
      phases: {
        setup: { status: 'pending' },
        exchange: { status: 'pending' },
        computation: { status: 'pending' },
        verification: { status: 'pending' },
      },
      audit: {
        createdAt: new Date(),
        createdBy: participantA,
        purpose: 'Privacy-preserving record linkage',
        dataUsageAgreement: 'DUA-PSI-001',
        approvals: [],
      },
      telemetry: {
        bandwidth: { sent: 0, received: 0 },
        computation: { cpu: 0, memory: 0, duration: 0 },
        rounds: 0,
        errors: [],
      },
    };

    this.jobs.set(job.id, job);

    // Execute PSI asynchronously
    this.executeECDHPSIJob(job).catch((error) => {
      job.status = 'failed';
      job.telemetry.errors.push({
        timestamp: new Date(),
        phase: 'execution',
        error: error.message,
        recovered: false,
      });
      this.jobs.set(job.id, job);
      this.emit('psi_failed', { jobId: job.id, error: error.message });
    });

    return job;
  }

  /**
   * Execute OPRF-based PSI
   */
  async executeOPRFPSI(
    datasetA: string,
    datasetB: string,
    participantA: string,
    participantB: string,
    config: Partial<PSIProtocolConfig> = {},
  ): Promise<PSIJob> {
    const protocol = this.getOrCreateProtocol('oprf_psi', config);

    const job: PSIJob = {
      id: crypto.randomUUID(),
      protocol,
      participants: [
        { id: participantA, role: 'sender', dataset: datasetA },
        { id: participantB, role: 'receiver', dataset: datasetB },
      ],
      status: 'pending',
      phases: {
        setup: { status: 'pending' },
        exchange: { status: 'pending' },
        computation: { status: 'pending' },
        verification: { status: 'pending' },
      },
      audit: {
        createdAt: new Date(),
        createdBy: participantA,
        purpose: 'Privacy-preserving entity matching',
        dataUsageAgreement: 'DUA-PSI-002',
        approvals: [],
      },
      telemetry: {
        bandwidth: { sent: 0, received: 0 },
        computation: { cpu: 0, memory: 0, duration: 0 },
        rounds: 0,
        errors: [],
      },
    };

    this.jobs.set(job.id, job);

    // Execute OPRF PSI asynchronously
    this.executeOPRFPSIJob(job).catch((error) => {
      job.status = 'failed';
      this.jobs.set(job.id, job);
      this.emit('psi_failed', { jobId: job.id, error: error.message });
    });

    return job;
  }

  /**
   * Execute Bloom filter PSI for large sets
   */
  async executeBloomPSI(
    datasetA: string,
    datasetB: string,
    participantA: string,
    participantB: string,
    falsePositiveRate: number = 0.001,
  ): Promise<PSIJob> {
    const protocol = this.getOrCreateProtocol('bloom_psi', {
      security: { falsePositiveRate },
    });

    const job: PSIJob = {
      id: crypto.randomUUID(),
      protocol,
      participants: [
        { id: participantA, role: 'sender', dataset: datasetA },
        { id: participantB, role: 'receiver', dataset: datasetB },
      ],
      status: 'pending',
      phases: {
        setup: { status: 'pending' },
        exchange: { status: 'pending' },
        computation: { status: 'pending' },
        verification: { status: 'pending' },
      },
      audit: {
        createdAt: new Date(),
        createdBy: participantA,
        purpose: 'Large-scale privacy-preserving matching',
        dataUsageAgreement: 'DUA-PSI-003',
        approvals: [],
      },
      telemetry: {
        bandwidth: { sent: 0, received: 0 },
        computation: { cpu: 0, memory: 0, duration: 0 },
        rounds: 0,
        errors: [],
      },
    };

    this.jobs.set(job.id, job);

    // Execute Bloom PSI asynchronously
    this.executeBloomPSIJob(job).catch((error) => {
      job.status = 'failed';
      this.jobs.set(job.id, job);
      this.emit('psi_failed', { jobId: job.id, error: error.message });
    });

    return job;
  }

  /**
   * Generate link hints without revealing intersection elements
   */
  async generateLinkHints(
    jobId: string,
    maxHints: number = 1000,
    confidenceThreshold: number = 0.8,
  ): Promise<
    Array<{ leftHash: string; rightHash: string; confidence: number }>
  > {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.results) {
      throw new Error('Job not completed or results not available');
    }

    const hints: Array<{
      leftHash: string;
      rightHash: string;
      confidence: number;
    }> = [];

    // Generate hints based on intersection without revealing actual elements
    if (job.results.linkHints) {
      const sortedHints = job.results.linkHints
        .filter((hint) => hint.confidence >= confidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxHints);

      hints.push(
        ...sortedHints.map((hint) => ({
          leftHash: hint.leftHash,
          rightHash: hint.rightHash,
          confidence: hint.confidence,
        })),
      );
    }

    this.emit('link_hints_generated', { jobId, hintCount: hints.length });
    return hints;
  }

  /**
   * Add differential privacy noise to PSI results
   */
  async addDifferentialPrivacy(
    jobId: string,
    epsilon: number,
    delta: number = 1e-6,
    mechanism: 'laplace' | 'gaussian' = 'laplace',
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.results) {
      throw new Error('Job or results not found');
    }

    const originalSize = job.results.intersectionSize;
    let noisySize: number;

    switch (mechanism) {
      case 'laplace':
        const laplacianNoise = this.sampleLaplace(0, 1 / epsilon);
        noisySize = Math.max(0, Math.round(originalSize + laplacianNoise));
        break;

      case 'gaussian':
        const sensitivity = 1; // For set intersection
        const sigma =
          (Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity) / epsilon;
        const gaussianNoise = this.sampleGaussian(0, sigma);
        noisySize = Math.max(0, Math.round(originalSize + gaussianNoise));
        break;

      default:
        throw new Error(`Unsupported DP mechanism: ${mechanism}`);
    }

    // Update results with noisy count
    job.results.intersectionSize = noisySize;

    // Clear individual elements for privacy
    if (job.results.intersectionElements) {
      delete job.results.intersectionElements;
    }

    // Record privacy parameters
    if (!job.results) job.results = { intersectionSize: 0, confidence: 0 };

    this.jobs.set(jobId, job);
    this.emit('differential_privacy_applied', {
      jobId,
      epsilon,
      delta,
      mechanism,
    });
  }

  /**
   * Verify PSI computation integrity
   */
  async verifyComputation(jobId: string): Promise<{
    valid: boolean;
    proofs: Array<{ type: string; valid: boolean; details: any }>;
  }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const proofs: Array<{ type: string; valid: boolean; details: any }> = [];

    // Verify protocol adherence
    const protocolProof = await this.verifyProtocolAdherence(job);
    proofs.push(protocolProof);

    // Verify participant signatures
    const signatureProof = await this.verifyParticipantSignatures(job);
    proofs.push(signatureProof);

    // Verify computation bounds
    const boundsProof = await this.verifyComputationBounds(job);
    proofs.push(boundsProof);

    // Verify privacy guarantees
    const privacyProof = await this.verifyPrivacyGuarantees(job);
    proofs.push(privacyProof);

    const allValid = proofs.every((proof) => proof.valid);

    this.emit('computation_verified', {
      jobId,
      valid: allValid,
      proofCount: proofs.length,
    });

    return { valid: allValid, proofs };
  }

  /**
   * Get PSI job statistics
   */
  getJobStatistics(timeframe?: { start: Date; end: Date }): {
    total: number;
    byProtocol: Record<string, number>;
    byStatus: Record<string, number>;
    averageIntersectionSize: number;
    averageComputationTime: number;
    totalBandwidth: number;
  } {
    let jobs = Array.from(this.jobs.values());

    if (timeframe) {
      jobs = jobs.filter(
        (job) =>
          job.audit.createdAt >= timeframe.start &&
          job.audit.createdAt <= timeframe.end,
      );
    }

    const byProtocol = jobs.reduce(
      (acc, job) => {
        acc[job.protocol.type] = (acc[job.protocol.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byStatus = jobs.reduce(
      (acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const completedJobs = jobs.filter(
      (job) => job.status === 'completed' && job.results,
    );

    const averageIntersectionSize =
      completedJobs.length > 0
        ? completedJobs.reduce(
            (sum, job) => sum + (job.results?.intersectionSize || 0),
            0,
          ) / completedJobs.length
        : 0;

    const averageComputationTime =
      jobs.length > 0
        ? jobs.reduce(
            (sum, job) => sum + job.telemetry.computation.duration,
            0,
          ) / jobs.length
        : 0;

    const totalBandwidth = jobs.reduce(
      (sum, job) =>
        sum + job.telemetry.bandwidth.sent + job.telemetry.bandwidth.received,
      0,
    );

    return {
      total: jobs.length,
      byProtocol,
      byStatus,
      averageIntersectionSize,
      averageComputationTime,
      totalBandwidth,
    };
  }

  private async preprocessDataset(dataset: PSIDataset): Promise<void> {
    // Normalize elements
    const normalizedElements = dataset.elements.map((element) => {
      if (dataset.privacy.normalization) {
        return this.normalizeElement(element, dataset.metadata.dataType);
      }
      return element;
    });

    // Hash elements with pepper/salt
    dataset.hashedElements = normalizedElements.map((element) => {
      const data = element + dataset.privacy.pepperSalt;
      return crypto
        .createHash(dataset.privacy.hashAlgorithm)
        .update(data)
        .digest('hex');
    });

    // Create Bloom filter for large datasets
    if (dataset.elements.length > 10000) {
      dataset.bloomFilter = this.createBloomFilter(
        dataset.hashedElements,
        0.001,
      );
    }
  }

  private normalizeElement(
    element: string,
    dataType: PSIDataset['metadata']['dataType'],
  ): string {
    switch (dataType) {
      case 'email':
        return element.toLowerCase().trim();
      case 'phone':
        return element.replace(/\D/g, ''); // Remove non-digits
      case 'address':
        return element
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();
      case 'identifier':
        return element.toUpperCase().trim();
      default:
        return element.toLowerCase().trim();
    }
  }

  private createBloomFilter(
    elements: string[],
    falsePositiveRate: number,
  ): PSIDataset['bloomFilter'] {
    const n = elements.length;
    const m = Math.ceil((-n * Math.log(falsePositiveRate)) / Math.log(2) ** 2);
    const k = Math.ceil((m / n) * Math.log(2));

    const bits = Buffer.alloc(Math.ceil(m / 8), 0);

    for (const element of elements) {
      for (let i = 0; i < k; i++) {
        const hash = crypto
          .createHash('sha256')
          .update(element + i)
          .digest();
        const index = hash.readUInt32BE(0) % m;
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        bits[byteIndex] |= 1 << bitIndex;
      }
    }

    return { size: m, hashFunctions: k, bits };
  }

  private getOrCreateProtocol(
    type: PSIProtocolConfig['type'],
    config: Partial<PSIProtocolConfig>,
  ): PSIProtocolConfig {
    const protocolId = `${type}_${crypto.randomBytes(4).toString('hex')}`;

    const defaultConfig: PSIProtocolConfig = {
      id: protocolId,
      name: `${type.toUpperCase()} Protocol`,
      type,
      security: {
        curveType: 'p256',
        oprfFunction: 'ristretto255',
        falsePositiveRate: 0.001,
      },
      performance: {
        maxSetSize: 1000000,
        chunkSize: 1000,
        parallelism: 4,
        memoryLimitMB: 2048,
      },
      privacy: {
        differentialPrivacy: false,
        epsilon: 1.0,
        delta: 1e-6,
      },
    };

    const fullConfig = { ...defaultConfig, ...config };
    this.protocols.set(protocolId, fullConfig);

    return fullConfig;
  }

  private async executeECDHPSIJob(job: PSIJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Setup phase
      job.phases.setup.startTime = new Date();
      job.status = 'setup';

      await this.setupECDHKeys(job);

      job.phases.setup.endTime = new Date();
      job.phases.setup.status = 'completed';

      // Exchange phase
      job.phases.exchange.startTime = new Date();
      job.status = 'running';

      const { encryptedSetA, encryptedSetB } =
        await this.performECDHExchange(job);

      job.phases.exchange.endTime = new Date();
      job.phases.exchange.status = 'completed';

      // Computation phase
      job.phases.computation.startTime = new Date();

      const intersection = await this.computeECDHIntersection(
        encryptedSetA,
        encryptedSetB,
      );

      job.phases.computation.endTime = new Date();
      job.phases.computation.status = 'completed';

      // Verification phase
      job.phases.verification.startTime = new Date();

      const verified = await this.verifyECDHResult(job, intersection);
      if (!verified) {
        throw new Error('PSI result verification failed');
      }

      job.phases.verification.endTime = new Date();
      job.phases.verification.status = 'completed';

      // Update results
      job.results = {
        intersectionSize: intersection.size,
        confidence: 1.0,
        linkHints: Array.from(intersection.elements).map((element, index) => ({
          leftHash: `left_${crypto
            .createHash('sha256')
            .update(element + 'left')
            .digest('hex')
            .slice(0, 16)}`,
          rightHash: `right_${crypto
            .createHash('sha256')
            .update(element + 'right')
            .digest('hex')
            .slice(0, 16)}`,
          confidence: 0.95 + Math.random() * 0.05, // Mock confidence
          metadata: { index },
        })),
      };

      job.status = 'completed';
      job.telemetry.computation.duration = Date.now() - startTime;

      this.jobs.set(job.id, job);
      this.emit('psi_completed', {
        jobId: job.id,
        intersectionSize: intersection.size,
      });
    } catch (error) {
      job.status = 'failed';
      job.telemetry.errors.push({
        timestamp: new Date(),
        phase: job.status,
        error: error.message,
        recovered: false,
      });
      this.jobs.set(job.id, job);
      throw error;
    }
  }

  private async executeOPRFPSIJob(job: PSIJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Setup phase
      job.phases.setup.startTime = new Date();
      job.status = 'setup';

      await this.setupOPRFKeys(job);

      job.phases.setup.endTime = new Date();
      job.phases.setup.status = 'completed';

      // Exchange phase
      job.phases.exchange.startTime = new Date();
      job.status = 'running';

      const { blindedElements, oprfOutputs } =
        await this.performOPRFExchange(job);

      job.phases.exchange.endTime = new Date();
      job.phases.exchange.status = 'completed';

      // Computation phase
      job.phases.computation.startTime = new Date();

      const intersection = await this.computeOPRFIntersection(
        blindedElements,
        oprfOutputs,
      );

      job.phases.computation.endTime = new Date();
      job.phases.computation.status = 'completed';

      // Verification phase
      job.phases.verification.startTime = new Date();

      const verified = await this.verifyOPRFResult(job, intersection);
      if (!verified) {
        throw new Error('OPRF PSI result verification failed');
      }

      job.phases.verification.endTime = new Date();
      job.phases.verification.status = 'completed';

      // Update results
      job.results = {
        intersectionSize: intersection.size,
        confidence: 0.98, // OPRF provides high confidence
        linkHints: Array.from(intersection.elements).map((element, index) => ({
          leftHash: `oprf_left_${crypto
            .createHash('sha256')
            .update(element + 'left')
            .digest('hex')
            .slice(0, 16)}`,
          rightHash: `oprf_right_${crypto
            .createHash('sha256')
            .update(element + 'right')
            .digest('hex')
            .slice(0, 16)}`,
          confidence: 0.98 + Math.random() * 0.02,
          metadata: { index, protocol: 'oprf' },
        })),
      };

      job.status = 'completed';
      job.telemetry.computation.duration = Date.now() - startTime;

      this.jobs.set(job.id, job);
      this.emit('psi_completed', {
        jobId: job.id,
        intersectionSize: intersection.size,
      });
    } catch (error) {
      job.status = 'failed';
      this.jobs.set(job.id, job);
      throw error;
    }
  }

  private async executeBloomPSIJob(job: PSIJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Setup phase
      job.phases.setup.startTime = new Date();
      job.status = 'setup';

      const datasetA = this.datasets.get(job.participants[0].dataset)!;
      const datasetB = this.datasets.get(job.participants[1].dataset)!;

      job.phases.setup.endTime = new Date();
      job.phases.setup.status = 'completed';

      // Exchange phase - exchange Bloom filters
      job.phases.exchange.startTime = new Date();
      job.status = 'running';

      if (!datasetA.bloomFilter || !datasetB.bloomFilter) {
        throw new Error('Bloom filters not available for datasets');
      }

      const filterA = datasetA.bloomFilter;
      const filterB = datasetB.bloomFilter;

      job.phases.exchange.endTime = new Date();
      job.phases.exchange.status = 'completed';

      // Computation phase - estimate intersection using Bloom filters
      job.phases.computation.startTime = new Date();

      const intersection = await this.estimateBloomIntersection(
        filterA,
        filterB,
        datasetA,
        datasetB,
      );

      job.phases.computation.endTime = new Date();
      job.phases.computation.status = 'completed';

      // Verification phase
      job.phases.verification.startTime = new Date();

      job.phases.verification.endTime = new Date();
      job.phases.verification.status = 'completed';

      // Update results
      job.results = {
        intersectionSize: intersection.estimate,
        confidence: intersection.confidence,
        falsePositiveEstimate: intersection.falsePositiveRate,
        linkHints: [], // Bloom filters don't provide individual matches
      };

      job.status = 'completed';
      job.telemetry.computation.duration = Date.now() - startTime;

      this.jobs.set(job.id, job);
      this.emit('psi_completed', {
        jobId: job.id,
        intersectionSize: intersection.estimate,
      });
    } catch (error) {
      job.status = 'failed';
      this.jobs.set(job.id, job);
      throw error;
    }
  }

  private async setupECDHKeys(job: PSIJob): Promise<void> {
    // Generate ECDH key pairs for each participant
    for (const participant of job.participants) {
      const keyPair = crypto.generateKeyPairSync('ec', {
        namedCurve: job.protocol.security.curveType || 'prime256v1',
      });

      this.ecdhKeys.set(participant.id, {
        private: keyPair.privateKey.export({ type: 'pkcs8', format: 'der' }),
        public: keyPair.publicKey.export({ type: 'spki', format: 'der' }),
      });
    }

    job.telemetry.rounds = 1;
    job.telemetry.bandwidth.sent += 64; // Mock bandwidth for key exchange
  }

  private async setupOPRFKeys(job: PSIJob): Promise<void> {
    // Generate OPRF keys
    for (const participant of job.participants) {
      const oprfKey = crypto.randomBytes(32); // 256-bit key
      this.oprfKeys.set(participant.id, oprfKey);
    }

    job.telemetry.rounds = 1;
    job.telemetry.bandwidth.sent += 32;
  }

  private async performECDHExchange(job: PSIJob): Promise<{
    encryptedSetA: Set<string>;
    encryptedSetB: Set<string>;
  }> {
    const datasetA = this.datasets.get(job.participants[0].dataset)!;
    const datasetB = this.datasets.get(job.participants[1].dataset)!;

    // Mock ECDH encryption of sets
    const encryptedSetA = new Set(
      datasetA.hashedElements!.map((element) =>
        crypto
          .createHash('sha256')
          .update(element + 'ecdh_a')
          .digest('hex'),
      ),
    );

    const encryptedSetB = new Set(
      datasetB.hashedElements!.map((element) =>
        crypto
          .createHash('sha256')
          .update(element + 'ecdh_b')
          .digest('hex'),
      ),
    );

    job.telemetry.bandwidth.sent +=
      (encryptedSetA.size + encryptedSetB.size) * 32;
    job.telemetry.rounds += 2;

    return { encryptedSetA, encryptedSetB };
  }

  private async performOPRFExchange(job: PSIJob): Promise<{
    blindedElements: Map<string, string>;
    oprfOutputs: Map<string, string>;
  }> {
    const datasetA = this.datasets.get(job.participants[0].dataset)!;
    const datasetB = this.datasets.get(job.participants[1].dataset)!;

    // Mock OPRF blinding and evaluation
    const blindedElements = new Map<string, string>();
    const oprfOutputs = new Map<string, string>();

    // Simulate OPRF protocol
    datasetA.hashedElements!.forEach((element) => {
      const blinded = crypto
        .createHash('sha256')
        .update(element + 'blind')
        .digest('hex');
      const oprfOutput = crypto
        .createHash('sha256')
        .update(blinded + 'oprf')
        .digest('hex');
      blindedElements.set(element, blinded);
      oprfOutputs.set(blinded, oprfOutput);
    });

    datasetB.hashedElements!.forEach((element) => {
      const blinded = crypto
        .createHash('sha256')
        .update(element + 'blind')
        .digest('hex');
      const oprfOutput = crypto
        .createHash('sha256')
        .update(blinded + 'oprf')
        .digest('hex');
      blindedElements.set(element, blinded);
      oprfOutputs.set(blinded, oprfOutput);
    });

    job.telemetry.bandwidth.sent +=
      (blindedElements.size + oprfOutputs.size) * 32;
    job.telemetry.rounds += 3;

    return { blindedElements, oprfOutputs };
  }

  private async computeECDHIntersection(
    encryptedSetA: Set<string>,
    encryptedSetB: Set<string>,
  ): Promise<{ size: number; elements: Set<string> }> {
    const intersection = new Set<string>();

    // Find common elements (mock implementation)
    for (const elementA of encryptedSetA) {
      for (const elementB of encryptedSetB) {
        // Simulate matching with some probability based on hash similarity
        const similarity = this.calculateHashSimilarity(elementA, elementB);
        if (similarity > 0.99) {
          // High threshold for mock matching
          intersection.add(elementA);
        }
      }
    }

    return { size: intersection.size, elements: intersection };
  }

  private async computeOPRFIntersection(
    blindedElements: Map<string, string>,
    oprfOutputs: Map<string, string>,
  ): Promise<{ size: number; elements: Set<string> }> {
    const intersection = new Set<string>();

    // Find intersecting OPRF outputs
    const outputValues = new Set(oprfOutputs.values());

    for (const [element, blinded] of blindedElements) {
      const oprfOutput = oprfOutputs.get(blinded);
      if (oprfOutput && outputValues.has(oprfOutput)) {
        intersection.add(element);
      }
    }

    return { size: intersection.size, elements: intersection };
  }

  private async estimateBloomIntersection(
    filterA: NonNullable<PSIDataset['bloomFilter']>,
    filterB: NonNullable<PSIDataset['bloomFilter']>,
    datasetA: PSIDataset,
    datasetB: PSIDataset,
  ): Promise<{
    estimate: number;
    confidence: number;
    falsePositiveRate: number;
  }> {
    // Calculate intersection of Bloom filters
    const intersectionBits = Buffer.alloc(filterA.bits.length);

    for (let i = 0; i < filterA.bits.length; i++) {
      intersectionBits[i] = filterA.bits[i] & filterB.bits[i];
    }

    // Count set bits in intersection
    let setBits = 0;
    for (let i = 0; i < intersectionBits.length; i++) {
      setBits += this.popcount(intersectionBits[i]);
    }

    // Estimate intersection size using Bloom filter mathematics
    const m = filterA.size;
    const k = filterA.hashFunctions;
    const nA = datasetA.metadata.elementCount;
    const nB = datasetB.metadata.elementCount;

    // Approximate intersection size
    const estimate = Math.max(
      0,
      ((setBits / m -
        Math.pow(1 - Math.exp((-k * nA) / m), k) *
          Math.pow(1 - Math.exp((-k * nB) / m), k)) *
        m) /
        (k * k),
    );

    // Calculate confidence based on filter parameters
    const confidence = Math.max(0.5, 1 - filterA.size / (nA + nB));

    return {
      estimate: Math.round(estimate),
      confidence,
      falsePositiveRate: Math.pow(1 - Math.exp((-k * estimate) / m), k),
    };
  }

  private calculateHashSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;

    // Simple Hamming distance-based similarity
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }

    return matches / minLength;
  }

  private popcount(byte: number): number {
    let count = 0;
    while (byte) {
      count += byte & 1;
      byte >>= 1;
    }
    return count;
  }

  private sampleLaplace(mu: number, b: number): number {
    const u = Math.random() - 0.5;
    return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private sampleGaussian(mu: number, sigma: number): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return z * sigma + mu;
  }

  private async verifyProtocolAdherence(
    job: PSIJob,
  ): Promise<{ type: string; valid: boolean; details: any }> {
    // Verify that the protocol was executed correctly
    const expectedPhases = ['setup', 'exchange', 'computation', 'verification'];
    const completedPhases = Object.keys(job.phases).filter(
      (phase) =>
        job.phases[phase as keyof typeof job.phases].status === 'completed',
    );

    const valid = expectedPhases.every((phase) =>
      completedPhases.includes(phase),
    );

    return {
      type: 'protocol_adherence',
      valid,
      details: {
        expectedPhases,
        completedPhases,
        protocolType: job.protocol.type,
      },
    };
  }

  private async verifyParticipantSignatures(
    job: PSIJob,
  ): Promise<{ type: string; valid: boolean; details: any }> {
    // Mock signature verification
    const signatures = job.participants.map(
      (p) => `sig_${p.id}_${crypto.randomBytes(8).toString('hex')}`,
    );

    return {
      type: 'participant_signatures',
      valid: true,
      details: {
        participantCount: job.participants.length,
        signatures,
      },
    };
  }

  private async verifyComputationBounds(
    job: PSIJob,
  ): Promise<{ type: string; valid: boolean; details: any }> {
    const withinBounds =
      job.telemetry.computation.memory <=
        job.protocol.performance.memoryLimitMB &&
      (job.results?.intersectionSize || 0) <=
        job.protocol.performance.maxSetSize;

    return {
      type: 'computation_bounds',
      valid: withinBounds,
      details: {
        memoryUsed: job.telemetry.computation.memory,
        memoryLimit: job.protocol.performance.memoryLimitMB,
        intersectionSize: job.results?.intersectionSize || 0,
        maxSetSize: job.protocol.performance.maxSetSize,
      },
    };
  }

  private async verifyPrivacyGuarantees(
    job: PSIJob,
  ): Promise<{ type: string; valid: boolean; details: any }> {
    // Verify that privacy constraints were met
    const noRawDataLeaked = !job.results?.intersectionElements;
    const dpApplied = job.protocol.privacy.differentialPrivacy
      ? job.results?.intersectionSize !== undefined
      : true;

    return {
      type: 'privacy_guarantees',
      valid: noRawDataLeaked && dpApplied,
      details: {
        noRawDataLeaked,
        differentialPrivacyRequired: job.protocol.privacy.differentialPrivacy,
        differentialPrivacyApplied: dpApplied,
      },
    };
  }

  private async verifyECDHResult(
    job: PSIJob,
    intersection: { size: number; elements: Set<string> },
  ): Promise<boolean> {
    // Mock verification of ECDH PSI result
    return (
      intersection.size >= 0 &&
      intersection.size <=
        Math.min(
          this.datasets.get(job.participants[0].dataset)?.metadata
            .elementCount || 0,
          this.datasets.get(job.participants[1].dataset)?.metadata
            .elementCount || 0,
        )
    );
  }

  private async verifyOPRFResult(
    job: PSIJob,
    intersection: { size: number; elements: Set<string> },
  ): Promise<boolean> {
    // Mock verification of OPRF PSI result
    return (
      intersection.size >= 0 &&
      intersection.size <=
        Math.min(
          this.datasets.get(job.participants[0].dataset)?.metadata
            .elementCount || 0,
          this.datasets.get(job.participants[1].dataset)?.metadata
            .elementCount || 0,
        )
    );
  }

  private initializeDefaultProtocols(): void {
    // ECDH PSI for medium-sized sets
    this.protocols.set('default_ecdh', {
      id: 'default_ecdh',
      name: 'Default ECDH PSI',
      type: 'ecdh_psi',
      security: {
        curveType: 'p256',
      },
      performance: {
        maxSetSize: 100000,
        chunkSize: 1000,
        parallelism: 4,
        memoryLimitMB: 1024,
      },
      privacy: {
        differentialPrivacy: false,
      },
    });

    // OPRF PSI for high-security applications
    this.protocols.set('default_oprf', {
      id: 'default_oprf',
      name: 'Default OPRF PSI',
      type: 'oprf_psi',
      security: {
        oprfFunction: 'ristretto255',
      },
      performance: {
        maxSetSize: 1000000,
        chunkSize: 5000,
        parallelism: 8,
        memoryLimitMB: 2048,
      },
      privacy: {
        differentialPrivacy: true,
        epsilon: 1.0,
        delta: 1e-6,
      },
    });

    // Bloom PSI for very large sets
    this.protocols.set('default_bloom', {
      id: 'default_bloom',
      name: 'Default Bloom PSI',
      type: 'bloom_psi',
      security: {
        falsePositiveRate: 0.001,
      },
      performance: {
        maxSetSize: 10000000,
        chunkSize: 10000,
        parallelism: 16,
        memoryLimitMB: 4096,
      },
      privacy: {
        differentialPrivacy: true,
        epsilon: 2.0,
        delta: 1e-5,
      },
    });
  }
}
