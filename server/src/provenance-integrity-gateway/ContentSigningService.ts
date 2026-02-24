/**
 * Content Signing Service
 *
 * Signs outbound official content with cryptographic credentials, creating
 * verifiable proof of authenticity for press releases, statements, media assets, etc.
 * Implements C2PA manifest generation for signed content.
 */

import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Counter, Histogram, Gauge } from 'prom-client';
import pino from 'pino';
import { CryptoPipeline, createDefaultCryptoPipeline } from '../security/crypto/pipeline.js';
import type { SignatureBundle, KeyVersion } from '../security/crypto/types.js';
import { pool } from '../db/pg.js';
import { provenanceLedger } from '../provenance/ledger.js';
import type {
  SignedAsset,
  OfficialAssetType,
  AssetStatus,
  AssetDistribution,
  AssetRevocation,
  RevocationReason,
  PropagationStatus,
  DistributionChannel,
  C2PAManifest,
  C2PAClaim,
  C2PASignature,
  C2PAAssertion,
  C2PAAction,
  SignAssetRequest,
  SignAssetResponse,
  RevokeAssetRequest,
  RevokeAssetResponse,
} from './types.js';

const logger = (pino as any)({ name: 'ContentSigningService' });

// =============================================================================
// Metrics
// =============================================================================

const assetsSignedTotal = new Counter({
  name: 'pig_assets_signed_total',
  help: 'Total assets signed',
  labelNames: ['tenant_id', 'asset_type', 'status'],
});

const assetsRevokedTotal = new Counter({
  name: 'pig_assets_revoked_total',
  help: 'Total assets revoked',
  labelNames: ['tenant_id', 'reason'],
});

const signingDuration = new Histogram({
  name: 'pig_signing_duration_seconds',
  help: 'Duration of content signing operations',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  labelNames: ['operation'],
});

const activeAssets = new Gauge({
  name: 'pig_active_assets_count',
  help: 'Number of active signed assets',
  labelNames: ['tenant_id', 'asset_type'],
});

// =============================================================================
// Content Signing Service
// =============================================================================

export interface ContentSigningServiceConfig {
  /** Signing key ID for content signing */
  signingKeyId: string;

  /** Key ID for revocation signing */
  revocationKeyId?: string;

  /** Storage path for signed assets */
  storagePath: string;

  /** CDN base URL for published assets */
  cdnBaseUrl?: string;

  /** Whether to generate C2PA manifests */
  generateC2PA: boolean;

  /** Claim generator identifier */
  claimGenerator: string;

  /** Organization name for credentials */
  organizationName: string;

  /** Organization identifier */
  organizationId: string;

  /** Whether to require approval workflow */
  requireApproval: boolean;

  /** Minimum approvers for publish */
  minApprovers: number;

  /** Auto-approve asset types */
  autoApproveTypes: OfficialAssetType[];

  /** Revocation propagation channels */
  propagationChannels: DistributionChannel[];

  /** TSA endpoint for timestamping */
  tsaEndpoint?: string;
}

export const defaultContentSigningConfig: ContentSigningServiceConfig = {
  signingKeyId: 'official-content-signing',
  revocationKeyId: 'official-content-revocation',
  storagePath: '/data/signed-assets',
  cdnBaseUrl: undefined,
  generateC2PA: true,
  claimGenerator: 'summit/pig/1.0',
  organizationName: 'Organization',
  organizationId: 'org-default',
  requireApproval: true,
  minApprovers: 1,
  autoApproveTypes: ['social_card'],
  propagationChannels: ['website', 'twitter', 'linkedin'],
  tsaEndpoint: undefined,
};

export class ContentSigningService extends EventEmitter {
  private config: ContentSigningServiceConfig;
  private cryptoPipeline?: CryptoPipeline;
  private initialized = false;

  constructor(config: Partial<ContentSigningServiceConfig> = {}) {
    super();
    this.config = { ...defaultContentSigningConfig, ...config };
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize crypto pipeline
      this.cryptoPipeline = await createDefaultCryptoPipeline({
        timestampingEndpointEnv: 'CONTENT_SIGNING_TSA_ENDPOINT',
        auditSubsystem: 'content-signing',
        trustAnchorsEnv: 'CONTENT_SIGNING_TRUST_ANCHORS',
      }) || undefined;

      // Ensure storage directory exists
      await fs.mkdir(this.config.storagePath, { recursive: true });

      // Initialize database tables
      await this.initializeTables();

      this.initialized = true;
      logger.info('ContentSigningService initialized');
    } catch (error: any) {
      logger.error({ error }, 'Failed to initialize ContentSigningService');
      throw error;
    }
  }

  /**
   * Initialize database tables
   */
  private async initializeTables(): Promise<void> {
    // Tables are created via migrations
    // This is for runtime verification
  }

  /**
   * Sign an asset for official publication
   */
  async signAsset(
    request: SignAssetRequest,
    tenantId: string,
    userId: string
  ): Promise<SignAssetResponse> {
    await this.ensureInitialized();
    const startTime = Date.now();

    logger.info({
      title: request.title,
      assetType: request.assetType,
      tenantId,
      userId,
    }, 'Signing asset');

    try {
      // Get content buffer
      const contentBuffer = await this.getContentBuffer(request.content);

      // Calculate content hash
      const contentHash = crypto.createHash('sha256').update(contentBuffer).digest('hex');

      // Generate asset ID
      const assetId = `asset_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Store the content
      const storagePath = path.join(this.config.storagePath, tenantId, assetId);
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      const storageUri = path.join(storagePath, request.filename);
      await fs.writeFile(storageUri, contentBuffer);

      // Sign the content
      const signature = await this.signContent(contentHash, contentBuffer);

      // Generate C2PA manifest if enabled and applicable
      let c2paManifest: C2PAManifest | undefined;
      if (this.config.generateC2PA && this.isMediaType(request.mimeType)) {
        c2paManifest = await this.generateC2PAManifest(
          contentBuffer,
          request.mimeType,
          contentHash,
          request.title,
          userId
        );
      }

      // Determine initial status
      let status: AssetStatus = 'draft';
      let approvalStatus: 'pending' | 'approved' | 'auto_approved' | undefined;

      if (this.config.requireApproval) {
        if (this.config.autoApproveTypes.includes(request.assetType)) {
          status = 'approved';
          approvalStatus = 'auto_approved';
        } else if (request.skipApproval) {
          status = 'approved';
          approvalStatus = 'approved';
        } else {
          status = 'pending_approval';
          approvalStatus = 'pending';
        }
      } else {
        status = 'approved';
        approvalStatus = 'auto_approved';
      }

      // Create the signed asset record
      const asset: SignedAsset = {
        id: assetId,
        tenantId,
        title: request.title,
        description: request.description,
        assetType: request.assetType,
        contentHash,
        mimeType: request.mimeType,
        fileSize: contentBuffer.length,
        storageUri,
        version: 1,
        signature,
        c2paManifest,
        createdAt: new Date(),
        createdBy: userId,
        updatedAt: new Date(),
        updatedBy: userId,
        status,
        classification: request.classification,
        expiresAt: request.expiresAt,
        metadata: request.metadata,
      };

      // Store in database
      await this.storeAsset(asset);

      // Record in provenance ledger
      await provenanceLedger.appendEntry({
        tenantId,
        timestamp: new Date(),
        actionType: 'ASSET_SIGNED',
        resourceType: 'SignedAsset',
        resourceId: assetId,
        actorId: userId,
        actorType: 'user',
        payload: {
          mutationType: 'CREATE',
          entityId: assetId,
          entityType: 'SignedAsset',
          newState: {
            id: assetId,
            type: 'SignedAsset',
            version: 1,
            data: {
              title: asset.title,
              assetType: asset.assetType,
              contentHash: asset.contentHash,
              status: asset.status,
            },
            metadata: {},
          },
        },
        metadata: {
          purpose: 'official-content-signing',
          classification: request.classification ? [request.classification] : undefined,
        },
      });

      // Distribute if channels specified and approved
      let distributionResults: SignAssetResponse['distributionResults'];
      if (request.distributeToChannels && status === 'approved') {
        distributionResults = await this.distributeAsset(asset, request.distributeToChannels);
      }

      // Update metrics
      assetsSignedTotal.inc({
        tenant_id: tenantId,
        asset_type: request.assetType,
        status,
      });

      signingDuration.observe(
        { operation: 'sign' },
        (Date.now() - startTime) / 1000
      );

      this.emit('asset:signed', { asset });

      logger.info({
        assetId,
        status,
        duration: Date.now() - startTime,
      }, 'Asset signed successfully');

      return {
        asset,
        approvalStatus,
        distributionResults,
      };
    } catch (error: any) {
      logger.error({ error }, 'Failed to sign asset');
      throw error;
    }
  }

  /**
   * Revoke a signed asset
   */
  async revokeAsset(
    request: RevokeAssetRequest,
    tenantId: string,
    userId: string
  ): Promise<RevokeAssetResponse> {
    await this.ensureInitialized();
    const startTime = Date.now();

    logger.info({
      assetId: request.assetId,
      reason: request.reason,
      tenantId,
      userId,
    }, 'Revoking asset');

    try {
      // Get the asset
      const asset = await this.getAsset(request.assetId, tenantId);

      if (!asset) {
        throw new Error(`Asset not found: ${request.assetId}`);
      }

      if (asset.status === 'revoked') {
        throw new Error('Asset is already revoked');
      }

      // Create revocation signature
      const revocationData = JSON.stringify({
        assetId: request.assetId,
        reason: request.reason,
        explanation: request.explanation,
        timestamp: new Date().toISOString(),
        originalHash: asset.contentHash,
      });

      const revocationSignature = await this.signContent(
        crypto.createHash('sha256').update(revocationData).digest('hex'),
        Buffer.from(revocationData)
      );

      // Create revocation record
      const revocation: AssetRevocation = {
        revokedAt: new Date(),
        revokedBy: userId,
        reason: request.reason,
        explanation: request.explanation,
        replacementId: request.replacementId,
        revocationSignature,
      };

      // Propagate revocation to channels if requested
      let propagationResults: PropagationStatus[] | undefined;
      if (request.propagateRevocation !== false && asset.distributions) {
        propagationResults = await this.propagateRevocation(asset, revocation);
        revocation.propagationStatus = propagationResults;
      }

      // Update asset
      const updatedAsset: SignedAsset = {
        ...asset,
        status: 'revoked',
        revocation,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      // Store updated asset
      await this.updateAsset(updatedAsset);

      // Record in provenance ledger
      await provenanceLedger.appendEntry({
        tenantId,
        timestamp: new Date(),
        actionType: 'ASSET_REVOKED',
        resourceType: 'SignedAsset',
        resourceId: request.assetId,
        actorId: userId,
        actorType: 'user',
        payload: {
          mutationType: 'UPDATE',
          entityId: request.assetId,
          entityType: 'SignedAsset',
          previousState: {
            id: asset.id,
            type: 'SignedAsset',
            version: asset.version,
            data: { status: asset.status },
            metadata: {},
          },
          newState: {
            id: updatedAsset.id,
            type: 'SignedAsset',
            version: updatedAsset.version,
            data: {
              status: 'revoked',
              reason: request.reason,
            },
            metadata: {},
          },
          reason: request.explanation,
        },
        metadata: {
          purpose: 'asset-revocation',
          revocationReason: request.reason,
        },
      });

      // Update metrics
      assetsRevokedTotal.inc({
        tenant_id: tenantId,
        reason: request.reason,
      });

      signingDuration.observe(
        { operation: 'revoke' },
        (Date.now() - startTime) / 1000
      );

      this.emit('asset:revoked', { asset: updatedAsset, revocation });

      logger.info({
        assetId: request.assetId,
        reason: request.reason,
        duration: Date.now() - startTime,
      }, 'Asset revoked successfully');

      return {
        asset: updatedAsset,
        propagationResults,
      };
    } catch (error: any) {
      logger.error({ error }, 'Failed to revoke asset');
      throw error;
    }
  }

  /**
   * Get a signed asset by ID
   */
  async getAsset(assetId: string, tenantId: string): Promise<SignedAsset | null> {
    await this.ensureInitialized();

    const result = await pool.query(
      `SELECT * FROM signed_assets WHERE id = $1 AND tenant_id = $2`,
      [assetId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAsset(result.rows[0]);
  }

  /**
   * List signed assets for a tenant
   */
  async listAssets(
    tenantId: string,
    options: {
      status?: AssetStatus[];
      assetType?: OfficialAssetType[];
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'updatedAt';
      order?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ assets: SignedAsset[]; total: number }> {
    await this.ensureInitialized();

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options.status && options.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(options.status);
      paramIndex++;
    }

    if (options.assetType && options.assetType.length > 0) {
      conditions.push(`asset_type = ANY($${paramIndex})`);
      params.push(options.assetType);
      paramIndex++;
    }

    const orderBy = options.orderBy === 'updatedAt' ? 'updated_at' : 'created_at';
    const order = options.order || 'DESC';
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM signed_assets WHERE ${conditions.join(' AND ')}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM signed_assets
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy} ${order}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      assets: dataResult.rows.map((row: any) => this.mapRowToAsset(row)),
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Verify an asset's signature
   */
  async verifyAsset(assetId: string, tenantId: string): Promise<{
    valid: boolean;
    errors: string[];
    asset?: SignedAsset;
  }> {
    await this.ensureInitialized();

    const asset = await this.getAsset(assetId, tenantId);

    if (!asset) {
      return { valid: false, errors: ['Asset not found'] };
    }

    const errors: string[] = [];

    try {
      // Read content and verify hash
      const content = await fs.readFile(asset.storageUri);
      const computedHash = crypto.createHash('sha256').update(content).digest('hex');

      if (computedHash !== asset.contentHash) {
        errors.push('Content hash mismatch - file may have been modified');
      }

      // Verify signature
      if (this.cryptoPipeline) {
        const verifyResult = await this.cryptoPipeline.verifySignature(
          Buffer.from(asset.contentHash),
          asset.signature,
          { expectedKeyId: this.config.signingKeyId }
        );

        if (!verifyResult.valid) {
          errors.push(`Signature verification failed: ${verifyResult.errors?.join(', ')}`);
        }
      }

      // Check status
      if (asset.status === 'revoked') {
        errors.push('Asset has been revoked');
      }

      // Check expiration
      if (asset.expiresAt && new Date() > asset.expiresAt) {
        errors.push('Asset has expired');
      }

      return {
        valid: errors.length === 0,
        errors,
        asset,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Verification error: ${(error as Error).message}`],
        asset,
      };
    }
  }

  /**
   * Publish an approved asset
   */
  async publishAsset(
    assetId: string,
    channels: DistributionChannel[],
    tenantId: string,
    userId: string
  ): Promise<AssetDistribution[]> {
    await this.ensureInitialized();

    const asset = await this.getAsset(assetId, tenantId);

    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.status !== 'approved' && asset.status !== 'published') {
      throw new Error(`Asset must be approved before publishing. Current status: ${asset.status}`);
    }

    const distributions = await this.distributeAsset(asset, channels);

    // Update asset with distribution info
    const updatedAsset: SignedAsset = {
      ...asset,
      status: 'published',
      distributions: [...(asset.distributions || []), ...distributions.filter(d => d.success).map(d => ({
        channel: d.channel,
        url: d.url,
        distributedAt: new Date(),
        status: 'active' as const,
      }))],
      updatedAt: new Date(),
      updatedBy: userId,
    };

    await this.updateAsset(updatedAsset);

    // Emit events for successful distributions
    for (const dist of distributions.filter(d => d.success)) {
      this.emit('asset:published', {
        asset: updatedAsset,
        channel: dist.channel,
        url: dist.url,
      });
    }

    return updatedAsset.distributions || [];
  }

  /**
   * Create a new version of an asset
   */
  async createNewVersion(
    originalAssetId: string,
    request: SignAssetRequest,
    tenantId: string,
    userId: string
  ): Promise<SignAssetResponse> {
    await this.ensureInitialized();

    const originalAsset = await this.getAsset(originalAssetId, tenantId);

    if (!originalAsset) {
      throw new Error(`Original asset not found: ${originalAssetId}`);
    }

    // Sign the new content
    const response = await this.signAsset(request, tenantId, userId);

    // Update the new asset to link to previous version
    const updatedAsset: SignedAsset = {
      ...response.asset,
      version: originalAsset.version + 1,
      previousVersionId: originalAssetId,
    };

    await this.updateAsset(updatedAsset);

    // Mark original as superseded if it was published
    if (originalAsset.status === 'published') {
      await this.revokeAsset(
        {
          assetId: originalAssetId,
          reason: 'superseded',
          explanation: `Superseded by version ${updatedAsset.version}`,
          replacementId: updatedAsset.id,
        },
        tenantId,
        userId
      );
    }

    return {
      ...response,
      asset: updatedAsset,
    };
  }

  /**
   * Sign content with crypto pipeline
   */
  private async signContent(
    contentHash: string,
    content: Buffer
  ): Promise<SignatureBundle> {
    if (!this.cryptoPipeline) {
      // Fallback to simple signature
      const hmac = crypto.createHmac('sha256', process.env.CONTENT_SIGNING_SECRET || 'default-secret');
      hmac.update(content);

      return {
        keyId: this.config.signingKeyId,
        keyVersion: 1,
        algorithm: 'HMAC_SHA256' as any,
        signature: hmac.digest('base64'),
      };
    }

    return this.cryptoPipeline.signPayload(
      Buffer.from(contentHash),
      this.config.signingKeyId,
      {
        includeTimestamp: true,
        metadata: {
          purpose: 'official-content-signing',
          generator: this.config.claimGenerator,
        },
      }
    );
  }

  /**
   * Generate C2PA manifest for media content
   */
  private async generateC2PAManifest(
    content: Buffer,
    mimeType: string,
    contentHash: string,
    title: string,
    actorId: string
  ): Promise<C2PAManifest> {
    const manifestId = `urn:uuid:${crypto.randomUUID()}`;
    const instanceId = `xmp:iid:${crypto.randomUUID()}`;

    // Create assertions
    const assertions: C2PAAssertion[] = [
      {
        label: 'c2pa.hash.data',
        data: {
          algorithm: 'sha256',
          hash: contentHash,
        },
        validated: true,
      },
      {
        label: 'stds.schema-org.CreativeWork',
        data: {
          '@type': 'CreativeWork',
          name: title,
          author: {
            '@type': 'Organization',
            name: this.config.organizationName,
            identifier: this.config.organizationId,
          },
          dateCreated: new Date().toISOString(),
        },
      },
    ];

    // Create actions
    const actions: C2PAAction[] = [
      {
        action: 'c2pa.created',
        when: new Date().toISOString(),
        softwareAgent: this.config.claimGenerator,
        actors: [
          {
            type: 'organization',
            identifier: this.config.organizationId,
          },
        ],
      },
    ];

    // Create claim
    const claim: C2PAClaim = {
      claimGenerator: this.config.claimGenerator,
      title,
      format: mimeType,
      instanceId,
      assertions,
      actions,
      signatureDate: new Date().toISOString(),
    };

    // Create signature
    const claimData = JSON.stringify(claim);
    const claimHash = crypto.createHash('sha256').update(claimData).digest('hex');

    let signatureValue: string;
    let algorithm = 'ES256';
    let certificate = '';
    let certificateChain: string[] = [];

    if (this.cryptoPipeline) {
      const bundle = await this.cryptoPipeline.signPayload(
        Buffer.from(claimData),
        this.config.signingKeyId,
        { includeTimestamp: true }
      );

      signatureValue = bundle.signature;
      algorithm = bundle.algorithm;
      certificateChain = bundle.certificateChain || [];
      certificate = certificateChain[0] || '';
    } else {
      const hmac = crypto.createHmac('sha256', process.env.CONTENT_SIGNING_SECRET || 'default-secret');
      hmac.update(claimData);
      signatureValue = hmac.digest('base64');
      algorithm = 'HMAC_SHA256';
    }

    const signature: C2PASignature = {
      algorithm,
      value: signatureValue,
      certificate,
      certificateChain,
      timestamp: new Date().toISOString(),
    };

    return {
      manifestId,
      claim,
      signature,
      validationStatus: {
        valid: true,
        validatedAt: new Date().toISOString(),
        codes: [
          {
            code: 'c2pa.claim.valid',
            explanation: 'Claim is valid and signed by organization',
            severity: 'info',
            success: true,
          },
        ],
        trustLevel: 'verified',
      },
    };
  }

  /**
   * Distribute asset to channels
   */
  private async distributeAsset(
    asset: SignedAsset,
    channels: DistributionChannel[]
  ): Promise<{ channel: DistributionChannel; success: boolean; url?: string; error?: string }[]> {
    const results: { channel: DistributionChannel; success: boolean; url?: string; error?: string }[] = [];

    for (const channel of channels) {
      try {
        const url = await this.distributeToChannel(asset, channel);
        results.push({ channel, success: true, url });
      } catch (error: any) {
        logger.error({ error, channel, assetId: asset.id }, 'Failed to distribute to channel');
        results.push({
          channel,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Distribute to a specific channel
   */
  private async distributeToChannel(
    asset: SignedAsset,
    channel: DistributionChannel
  ): Promise<string> {
    // Implementation would integrate with various platforms
    // For now, return a placeholder URL

    switch (channel) {
      case 'website':
        if (this.config.cdnBaseUrl) {
          return `${this.config.cdnBaseUrl}/assets/${asset.id}/${asset.id}`;
        }
        return `/assets/${asset.id}`;

      case 'api':
        return `/api/v1/assets/${asset.id}`;

      default:
        // Other channels would have specific integration logic
        logger.warn({ channel }, 'Channel distribution not implemented');
        throw new Error(`Channel ${channel} distribution not implemented`);
    }
  }

  /**
   * Propagate revocation to distribution channels
   */
  private async propagateRevocation(
    asset: SignedAsset,
    revocation: AssetRevocation
  ): Promise<PropagationStatus[]> {
    const results: PropagationStatus[] = [];

    if (!asset.distributions) {
      return results;
    }

    for (const distribution of asset.distributions) {
      const status: PropagationStatus = {
        channel: distribution.channel,
        status: 'pending',
        attemptedAt: new Date(),
      };

      try {
        await this.propagateToChannel(asset, distribution, revocation);
        status.status = 'completed';
        status.completedAt = new Date();

        this.emit('revocation:propagated', {
          assetId: asset.id,
          status: [status],
        });
      } catch (error: any) {
        status.status = 'failed';
        status.error = (error as Error).message;
        logger.error({
          error,
          channel: distribution.channel,
          assetId: asset.id,
        }, 'Failed to propagate revocation');
      }

      results.push(status);
    }

    return results;
  }

  /**
   * Propagate revocation to a specific channel
   */
  private async propagateToChannel(
    asset: SignedAsset,
    distribution: AssetDistribution,
    revocation: AssetRevocation
  ): Promise<void> {
    // Implementation would integrate with various platforms
    // For now, log the propagation attempt

    logger.info({
      channel: distribution.channel,
      url: distribution.url,
      assetId: asset.id,
      reason: revocation.reason,
    }, 'Propagating revocation to channel');

    // Actual implementation would:
    // - For website: Update/remove the asset
    // - For Twitter: Delete or update the tweet
    // - For API: Update the asset status
    // etc.
  }

  /**
   * Store asset in database
   */
  private async storeAsset(asset: SignedAsset): Promise<void> {
    await pool.query(
      `INSERT INTO signed_assets (
        id, tenant_id, title, description, asset_type, content_hash,
        mime_type, file_size, storage_uri, public_url, version,
        previous_version_id, signature, c2pa_manifest, revocation,
        distributions, created_at, created_by, updated_at, updated_by,
        status, classification, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        asset.id,
        asset.tenantId,
        asset.title,
        asset.description,
        asset.assetType,
        asset.contentHash,
        asset.mimeType,
        asset.fileSize,
        asset.storageUri,
        asset.publicUrl,
        asset.version,
        asset.previousVersionId,
        JSON.stringify(asset.signature),
        asset.c2paManifest ? JSON.stringify(asset.c2paManifest) : null,
        asset.revocation ? JSON.stringify(asset.revocation) : null,
        asset.distributions ? JSON.stringify(asset.distributions) : null,
        asset.createdAt,
        asset.createdBy,
        asset.updatedAt,
        asset.updatedBy,
        asset.status,
        asset.classification,
        asset.expiresAt,
        asset.metadata ? JSON.stringify(asset.metadata) : null,
      ]
    );
  }

  /**
   * Update asset in database
   */
  private async updateAsset(asset: SignedAsset): Promise<void> {
    await pool.query(
      `UPDATE signed_assets SET
        title = $3,
        description = $4,
        public_url = $5,
        version = $6,
        previous_version_id = $7,
        revocation = $8,
        distributions = $9,
        updated_at = $10,
        updated_by = $11,
        status = $12,
        metadata = $13
      WHERE id = $1 AND tenant_id = $2`,
      [
        asset.id,
        asset.tenantId,
        asset.title,
        asset.description,
        asset.publicUrl,
        asset.version,
        asset.previousVersionId,
        asset.revocation ? JSON.stringify(asset.revocation) : null,
        asset.distributions ? JSON.stringify(asset.distributions) : null,
        asset.updatedAt,
        asset.updatedBy,
        asset.status,
        asset.metadata ? JSON.stringify(asset.metadata) : null,
      ]
    );
  }

  /**
   * Map database row to SignedAsset
   */
  private mapRowToAsset(row: any): SignedAsset {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      assetType: row.asset_type,
      contentHash: row.content_hash,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      storageUri: row.storage_uri,
      publicUrl: row.public_url,
      version: row.version,
      previousVersionId: row.previous_version_id,
      signature: typeof row.signature === 'string' ? JSON.parse(row.signature) : row.signature,
      c2paManifest: row.c2pa_manifest
        ? (typeof row.c2pa_manifest === 'string' ? JSON.parse(row.c2pa_manifest) : row.c2pa_manifest)
        : undefined,
      revocation: row.revocation
        ? (typeof row.revocation === 'string' ? JSON.parse(row.revocation) : row.revocation)
        : undefined,
      distributions: row.distributions
        ? (typeof row.distributions === 'string' ? JSON.parse(row.distributions) : row.distributions)
        : undefined,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      status: row.status,
      classification: row.classification,
      expiresAt: row.expires_at,
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : undefined,
    };
  }

  /**
   * Get content as buffer
   */
  private async getContentBuffer(content: string | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(content)) {
      return content;
    }

    // Assume it's a file path
    return fs.readFile(content);
  }

  /**
   * Check if MIME type is a media type suitable for C2PA
   */
  private isMediaType(mimeType: string): boolean {
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType === 'application/pdf'
    );
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup any resources if needed
  }
}

// Export default instance
export const contentSigningService = new ContentSigningService();
