/**
 * Proof-Carrying Publisher
 *
 * Main service that integrates all proof-carrying publishing components:
 * - Manifest generation
 * - Hash tree building
 * - Model card generation
 * - Citation validation
 * - Evidence wallet creation
 * - Revocation management
 * - Bundle verification
 */

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  ProofCarryingManifest,
  EvidenceWallet,
  AudienceScope,
  Citation,
  LicenseInfo,
  PublishValidationResult,
  VerificationResult,
  ModelCard,
} from './proof-carrying-types';
import { HashTreeBuilder } from './hash-tree-builder';
import { ModelCardGenerator, createModelCardFromExport } from './model-card-generator';
import { DisclosurePackager } from './disclosure-packager';
import { RevocationRegistry, PersistentRevocationRegistry } from './revocation-registry';
import { CitationValidator, PublishingPipeline, StandardLicenses } from './citation-validator';
import { BundleVerifier } from './bundle-verifier';
import { createSign } from 'crypto';

export interface PublisherConfig {
  privateKey: string;
  publicKey: string;
  algorithm?: 'RSA-SHA256' | 'ECDSA-SHA256' | 'Ed25519';
  registryId?: string;
  revocationListUrl?: string;
  organization?: string;
  contact?: string;
}

export interface PublishOptions {
  name: string;
  description: string;
  version: string;
  createdBy: string;
  artifacts: string[]; // File paths to include
  modelCards?: ModelCard[];
  citations: Citation[];
  licenses: LicenseInfo[];
  expiresAt?: string;
  securityClassification?: string;
  complianceFrameworks?: string[];
}

export class ProofCarryingPublisher {
  private config: PublisherConfig;
  private hashTreeBuilder: HashTreeBuilder;
  private packager: DisclosurePackager;
  private citationValidator: CitationValidator;
  private revocationRegistry: RevocationRegistry;
  private publishingPipeline: PublishingPipeline;

  constructor(config: PublisherConfig) {
    this.config = {
      algorithm: 'RSA-SHA256',
      registryId: 'default-registry',
      organization: 'IntelGraph',
      ...config,
    };

    this.hashTreeBuilder = new HashTreeBuilder('sha256');

    this.packager = new DisclosurePackager({
      privateKey: config.privateKey,
      publicKey: config.publicKey,
      algorithm: this.config.algorithm!,
      revocationListUrl: config.revocationListUrl,
    });

    this.citationValidator = new CitationValidator();

    this.revocationRegistry = new RevocationRegistry({
      privateKey: config.privateKey,
      publicKey: config.publicKey,
      registryId: this.config.registryId!,
    });

    this.publishingPipeline = new PublishingPipeline(this.citationValidator);
  }

  /**
   * Create and publish a complete proof-carrying bundle
   */
  async publish(options: PublishOptions): Promise<{
    manifest: ProofCarryingManifest;
    validation: PublishValidationResult;
    bundlePath?: string;
  }> {
    // 1. Generate bundle ID
    const bundleId = `bundle-${Date.now()}-${randomBytes(8).toString('hex')}`;

    // 2. Register citations
    this.citationValidator.registerCitations(options.citations);

    // 3. Build hash tree from artifacts
    const hashTree = await this.buildHashTreeFromArtifacts(options.artifacts);

    // 4. Generate or use provided model cards
    const modelCards = options.modelCards || [];

    // 5. Create manifest
    const manifest = await this.createManifest({
      bundleId,
      hashTree,
      modelCards,
      citations: options.citations,
      licenses: options.licenses,
      metadata: {
        name: options.name,
        description: options.description,
        version: options.version,
        createdAt: new Date().toISOString(),
        createdBy: options.createdBy,
        organization: this.config.organization,
        contact: this.config.contact,
        complianceFrameworks: options.complianceFrameworks,
        securityClassification: options.securityClassification,
      },
      expiresAt: options.expiresAt,
    });

    // 6. Validate before publishing
    const validation = await this.publishingPipeline.validatePrePublish(manifest);

    if (!validation.canPublish) {
      console.error('Publishing blocked:', validation.blockers);
      return { manifest, validation };
    }

    // 7. Sign and finalize manifest
    const signedManifest = await this.signManifest(manifest);

    return {
      manifest: signedManifest,
      validation,
    };
  }

  /**
   * Create evidence wallet for specific audience
   */
  async createWalletForAudience(
    manifest: ProofCarryingManifest,
    audience: AudienceScope,
    artifacts: string[],
    outputPath: string
  ): Promise<EvidenceWallet> {
    const wallet = await this.packager.createWallet(manifest, {
      audience,
      artifacts,
      revocable: true,
    });

    // Package wallet into distributable bundle
    await this.packager.packageWallet(wallet, outputPath);

    return wallet;
  }

  /**
   * Create multiple wallets for different audiences
   */
  async createMultiAudienceWallets(
    manifest: ProofCarryingManifest,
    audiences: Array<{
      scope: AudienceScope;
      artifacts: string[];
      outputPath: string;
    }>
  ): Promise<EvidenceWallet[]> {
    const wallets: EvidenceWallet[] = [];

    for (const audience of audiences) {
      const wallet = await this.createWalletForAudience(
        manifest,
        audience.scope,
        audience.artifacts,
        audience.outputPath
      );
      wallets.push(wallet);
    }

    return wallets;
  }

  /**
   * Verify a bundle
   */
  async verifyBundle(
    manifest: ProofCarryingManifest,
    artifactsPath?: string
  ): Promise<VerificationResult> {
    const verifier = new BundleVerifier({
      checkRevocation: true,
      revocationRegistries: [this.revocationRegistry],
    });

    return verifier.verifyBundle(manifest, artifactsPath);
  }

  /**
   * Verify a wallet
   */
  async verifyWallet(wallet: EvidenceWallet): Promise<VerificationResult> {
    const verifier = new BundleVerifier({
      checkRevocation: true,
      revocationRegistries: [this.revocationRegistry],
    });

    return verifier.verifyWallet(wallet);
  }

  /**
   * Revoke a wallet
   */
  async revokeWallet(
    wallet: EvidenceWallet,
    reason: 'compromised' | 'expired' | 'superseded' | 'withdrawn' | 'other',
    revokedBy: string,
    reasonDetail?: string
  ) {
    return this.revocationRegistry.revokeWallet(wallet, {
      reason,
      revokedBy,
      reasonDetail,
      propagate: true,
    });
  }

  /**
   * Revoke entire bundle
   */
  async revokeBundle(
    bundleId: string,
    reason: 'compromised' | 'expired' | 'superseded' | 'withdrawn' | 'other',
    revokedBy: string,
    reasonDetail?: string
  ) {
    return this.revocationRegistry.revokeBundle(bundleId, {
      reason,
      revokedBy,
      reasonDetail,
      propagate: true,
    });
  }

  /**
   * Export revocation list for offline verification
   */
  async exportRevocationList(outputPath: string): Promise<void> {
    return this.revocationRegistry.exportRevocationList(outputPath);
  }

  /**
   * Build hash tree from artifact files
   */
  private async buildHashTreeFromArtifacts(artifacts: string[]) {
    const fileHashes = await Promise.all(
      artifacts.map(path => this.hashTreeBuilder.hashFile(path))
    );

    return this.hashTreeBuilder.buildMerkleTree(fileHashes);
  }

  /**
   * Create manifest
   */
  private async createManifest(options: {
    bundleId: string;
    hashTree: any;
    modelCards: ModelCard[];
    citations: Citation[];
    licenses: LicenseInfo[];
    metadata: any;
    expiresAt?: string;
  }): Promise<ProofCarryingManifest> {
    return {
      version: '1.0',
      id: `manifest-${options.bundleId}`,
      bundleId: options.bundleId,
      hashTree: options.hashTree,
      modelCards: options.modelCards,
      citations: options.citations,
      licenses: options.licenses,
      metadata: options.metadata,
      verification: {
        offlineVerifiable: true,
        verificationScript: 'verify.sh',
        requiredTools: ['openssl', 'sha256sum'],
        verificationInstructions:
          'Run verify.sh to validate bundle integrity offline',
      },
      signature: '', // Will be set during signing
      signatureAlgorithm: this.config.algorithm!,
      publicKey: this.config.publicKey,
      createdAt: new Date().toISOString(),
      expiresAt: options.expiresAt,
      revocable: true,
      revocationListUrl: this.config.revocationListUrl,
      revocationCheckRequired: true,
    };
  }

  /**
   * Sign manifest
   */
  private async signManifest(
    manifest: ProofCarryingManifest
  ): Promise<ProofCarryingManifest> {
    // Create a copy without signature for signing
    const manifestCopy = { ...manifest };
    delete (manifestCopy as any).signature;

    const data = JSON.stringify(manifestCopy, null, 2);

    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();

    const signature = sign.sign(this.config.privateKey, 'hex');

    return {
      ...manifest,
      signature,
    };
  }

  /**
   * Get citation validator for external use
   */
  getCitationValidator(): CitationValidator {
    return this.citationValidator;
  }

  /**
   * Get revocation registry for external use
   */
  getRevocationRegistry(): RevocationRegistry {
    return this.revocationRegistry;
  }
}

/**
 * Helper to create publisher from environment variables
 */
export function createPublisherFromEnv(): ProofCarryingPublisher {
  const privateKey = process.env.PROOF_CARRYING_PRIVATE_KEY;
  const publicKey = process.env.PROOF_CARRYING_PUBLIC_KEY;

  if (!privateKey || !publicKey) {
    throw new Error(
      'PROOF_CARRYING_PRIVATE_KEY and PROOF_CARRYING_PUBLIC_KEY must be set'
    );
  }

  return new ProofCarryingPublisher({
    privateKey,
    publicKey,
    algorithm: (process.env.PROOF_CARRYING_ALGORITHM as any) || 'RSA-SHA256',
    registryId: process.env.PROOF_CARRYING_REGISTRY_ID,
    revocationListUrl: process.env.PROOF_CARRYING_REVOCATION_URL,
    organization: process.env.PROOF_CARRYING_ORGANIZATION,
    contact: process.env.PROOF_CARRYING_CONTACT,
  });
}

/**
 * Integration with existing DisclosureExportService
 */
export interface ExportIntegrationOptions {
  exportId: string;
  exportData: any;
  user: string;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
}

export async function integrateWithExport(
  publisher: ProofCarryingPublisher,
  options: ExportIntegrationOptions
): Promise<ProofCarryingManifest> {
  // Extract citations from export data
  const citations: Citation[] = [];

  // Add standard licenses
  const licenses: LicenseInfo[] = [StandardLicenses['Apache-2.0']];

  // Create model card from export
  const modelCard = createModelCardFromExport(options.exportId, {
    name: `Export ${options.exportId}`,
    description: 'IntelGraph data export',
    user: options.user,
    sources: [
      {
        id: options.exportId,
        type: 'database',
        location: 'IntelGraph Database',
        timestamp: new Date().toISOString(),
      },
    ],
    sensitivity: options.sensitivity || 'internal',
  });

  // Publish with proof-carrying manifest
  const result = await publisher.publish({
    name: `IntelGraph Export ${options.exportId}`,
    description: 'IntelGraph disclosure export with proof-carrying manifest',
    version: '1.0',
    createdBy: options.user,
    artifacts: [], // Would be populated with actual export files
    modelCards: [modelCard],
    citations,
    licenses,
    securityClassification: options.sensitivity,
    complianceFrameworks: ['GDPR', 'CCPA'],
  });

  if (!result.validation.canPublish) {
    throw new Error(
      `Cannot publish: ${result.validation.blockers.join(', ')}`
    );
  }

  return result.manifest;
}
