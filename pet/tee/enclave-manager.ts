/**
 * Trusted Execution Environment (TEE) Enclave Manager
 * Sprint 28B: Privacy-Enhancing Computation - Secure attested computation
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface EnclaveConfig {
  id: string;
  type: 'sgx' | 'sev' | 'trustzone' | 'keystone' | 'nitro';
  name: string;
  version: string;
  security: {
    attestationRequired: boolean;
    remoteAttestation: boolean;
    sealedStorage: boolean;
    memoryEncryption: boolean;
    integrityProtection: boolean;
  };
  resources: {
    maxMemoryMB: number;
    maxComputeTimeMS: number;
    maxStorageMB: number;
    networkAccess: boolean;
  };
  policies: {
    dataRetention: 'none' | 'temporary' | 'persistent';
    auditLevel: 'minimal' | 'standard' | 'comprehensive';
    emergencyTermination: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EnclaveInstance {
  id: string;
  configId: string;
  status: 'initializing' | 'running' | 'suspended' | 'terminated' | 'error';
  attestation: {
    quote: string;
    measurement: string;
    signature: string;
    timestamp: Date;
    verificationStatus: 'pending' | 'verified' | 'failed';
  };
  runtime: {
    startTime: Date;
    lastActivity: Date;
    computeTimeUsed: number;
    memoryUsed: number;
    storageUsed: number;
  };
  sealed: {
    keys: Map<string, string>;
    data: Map<string, Buffer>;
  };
  audit: {
    operations: string[];
    accessLog: Array<{
      timestamp: Date;
      operation: string;
      requestor: string;
      approved: boolean;
    }>;
  };
}

export interface SecureComputation {
  id: string;
  enclaveId: string;
  function: string;
  inputs: Array<{
    id: string;
    encrypted: boolean;
    sealed: boolean;
    hash: string;
  }>;
  outputs: Array<{
    id: string;
    encrypted: boolean;
    sealed: boolean;
    hash: string;
  }>;
  computation: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    exitCode?: number;
    error?: string;
  };
  attestation: {
    inputsVerified: boolean;
    computationAttested: boolean;
    outputsSealed: boolean;
    integrityProof: string;
  };
  metadata: {
    requestor: string;
    purpose: string;
    confidentialityLevel: string;
  };
}

export interface AttestationReport {
  enclaveId: string;
  quote: string;
  measurement: {
    mrenclave: string; // Enclave measurement
    mrsigner: string; // Signer measurement
    isvprodid: number;
    isvsvn: number;
  };
  tcb: {
    cpusvn: string;
    pcesvn: number;
    sgxType: string;
  };
  timestamp: Date;
  verification: {
    status: 'valid' | 'invalid' | 'revoked' | 'unknown';
    certificateChain: string[];
    revocationList: string[];
  };
}

export class EnclaveManager extends EventEmitter {
  private configs = new Map<string, EnclaveConfig>();
  private instances = new Map<string, EnclaveInstance>();
  private computations = new Map<string, SecureComputation>();
  private attestations = new Map<string, AttestationReport>();

  constructor() {
    super();
  }

  /**
   * Register enclave configuration
   */
  async registerConfig(
    config: Omit<EnclaveConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EnclaveConfig> {
    const fullConfig: EnclaveConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate configuration
    await this.validateEnclaveConfig(fullConfig);

    this.configs.set(fullConfig.id, fullConfig);
    this.emit('config_registered', fullConfig);

    return fullConfig;
  }

  /**
   * Create and initialize enclave instance
   */
  async createEnclave(
    configId: string,
    requestor: string,
  ): Promise<EnclaveInstance> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Enclave configuration not found');
    }

    const instance: EnclaveInstance = {
      id: crypto.randomUUID(),
      configId,
      status: 'initializing',
      attestation: {
        quote: '',
        measurement: '',
        signature: '',
        timestamp: new Date(),
        verificationStatus: 'pending',
      },
      runtime: {
        startTime: new Date(),
        lastActivity: new Date(),
        computeTimeUsed: 0,
        memoryUsed: 0,
        storageUsed: 0,
      },
      sealed: {
        keys: new Map(),
        data: new Map(),
      },
      audit: {
        operations: [],
        accessLog: [
          {
            timestamp: new Date(),
            operation: 'create',
            requestor,
            approved: true,
          },
        ],
      },
    };

    try {
      // Initialize enclave based on type
      await this.initializeEnclave(instance, config);

      // Generate attestation
      const attestation = await this.generateAttestation(instance, config);
      instance.attestation = {
        quote: attestation.quote,
        measurement: attestation.measurement.mrenclave,
        signature: attestation.verification.certificateChain[0] || '',
        timestamp: attestation.timestamp,
        verificationStatus:
          attestation.verification.status === 'valid' ? 'verified' : 'failed',
      };

      this.attestations.set(instance.id, attestation);

      if (instance.attestation.verificationStatus === 'verified') {
        instance.status = 'running';
      } else {
        instance.status = 'error';
        throw new Error('Attestation failed');
      }

      this.instances.set(instance.id, instance);
      this.emit('enclave_created', instance);

      return instance;
    } catch (error) {
      instance.status = 'error';
      this.instances.set(instance.id, instance);
      throw error;
    }
  }

  /**
   * Execute secure computation in enclave
   */
  async executeSecureComputation(
    enclaveId: string,
    functionName: string,
    inputs: Array<{ data: Buffer; encrypted?: boolean }>,
    requestor: string,
    purpose: string,
  ): Promise<SecureComputation> {
    const instance = this.instances.get(enclaveId);
    if (!instance) {
      throw new Error('Enclave instance not found');
    }

    if (instance.status !== 'running') {
      throw new Error('Enclave is not running');
    }

    const computation: SecureComputation = {
      id: crypto.randomUUID(),
      enclaveId,
      function: functionName,
      inputs: inputs.map((input) => ({
        id: crypto.randomUUID(),
        encrypted: input.encrypted || false,
        sealed: false,
        hash: crypto.createHash('sha256').update(input.data).digest('hex'),
      })),
      outputs: [],
      computation: {
        startTime: new Date(),
      },
      attestation: {
        inputsVerified: false,
        computationAttested: false,
        outputsSealed: false,
        integrityProof: '',
      },
      metadata: {
        requestor,
        purpose,
        confidentialityLevel: 'HIGH',
      },
    };

    try {
      // Verify input integrity
      computation.attestation.inputsVerified =
        await this.verifyInputIntegrity(inputs);

      // Seal inputs in enclave
      const sealedInputs = await this.sealInputsInEnclave(instance, inputs);

      // Execute computation
      const results = await this.performSecureComputation(
        instance,
        functionName,
        sealedInputs,
      );

      // Seal outputs
      const sealedOutputs = await this.sealOutputsInEnclave(instance, results);
      computation.outputs = sealedOutputs.map((output) => ({
        id: crypto.randomUUID(),
        encrypted: true,
        sealed: true,
        hash: crypto.createHash('sha256').update(output.data).digest('hex'),
      }));

      computation.computation.endTime = new Date();
      computation.computation.duration =
        computation.computation.endTime.getTime() -
        computation.computation.startTime.getTime();
      computation.computation.exitCode = 0;

      // Generate attestation proof
      computation.attestation.computationAttested = true;
      computation.attestation.outputsSealed = true;
      computation.attestation.integrityProof =
        await this.generateIntegrityProof(computation, instance);

      // Update instance runtime
      instance.runtime.lastActivity = new Date();
      instance.runtime.computeTimeUsed += computation.computation.duration;
      instance.audit.operations.push(`compute:${functionName}`);

      this.instances.set(enclaveId, instance);
      this.computations.set(computation.id, computation);

      this.emit('secure_computation_completed', computation);

      return computation;
    } catch (error) {
      computation.computation.endTime = new Date();
      computation.computation.error = error.message;
      computation.computation.exitCode = 1;

      this.computations.set(computation.id, computation);
      throw error;
    }
  }

  /**
   * Unseal data from enclave
   */
  async unsealData(
    enclaveId: string,
    sealedDataId: string,
    requestor: string,
  ): Promise<Buffer> {
    const instance = this.instances.get(enclaveId);
    if (!instance) {
      throw new Error('Enclave instance not found');
    }

    const sealedData = instance.sealed.data.get(sealedDataId);
    if (!sealedData) {
      throw new Error('Sealed data not found');
    }

    // Log access
    instance.audit.accessLog.push({
      timestamp: new Date(),
      operation: `unseal:${sealedDataId}`,
      requestor,
      approved: true,
    });

    this.instances.set(enclaveId, instance);

    // Unseal using enclave key
    const unsealedData = await this.performUnseal(instance, sealedData);

    this.emit('data_unsealed', { enclaveId, dataId: sealedDataId, requestor });

    return unsealedData;
  }

  /**
   * Terminate enclave instance
   */
  async terminateEnclave(enclaveId: string, requestor: string): Promise<void> {
    const instance = this.instances.get(enclaveId);
    if (!instance) {
      throw new Error('Enclave instance not found');
    }

    const config = this.configs.get(instance.configId);
    if (!config) {
      throw new Error('Enclave configuration not found');
    }

    // Clear sealed data if policy requires
    if (config.policies.dataRetention === 'none') {
      instance.sealed.keys.clear();
      instance.sealed.data.clear();
    }

    instance.status = 'terminated';
    instance.audit.accessLog.push({
      timestamp: new Date(),
      operation: 'terminate',
      requestor,
      approved: true,
    });

    this.instances.set(enclaveId, instance);

    // Perform platform-specific cleanup
    await this.cleanupEnclave(instance, config);

    this.emit('enclave_terminated', { enclaveId, requestor });
  }

  /**
   * Verify remote attestation
   */
  async verifyRemoteAttestation(
    quote: string,
    expectedMeasurement?: string,
  ): Promise<{
    valid: boolean;
    report: AttestationReport;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Parse quote and extract attestation report
      const report = await this.parseAttestationQuote(quote);

      // Verify certificate chain
      const certChainValid = await this.verifyCertificateChain(
        report.verification.certificateChain,
      );
      if (!certChainValid) {
        errors.push('Invalid certificate chain');
      }

      // Check revocation list
      const revoked = await this.checkRevocationStatus(report);
      if (revoked) {
        errors.push('Certificate revoked');
      }

      // Verify measurement if provided
      if (
        expectedMeasurement &&
        report.measurement.mrenclave !== expectedMeasurement
      ) {
        errors.push('Measurement mismatch');
      }

      // Verify TCB level
      const tcbValid = await this.verifyTCBLevel(report.tcb);
      if (!tcbValid) {
        errors.push('Invalid TCB level');
      }

      const valid = errors.length === 0;
      report.verification.status = valid ? 'valid' : 'invalid';

      this.attestations.set(report.enclaveId, report);

      return { valid, report, errors };
    } catch (error) {
      errors.push(`Attestation verification failed: ${error.message}`);

      const failedReport: AttestationReport = {
        enclaveId: crypto.randomUUID(),
        quote,
        measurement: {
          mrenclave: '',
          mrsigner: '',
          isvprodid: 0,
          isvsvn: 0,
        },
        tcb: {
          cpusvn: '',
          pcesvn: 0,
          sgxType: 'unknown',
        },
        timestamp: new Date(),
        verification: {
          status: 'invalid',
          certificateChain: [],
          revocationList: [],
        },
      };

      return { valid: false, report: failedReport, errors };
    }
  }

  /**
   * Get enclave instances
   */
  getInstances(status?: EnclaveInstance['status']): EnclaveInstance[] {
    const instances = Array.from(this.instances.values());
    return status ? instances.filter((i) => i.status === status) : instances;
  }

  /**
   * Get computation history
   */
  getComputations(enclaveId?: string, limit = 100): SecureComputation[] {
    const computations = Array.from(this.computations.values());

    const filtered = enclaveId
      ? computations.filter((c) => c.enclaveId === enclaveId)
      : computations;

    return filtered
      .sort(
        (a, b) =>
          b.computation.startTime.getTime() - a.computation.startTime.getTime(),
      )
      .slice(0, limit);
  }

  private async validateEnclaveConfig(config: EnclaveConfig): Promise<void> {
    if (config.resources.maxMemoryMB <= 0) {
      throw new Error('Invalid memory limit');
    }

    if (config.resources.maxComputeTimeMS <= 0) {
      throw new Error('Invalid compute time limit');
    }

    // Validate security requirements based on type
    switch (config.type) {
      case 'sgx':
        if (!config.security.attestationRequired) {
          throw new Error('SGX requires attestation');
        }
        break;
      case 'sev':
        if (!config.security.memoryEncryption) {
          throw new Error('SEV requires memory encryption');
        }
        break;
    }
  }

  private async initializeEnclave(
    instance: EnclaveInstance,
    config: EnclaveConfig,
  ): Promise<void> {
    // Platform-specific initialization
    switch (config.type) {
      case 'sgx':
        await this.initializeSGXEnclave(instance, config);
        break;
      case 'sev':
        await this.initializeSEVEnclave(instance, config);
        break;
      case 'nitro':
        await this.initializeNitroEnclave(instance, config);
        break;
      default:
        throw new Error(`Unsupported enclave type: ${config.type}`);
    }
  }

  private async initializeSGXEnclave(
    instance: EnclaveInstance,
    config: EnclaveConfig,
  ): Promise<void> {
    // SGX-specific initialization
    console.log(`Initializing SGX enclave ${instance.id}`);
  }

  private async initializeSEVEnclave(
    instance: EnclaveInstance,
    config: EnclaveConfig,
  ): Promise<void> {
    // AMD SEV-specific initialization
    console.log(`Initializing SEV enclave ${instance.id}`);
  }

  private async initializeNitroEnclave(
    instance: EnclaveInstance,
    config: EnclaveConfig,
  ): Promise<void> {
    // AWS Nitro-specific initialization
    console.log(`Initializing Nitro enclave ${instance.id}`);
  }

  private async generateAttestation(
    instance: EnclaveInstance,
    config: EnclaveConfig,
  ): Promise<AttestationReport> {
    // Generate mock attestation
    return {
      enclaveId: instance.id,
      quote: `mock_quote_${crypto.randomBytes(32).toString('hex')}`,
      measurement: {
        mrenclave: crypto.randomBytes(32).toString('hex'),
        mrsigner: crypto.randomBytes(32).toString('hex'),
        isvprodid: 1,
        isvsvn: 1,
      },
      tcb: {
        cpusvn: crypto.randomBytes(16).toString('hex'),
        pcesvn: 1,
        sgxType: config.type,
      },
      timestamp: new Date(),
      verification: {
        status: 'valid',
        certificateChain: [`cert_${crypto.randomBytes(16).toString('hex')}`],
        revocationList: [],
      },
    };
  }

  private async verifyInputIntegrity(
    inputs: Array<{ data: Buffer }>,
  ): Promise<boolean> {
    // Verify input data integrity
    return inputs.every((input) => input.data.length > 0);
  }

  private async sealInputsInEnclave(
    instance: EnclaveInstance,
    inputs: Array<{ data: Buffer }>,
  ): Promise<Array<{ id: string; sealed: Buffer }>> {
    return inputs.map((input) => ({
      id: crypto.randomUUID(),
      sealed: this.performSeal(instance, input.data),
    }));
  }

  private async performSecureComputation(
    instance: EnclaveInstance,
    functionName: string,
    inputs: Array<{ id: string; sealed: Buffer }>,
  ): Promise<Array<{ data: Buffer }>> {
    // Mock secure computation
    return inputs.map((input) => ({
      data: crypto.randomBytes(input.sealed.length / 2),
    }));
  }

  private async sealOutputsInEnclave(
    instance: EnclaveInstance,
    outputs: Array<{ data: Buffer }>,
  ): Promise<Array<{ id: string; data: Buffer }>> {
    return outputs.map((output) => {
      const id = crypto.randomUUID();
      const sealed = this.performSeal(instance, output.data);

      // Store in instance sealed data
      instance.sealed.data.set(id, sealed);

      return { id, data: sealed };
    });
  }

  private performSeal(instance: EnclaveInstance, data: Buffer): Buffer {
    // Mock sealing - in practice, use platform-specific sealing
    const key =
      instance.sealed.keys.get('master') || this.generateSealingKey(instance);
    instance.sealed.keys.set('master', key);

    const cipher = crypto.createCipher('aes-256-cbc', key);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  }

  private async performUnseal(
    instance: EnclaveInstance,
    sealedData: Buffer,
  ): Promise<Buffer> {
    const key = instance.sealed.keys.get('master');
    if (!key) {
      throw new Error('Sealing key not found');
    }

    const decipher = crypto.createDecipher('aes-256-cbc', key);
    return Buffer.concat([decipher.update(sealedData), decipher.final()]);
  }

  private generateSealingKey(instance: EnclaveInstance): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async generateIntegrityProof(
    computation: SecureComputation,
    instance: EnclaveInstance,
  ): Promise<string> {
    const data = JSON.stringify({
      computationId: computation.id,
      enclaveId: instance.id,
      inputs: computation.inputs.map((i) => i.hash),
      outputs: computation.outputs.map((o) => o.hash),
      function: computation.function,
      timestamp: computation.computation.startTime,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async parseAttestationQuote(
    quote: string,
  ): Promise<AttestationReport> {
    // Mock quote parsing
    return {
      enclaveId: crypto.randomUUID(),
      quote,
      measurement: {
        mrenclave: crypto.randomBytes(32).toString('hex'),
        mrsigner: crypto.randomBytes(32).toString('hex'),
        isvprodid: 1,
        isvsvn: 1,
      },
      tcb: {
        cpusvn: crypto.randomBytes(16).toString('hex'),
        pcesvn: 1,
        sgxType: 'sgx',
      },
      timestamp: new Date(),
      verification: {
        status: 'valid',
        certificateChain: [],
        revocationList: [],
      },
    };
  }

  private async verifyCertificateChain(chain: string[]): Promise<boolean> {
    return chain.length > 0;
  }

  private async checkRevocationStatus(
    report: AttestationReport,
  ): Promise<boolean> {
    return false; // Not revoked
  }

  private async verifyTCBLevel(
    tcb: AttestationReport['tcb'],
  ): Promise<boolean> {
    return tcb.pcesvn > 0;
  }

  private async cleanupEnclave(
    instance: EnclaveInstance,
    config: EnclaveConfig,
  ): Promise<void> {
    // Platform-specific cleanup
    console.log(`Cleaning up enclave ${instance.id}`);
  }
}
