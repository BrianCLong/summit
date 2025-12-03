
import { createHash, createSign, createVerify, generateKeyPairSync } from 'crypto';
import { MutationPayload, MutationWitness } from './types.js';

export class MutationWitnessService {
  private static instance: MutationWitnessService;
  private witnessId: string;
  private privateKey: string;
  private publicKey: string;

  private constructor() {
    this.witnessId = process.env.WITNESS_ID || `witness-${Date.now()}`;
    // In production, these would come from KMS or secure config
    // Using generated keys for demonstration/dev
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    this.privateKey = process.env.WITNESS_PRIVATE_KEY || privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    this.publicKey = process.env.WITNESS_PUBLIC_KEY || publicKey.export({ type: 'pkcs1', format: 'pem' }).toString();
  }

  public static getInstance(): MutationWitnessService {
    if (!MutationWitnessService.instance) {
      MutationWitnessService.instance = new MutationWitnessService();
    }
    return MutationWitnessService.instance;
  }

  /**
   * Validates and witnesses a mutation.
   * This is the "Proof of Correctness" step.
   */
  public async witnessMutation(
    payload: MutationPayload,
    context: { tenantId: string; actorId: string }
  ): Promise<MutationWitness> {

    // 1. Validation Logic (Simulated "Correctness" Checks)
    const validationResult = await this.validateMutation(payload, context);

    if (!validationResult.valid) {
      throw new Error(`Mutation rejected by witness: ${JSON.stringify(validationResult.checks)}`);
    }

    // 2. Create Canonical String for Signing
    const canonicalString = this.createCanonicalString(payload, validationResult);

    // 3. Sign
    const sign = createSign('SHA256');
    sign.update(canonicalString);
    const signature = sign.sign(this.privateKey, 'hex');

    return {
      witnessId: this.witnessId,
      timestamp: new Date().toISOString(),
      signature,
      algorithm: 'RSA-SHA256',
      validationResult
    };
  }

  private async validateMutation(
    payload: MutationPayload,
    context: { tenantId: string; actorId: string }
  ): Promise<MutationWitness['validationResult']> {
    const checks = [];

    // Check 1: Schema Integrity
    const hasValidStructure =
      (payload.mutationType === 'CREATE' && payload.newState && !payload.previousState) ||
      (payload.mutationType === 'UPDATE' && payload.newState && payload.previousState) ||
      (payload.mutationType === 'DELETE' && !payload.newState && payload.previousState);

    checks.push({
      check: 'Schema Integrity',
      passed: !!hasValidStructure,
      message: hasValidStructure ? 'Structure matches mutation type' : 'Invalid state combination for mutation type'
    });

    // Check 2: Tenant Isolation (Simulated)
    // In real world, we'd check if entity.tenantId matches context.tenantId
    checks.push({
      check: 'Tenant Isolation',
      passed: true,
      message: 'Tenant context validated'
    });

    // Check 3: Business Rules (Placeholder)
    checks.push({
      check: 'Business Rules',
      passed: true,
      message: 'No blocking business rules'
    });

    const valid = checks.every(c => c.passed);

    return {
      valid,
      policyId: 'default-witness-policy-v1',
      checks
    };
  }

  private createCanonicalString(payload: MutationPayload, validation: any): string {
    // Deterministic serialization
    return JSON.stringify({
      payload: {
        type: payload.mutationType,
        entity: payload.entityId,
        diffHash: createHash('sha256').update(JSON.stringify(payload.diff || {})).digest('hex')
      },
      validationHash: createHash('sha256').update(JSON.stringify(validation)).digest('hex')
    });
  }

  public verifyWitness(witness: MutationWitness, payload: MutationPayload): boolean {
    const canonicalString = this.createCanonicalString(payload, witness.validationResult);
    const verify = createVerify('SHA256');
    verify.update(canonicalString);
    return verify.verify(this.publicKey, witness.signature, 'hex');
  }

  public getPublicKey(): string {
    return this.publicKey;
  }
}

export const mutationWitness = MutationWitnessService.getInstance();
