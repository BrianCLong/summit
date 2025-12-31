
import { AssuranceClaim, Attestation, AttestationProfile } from '../types.js';
import * as crypto from 'crypto';
import { PROFILES } from '../profiles.js';
import { AttestationRepository } from '../db/AttestationRepository.js';
import stringify from 'fast-json-stable-stringify';

export interface ClaimProvider {
  domain: string;
  getClaims(tenantId: string): Promise<AssuranceClaim[]>;
}

export class AttestationEngine {
  private static instance: AttestationEngine;
  private providers: ClaimProvider[] = [];
  private repository: AttestationRepository;

  private publicKey: string | null = null;
  private privateKey: string | null = null;

  private constructor() {
    this.repository = AttestationRepository.getInstance();
    this.repository.createTableIfNotExists().catch(err => {
      console.error('Failed to initialize Attestation table', err);
    });

    // Initialize Keys
    this.privateKey = process.env.ATTESTATION_PRIVATE_KEY || null;
    this.publicKey = process.env.ATTESTATION_PUBLIC_KEY || null;

    if (!this.privateKey && process.env.NODE_ENV !== 'production') {
      console.warn('Using ephemeral keys for prototype/dev mode');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  public static getInstance(): AttestationEngine {
    if (!AttestationEngine.instance) {
      AttestationEngine.instance = new AttestationEngine();
    }
    return AttestationEngine.instance;
  }

  public registerProvider(provider: ClaimProvider) {
    this.providers.push(provider);
  }

  public getProfile(profileId: string): AttestationProfile | undefined {
    return PROFILES[profileId];
  }

  public getPublicKey(): string | null {
    return this.publicKey;
  }

  public async generateAttestation(tenantId: string, profileId?: string): Promise<Attestation> {
    if (!this.privateKey) {
        throw new Error('ATTESTATION_PRIVATE_KEY must be configured');
    }

    const profile = profileId ? this.getProfile(profileId) : undefined;
    if (profileId && !profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const allClaims: AssuranceClaim[] = [];

    // 1. Gather claims
    for (const provider of this.providers) {
      try {
        const claims = await provider.getClaims(tenantId);
        allClaims.push(...claims);
      } catch (error) {
        console.error(`Failed to get claims from provider ${provider.domain}`, error);
        throw new Error(`Assurance generation failed: Provider ${provider.domain} returned error`);
      }
    }

    // 2. Filter by profile
    let finalClaims = allClaims;
    if (profile) {
      const availableClaimTypes = new Set(allClaims.map(c => c.claim));

      const missingClaims = profile.requiredClaims.filter(
        req => !availableClaimTypes.has(req)
      );

      if (missingClaims.length > 0) {
        throw new Error(`Assurance profile ${profile.name} not satisfied. Missing claims: ${missingClaims.join(', ')}`);
      }

      finalClaims = allClaims.filter(c => profile.requiredClaims.includes(c.claim));
    }

    // 3. Construct Attestation
    const attestation: Attestation = {
      id: crypto.randomUUID(),
      tenantId,
      timestamp: new Date().toISOString(),
      claims: finalClaims,
      signature: '',
      metadata: {
        engineVersion: '1.0.0',
        profile: profile?.id
      }
    };

    // 4. Sign Attestation
    attestation.signature = this.signAttestation(attestation);

    // 5. Persist
    await this.repository.save(attestation);

    return attestation;
  }

  private signAttestation(attestation: Attestation): string {
    if (!this.privateKey) throw new Error('No private key available');

    // Canonical serialization
    const payload = stringify({
      id: attestation.id,
      tenantId: attestation.tenantId,
      timestamp: attestation.timestamp,
      claims: attestation.claims
    });

    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  public async verifyAttestation(attestation: Attestation): Promise<boolean> {
     if (!this.publicKey) {
        throw new Error('ATTESTATION_PUBLIC_KEY must be configured for verification');
    }

     // 1. Check Signature
     const payload = stringify({
      id: attestation.id,
      tenantId: attestation.tenantId,
      timestamp: attestation.timestamp,
      claims: attestation.claims
    });

    const verify = crypto.createVerify('SHA256');
    verify.update(payload);
    verify.end();

    const isSigValid = verify.verify(this.publicKey, attestation.signature, 'base64');

    if (!isSigValid) return false;

    // 2. Check Expiry
    const now = new Date();
    for (const claim of attestation.claims) {
      if (new Date(claim.validUntil) < now) {
        return false;
      }
    }

    // 3. Check Revocation
    try {
        const isRevoked = await this.repository.isRevoked(attestation.id);
        if (isRevoked) return false;
    } catch (error) {
        console.error('Failed to check revocation status', error);
        return false; // Fail closed
    }

    return true;
  }

  public async getAttestation(id: string): Promise<Attestation | null> {
    return this.repository.getById(id);
  }

  public async listAttestations(tenantId: string, profileId?: string): Promise<Attestation[]> {
    const all = await this.repository.listByTenant(tenantId);
    if (!profileId) return all;
    return all.filter(a => a.metadata.profile === profileId);
  }

  public async revokeAttestation(id: string, reason: string): Promise<void> {
      await this.repository.revoke(id, reason);
  }
}
