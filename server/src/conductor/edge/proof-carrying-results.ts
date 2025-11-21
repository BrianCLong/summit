// Proof-Carrying Results: Edge sessions produce results with cryptographic attestations
// Enables verification of computations performed offline

import crypto from 'crypto';
import Redis from 'ioredis';
import { Pool } from 'pg';
import logger from '../../config/logger.js';
import { dualNotary } from '../../federal/dual-notary.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

// Result produced by an edge computation
export interface ProofCarryingResult {
  resultId: string;
  sessionId: string;
  nodeId: string;
  computationType:
    | 'investigation'
    | 'analysis'
    | 'search'
    | 'inference'
    | 'aggregation';
  inputs: ComputationInput[];
  outputs: ComputationOutput[];
  proof: ComputationProof;
  attestation: ResultAttestation;
  timestamp: Date;
  metadata: {
    executionTime: number; // milliseconds
    resourceUsage: ResourceUsage;
    policyCompliant: boolean;
    verified: boolean;
  };
}

// Input to a computation
export interface ComputationInput {
  inputId: string;
  inputType: 'entity' | 'claim' | 'dataset' | 'parameter';
  sourceId: string; // Entity ID or claim ID
  valueHash: string; // Commitment to input value
  provenance?: string[]; // Chain of custody
}

// Output of a computation
export interface ComputationOutput {
  outputId: string;
  outputType: 'finding' | 'score' | 'classification' | 'relationship' | 'alert';
  valueHash: string; // Commitment to output value
  value?: any; // Revealed value (if allowed by policy)
  confidence?: number;
  derivation: string[]; // Input IDs that contributed
}

// Proof of correct computation
export interface ComputationProof {
  proofType:
    | 'deterministic'
    | 'probabilistic'
    | 'zero-knowledge'
    | 'trusted-execution';
  proofData: string; // Encoded proof
  algorithm: string; // Algorithm used
  version: string; // Algorithm version
  parameters: Record<string, any>; // Public parameters
  signature: string; // Signature over proof
  verificationKey?: string; // Public key for verification
}

// Attestation from the executing environment
export interface ResultAttestation {
  attestationType: 'node' | 'tee' | 'hsm' | 'multi-party';
  attestor: string; // Node ID or TEE identity
  attestationData: string; // Encoded attestation
  nonce: string; // Freshness proof
  timestamp: Date;
  signature: string; // Signature by attestor
  chainOfTrust: string[]; // Trust anchors
}

// Resource usage metadata
export interface ResourceUsage {
  cpuTimeMs: number;
  memoryBytes: number;
  storageReads: number;
  storageWrites: number;
  networkCalls: number;
}

// Verification result
export interface ResultVerificationResult {
  valid: boolean;
  resultId: string;
  checks: {
    proofValid: boolean;
    attestationValid: boolean;
    inputsValid: boolean;
    outputsConsistent: boolean;
    policyCompliant: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Proof-Carrying Result System
 */
export class ProofCarryingResultSystem {
  private redis: Redis;
  private pool: Pool;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  /**
   * Create a proof-carrying result for a computation
   */
  async createResult(params: {
    sessionId: string;
    nodeId: string;
    computationType: ProofCarryingResult['computationType'];
    inputs: Array<{
      inputType: ComputationInput['inputType'];
      sourceId: string;
      value: any;
      provenance?: string[];
    }>;
    outputs: Array<{
      outputType: ComputationOutput['outputType'];
      value: any;
      confidence?: number;
      derivedFrom: string[]; // Input IDs
    }>;
    algorithm: string;
    version: string;
    parameters: Record<string, any>;
    executionTime: number;
    resourceUsage: ResourceUsage;
  }): Promise<ProofCarryingResult> {
    try {
      const resultId = crypto.randomUUID();
      const timestamp = new Date();

      logger.info('Creating proof-carrying result', {
        resultId,
        sessionId: params.sessionId,
        computationType: params.computationType,
      });

      // Process inputs
      const inputs: ComputationInput[] = params.inputs.map((input, index) => {
        const inputId = `${resultId}_input_${index}`;
        const valueHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(input.value))
          .digest('hex');

        return {
          inputId,
          inputType: input.inputType,
          sourceId: input.sourceId,
          valueHash,
          provenance: input.provenance,
        };
      });

      // Process outputs
      const outputs: ComputationOutput[] = params.outputs.map(
        (output, index) => {
          const outputId = `${resultId}_output_${index}`;
          const valueHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(output.value))
            .digest('hex');

          return {
            outputId,
            outputType: output.outputType,
            valueHash,
            value: output.value, // Store actual value
            confidence: output.confidence,
            derivation: output.derivedFrom,
          };
        },
      );

      // Create computation proof
      const proof = await this.createComputationProof(
        inputs,
        outputs,
        params.algorithm,
        params.version,
        params.parameters,
      );

      // Create attestation
      const attestation = await this.createAttestation(
        params.nodeId,
        resultId,
        timestamp,
      );

      // Check policy compliance
      const policyCompliant = await this.checkPolicyCompliance(
        params.computationType,
        inputs,
        outputs,
      );

      const result: ProofCarryingResult = {
        resultId,
        sessionId: params.sessionId,
        nodeId: params.nodeId,
        computationType: params.computationType,
        inputs,
        outputs,
        proof,
        attestation,
        timestamp,
        metadata: {
          executionTime: params.executionTime,
          resourceUsage: params.resourceUsage,
          policyCompliant,
          verified: false, // Will be set after verification
        },
      };

      // Verify immediately
      const verification = await this.verifyResult(result);
      result.metadata.verified = verification.valid;

      if (!verification.valid) {
        logger.warn('Result failed verification', {
          resultId,
          errors: verification.errors,
        });
      }

      // Store result
      await this.storeResult(result);

      // Record metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'proof_carrying_result_created',
        true,
        {
          node_id: params.nodeId,
          computation_type: params.computationType,
          verified: result.metadata.verified.toString(),
        },
      );

      logger.info('Proof-carrying result created', {
        resultId,
        verified: result.metadata.verified,
        inputCount: inputs.length,
        outputCount: outputs.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create proof-carrying result', { error });
      throw error;
    }
  }

  /**
   * Create computation proof
   */
  private async createComputationProof(
    inputs: ComputationInput[],
    outputs: ComputationOutput[],
    algorithm: string,
    version: string,
    parameters: Record<string, any>,
  ): Promise<ComputationProof> {
    // Create deterministic proof by hashing computation trace
    const computationTrace = {
      inputs: inputs.map((i) => i.valueHash),
      outputs: outputs.map((o) => o.valueHash),
      algorithm,
      version,
      parameters,
    };

    const proofData = crypto
      .createHash('sha256')
      .update(JSON.stringify(computationTrace))
      .digest('hex');

    // Sign the proof
    const notarized = await dualNotary.notarizeRoot(proofData);

    return {
      proofType: 'deterministic',
      proofData,
      algorithm,
      version,
      parameters,
      signature: notarized.hsmSignature,
      verificationKey: 'hsm-public-key', // In production, use actual public key
    };
  }

  /**
   * Create attestation for the result
   */
  private async createAttestation(
    nodeId: string,
    resultId: string,
    timestamp: Date,
  ): Promise<ResultAttestation> {
    const nonce = crypto.randomBytes(32).toString('hex');

    // Create attestation data
    const attestationData = {
      nodeId,
      resultId,
      timestamp: timestamp.toISOString(),
      nonce,
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        // In production, include TEE measurements
      },
    };

    const attestationDataString = JSON.stringify(attestationData);
    const attestationHash = crypto
      .createHash('sha256')
      .update(attestationDataString)
      .digest('hex');

    // Sign attestation
    const notarized = await dualNotary.notarizeRoot(attestationHash);

    return {
      attestationType: 'node',
      attestor: nodeId,
      attestationData: Buffer.from(attestationDataString).toString('base64'),
      nonce,
      timestamp,
      signature: notarized.hsmSignature,
      chainOfTrust: ['hsm-root', nodeId],
    };
  }

  /**
   * Check if computation is policy compliant
   */
  private async checkPolicyCompliance(
    computationType: string,
    inputs: ComputationInput[],
    outputs: ComputationOutput[],
  ): Promise<boolean> {
    // Simplified policy check
    // In production, would query OPA or policy engine

    // Check input count constraints
    if (inputs.length === 0) {
      logger.warn('No inputs for computation');
      return false;
    }

    // Check output count constraints
    if (outputs.length === 0) {
      logger.warn('No outputs for computation');
      return false;
    }

    // All checks passed
    return true;
  }

  /**
   * Verify a proof-carrying result
   */
  async verifyResult(
    result: ProofCarryingResult,
  ): Promise<ResultVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Verify proof
      const proofValid = await this.verifyComputationProof(result.proof);
      if (!proofValid) {
        errors.push('Computation proof invalid');
      }

      // Verify attestation
      const attestationValid = await this.verifyAttestation(result.attestation);
      if (!attestationValid) {
        errors.push('Attestation invalid');
      }

      // Verify inputs
      const inputsValid = await this.verifyInputs(result.inputs);
      if (!inputsValid) {
        errors.push('One or more inputs invalid');
      }

      // Verify output consistency with inputs
      const outputsConsistent = this.verifyOutputConsistency(
        result.inputs,
        result.outputs,
      );
      if (!outputsConsistent) {
        warnings.push('Outputs may not be consistent with inputs');
      }

      // Verify policy compliance
      const policyCompliant = result.metadata.policyCompliant;
      if (!policyCompliant) {
        errors.push('Result violates policy constraints');
      }

      const checks = {
        proofValid,
        attestationValid,
        inputsValid,
        outputsConsistent,
        policyCompliant,
      };

      const valid = errors.length === 0 && Object.values(checks).every((c) => c);

      return {
        valid,
        resultId: result.resultId,
        checks,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('Result verification failed', {
        error,
        resultId: result.resultId,
      });
      return {
        valid: false,
        resultId: result.resultId,
        checks: {
          proofValid: false,
          attestationValid: false,
          inputsValid: false,
          outputsConsistent: false,
          policyCompliant: false,
        },
        errors: [error.message],
        warnings,
      };
    }
  }

  /**
   * Verify computation proof
   */
  private async verifyComputationProof(
    proof: ComputationProof,
  ): Promise<boolean> {
    try {
      // Verify signature
      const notarized = {
        rootHex: proof.proofData,
        hsmSignature: proof.signature,
        timestamp: new Date(),
        notarizedBy: ['HSM'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);
      return verification.hsmVerification;
    } catch (error) {
      logger.error('Proof verification failed', { error });
      return false;
    }
  }

  /**
   * Verify attestation
   */
  private async verifyAttestation(
    attestation: ResultAttestation,
  ): Promise<boolean> {
    try {
      // Decode attestation data
      const attestationDataString = Buffer.from(
        attestation.attestationData,
        'base64',
      ).toString('utf-8');
      const attestationHash = crypto
        .createHash('sha256')
        .update(attestationDataString)
        .digest('hex');

      // Verify signature
      const notarized = {
        rootHex: attestationHash,
        hsmSignature: attestation.signature,
        timestamp: attestation.timestamp,
        notarizedBy: ['HSM'] as ('HSM' | 'TSA')[],
        verification: { hsmValid: false, tsaValid: false },
      };

      const verification = await dualNotary.verifyNotarizedRoot(notarized);

      // Check nonce freshness (in production, check against replay cache)
      const nonceValid = attestation.nonce.length === 64; // 32 bytes hex

      return verification.hsmVerification && nonceValid;
    } catch (error) {
      logger.error('Attestation verification failed', { error });
      return false;
    }
  }

  /**
   * Verify inputs
   */
  private async verifyInputs(inputs: ComputationInput[]): Promise<boolean> {
    // Check that all input hashes are valid
    for (const input of inputs) {
      if (!/^[0-9a-f]{64}$/i.test(input.valueHash)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verify output consistency
   */
  private verifyOutputConsistency(
    inputs: ComputationInput[],
    outputs: ComputationOutput[],
  ): boolean {
    // Check that all output derivations reference valid inputs
    const inputIds = new Set(inputs.map((i) => i.inputId));

    for (const output of outputs) {
      for (const derivedFrom of output.derivation) {
        if (!inputIds.has(derivedFrom)) {
          logger.warn('Output references unknown input', {
            output: output.outputId,
            unknownInput: derivedFrom,
          });
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Store result in database
   */
  private async storeResult(result: ProofCarryingResult): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO proof_carrying_results (
        result_id, session_id, node_id, computation_type,
        inputs, outputs, proof, attestation, timestamp, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (result_id) DO NOTHING
    `,
      [
        result.resultId,
        result.sessionId,
        result.nodeId,
        result.computationType,
        JSON.stringify(result.inputs),
        JSON.stringify(result.outputs),
        JSON.stringify(result.proof),
        JSON.stringify(result.attestation),
        result.timestamp,
        JSON.stringify(result.metadata),
      ],
    );

    // Cache in Redis
    await this.redis.setex(
      `pcr:${result.resultId}`,
      86400, // 24 hours
      JSON.stringify(result),
    );
  }

  /**
   * Retrieve result by ID
   */
  async getResult(resultId: string): Promise<ProofCarryingResult | null> {
    // Try Redis first
    const cached = await this.redis.get(`pcr:${resultId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fall back to PostgreSQL
    const result = await this.pool.query(
      'SELECT * FROM proof_carrying_results WHERE result_id = $1',
      [resultId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      resultId: row.result_id,
      sessionId: row.session_id,
      nodeId: row.node_id,
      computationType: row.computation_type,
      inputs: row.inputs,
      outputs: row.outputs,
      proof: row.proof,
      attestation: row.attestation,
      timestamp: row.timestamp,
      metadata: row.metadata,
    };
  }

  /**
   * Get results for a session
   */
  async getSessionResults(
    sessionId: string,
  ): Promise<ProofCarryingResult[]> {
    const result = await this.pool.query(
      `SELECT * FROM proof_carrying_results
       WHERE session_id = $1
       ORDER BY timestamp DESC`,
      [sessionId],
    );

    return result.rows.map((row) => ({
      resultId: row.result_id,
      sessionId: row.session_id,
      nodeId: row.node_id,
      computationType: row.computation_type,
      inputs: row.inputs,
      outputs: row.outputs,
      proof: row.proof,
      attestation: row.attestation,
      timestamp: row.timestamp,
      metadata: row.metadata,
    }));
  }
}

// Export singleton
export const proofCarryingResultSystem = new ProofCarryingResultSystem();
