"use strict";
/**
 * Content Signing Service
 *
 * Signs outbound official content with cryptographic credentials, creating
 * verifiable proof of authenticity for press releases, statements, media assets, etc.
 * Implements C2PA manifest generation for signed content.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentSigningService = exports.ContentSigningService = exports.defaultContentSigningConfig = void 0;
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const events_1 = require("events");
const prom_client_1 = require("prom-client");
const pino_1 = __importDefault(require("pino"));
const pipeline_js_1 = require("../security/crypto/pipeline.js");
const pg_js_1 = require("../db/pg.js");
const ledger_js_1 = require("../provenance/ledger.js");
const logger = pino_1.default({ name: 'ContentSigningService' });
// =============================================================================
// Metrics
// =============================================================================
const assetsSignedTotal = new prom_client_1.Counter({
    name: 'pig_assets_signed_total',
    help: 'Total assets signed',
    labelNames: ['tenant_id', 'asset_type', 'status'],
});
const assetsRevokedTotal = new prom_client_1.Counter({
    name: 'pig_assets_revoked_total',
    help: 'Total assets revoked',
    labelNames: ['tenant_id', 'reason'],
});
const signingDuration = new prom_client_1.Histogram({
    name: 'pig_signing_duration_seconds',
    help: 'Duration of content signing operations',
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    labelNames: ['operation'],
});
const activeAssets = new prom_client_1.Gauge({
    name: 'pig_active_assets_count',
    help: 'Number of active signed assets',
    labelNames: ['tenant_id', 'asset_type'],
});
exports.defaultContentSigningConfig = {
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
class ContentSigningService extends events_1.EventEmitter {
    config;
    cryptoPipeline;
    initialized = false;
    constructor(config = {}) {
        super();
        this.config = { ...exports.defaultContentSigningConfig, ...config };
    }
    /**
     * Initialize the service
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Initialize crypto pipeline
            this.cryptoPipeline = await (0, pipeline_js_1.createDefaultCryptoPipeline)({
                timestampingEndpointEnv: 'CONTENT_SIGNING_TSA_ENDPOINT',
                auditSubsystem: 'content-signing',
                trustAnchorsEnv: 'CONTENT_SIGNING_TRUST_ANCHORS',
            }) || undefined;
            // Ensure storage directory exists
            await fs_1.promises.mkdir(this.config.storagePath, { recursive: true });
            // Initialize database tables
            await this.initializeTables();
            this.initialized = true;
            logger.info('ContentSigningService initialized');
        }
        catch (error) {
            logger.error({ error }, 'Failed to initialize ContentSigningService');
            throw error;
        }
    }
    /**
     * Initialize database tables
     */
    async initializeTables() {
        // Tables are created via migrations
        // This is for runtime verification
    }
    /**
     * Sign an asset for official publication
     */
    async signAsset(request, tenantId, userId) {
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
            await fs_1.promises.mkdir(storagePath, { recursive: true });
            const storageUri = path.join(storagePath, request.filename);
            await fs_1.promises.writeFile(storageUri, contentBuffer);
            // Sign the content
            const signature = await this.signContent(contentHash, contentBuffer);
            // Generate C2PA manifest if enabled and applicable
            let c2paManifest;
            if (this.config.generateC2PA && this.isMediaType(request.mimeType)) {
                c2paManifest = await this.generateC2PAManifest(contentBuffer, request.mimeType, contentHash, request.title, userId);
            }
            // Determine initial status
            let status = 'draft';
            let approvalStatus;
            if (this.config.requireApproval) {
                if (this.config.autoApproveTypes.includes(request.assetType)) {
                    status = 'approved';
                    approvalStatus = 'auto_approved';
                }
                else if (request.skipApproval) {
                    status = 'approved';
                    approvalStatus = 'approved';
                }
                else {
                    status = 'pending_approval';
                    approvalStatus = 'pending';
                }
            }
            else {
                status = 'approved';
                approvalStatus = 'auto_approved';
            }
            // Create the signed asset record
            const asset = {
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
            await ledger_js_1.provenanceLedger.appendEntry({
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
            let distributionResults;
            if (request.distributeToChannels && status === 'approved') {
                distributionResults = await this.distributeAsset(asset, request.distributeToChannels);
            }
            // Update metrics
            assetsSignedTotal.inc({
                tenant_id: tenantId,
                asset_type: request.assetType,
                status,
            });
            signingDuration.observe({ operation: 'sign' }, (Date.now() - startTime) / 1000);
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
        }
        catch (error) {
            logger.error({ error }, 'Failed to sign asset');
            throw error;
        }
    }
    /**
     * Revoke a signed asset
     */
    async revokeAsset(request, tenantId, userId) {
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
            const revocationSignature = await this.signContent(crypto.createHash('sha256').update(revocationData).digest('hex'), Buffer.from(revocationData));
            // Create revocation record
            const revocation = {
                revokedAt: new Date(),
                revokedBy: userId,
                reason: request.reason,
                explanation: request.explanation,
                replacementId: request.replacementId,
                revocationSignature,
            };
            // Propagate revocation to channels if requested
            let propagationResults;
            if (request.propagateRevocation !== false && asset.distributions) {
                propagationResults = await this.propagateRevocation(asset, revocation);
                revocation.propagationStatus = propagationResults;
            }
            // Update asset
            const updatedAsset = {
                ...asset,
                status: 'revoked',
                revocation,
                updatedAt: new Date(),
                updatedBy: userId,
            };
            // Store updated asset
            await this.updateAsset(updatedAsset);
            // Record in provenance ledger
            await ledger_js_1.provenanceLedger.appendEntry({
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
            signingDuration.observe({ operation: 'revoke' }, (Date.now() - startTime) / 1000);
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
        }
        catch (error) {
            logger.error({ error }, 'Failed to revoke asset');
            throw error;
        }
    }
    /**
     * Get a signed asset by ID
     */
    async getAsset(assetId, tenantId) {
        await this.ensureInitialized();
        const result = await pg_js_1.pool.query(`SELECT * FROM signed_assets WHERE id = $1 AND tenant_id = $2`, [assetId, tenantId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToAsset(result.rows[0]);
    }
    /**
     * List signed assets for a tenant
     */
    async listAssets(tenantId, options = {}) {
        await this.ensureInitialized();
        const conditions = ['tenant_id = $1'];
        const params = [tenantId];
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
        const countResult = await pg_js_1.pool.query(`SELECT COUNT(*) FROM signed_assets WHERE ${conditions.join(' AND ')}`, params);
        const dataResult = await pg_js_1.pool.query(`SELECT * FROM signed_assets
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy} ${order}
       LIMIT ${limit} OFFSET ${offset}`, params);
        return {
            assets: dataResult.rows.map((row) => this.mapRowToAsset(row)),
            total: parseInt(countResult.rows[0].count),
        };
    }
    /**
     * Verify an asset's signature
     */
    async verifyAsset(assetId, tenantId) {
        await this.ensureInitialized();
        const asset = await this.getAsset(assetId, tenantId);
        if (!asset) {
            return { valid: false, errors: ['Asset not found'] };
        }
        const errors = [];
        try {
            // Read content and verify hash
            const content = await fs_1.promises.readFile(asset.storageUri);
            const computedHash = crypto.createHash('sha256').update(content).digest('hex');
            if (computedHash !== asset.contentHash) {
                errors.push('Content hash mismatch - file may have been modified');
            }
            // Verify signature
            if (this.cryptoPipeline) {
                const verifyResult = await this.cryptoPipeline.verifySignature(Buffer.from(asset.contentHash), asset.signature, { expectedKeyId: this.config.signingKeyId });
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
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Verification error: ${error.message}`],
                asset,
            };
        }
    }
    /**
     * Publish an approved asset
     */
    async publishAsset(assetId, channels, tenantId, userId) {
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
        const updatedAsset = {
            ...asset,
            status: 'published',
            distributions: [...(asset.distributions || []), ...distributions.filter(d => d.success).map(d => ({
                    channel: d.channel,
                    url: d.url,
                    distributedAt: new Date(),
                    status: 'active',
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
    async createNewVersion(originalAssetId, request, tenantId, userId) {
        await this.ensureInitialized();
        const originalAsset = await this.getAsset(originalAssetId, tenantId);
        if (!originalAsset) {
            throw new Error(`Original asset not found: ${originalAssetId}`);
        }
        // Sign the new content
        const response = await this.signAsset(request, tenantId, userId);
        // Update the new asset to link to previous version
        const updatedAsset = {
            ...response.asset,
            version: originalAsset.version + 1,
            previousVersionId: originalAssetId,
        };
        await this.updateAsset(updatedAsset);
        // Mark original as superseded if it was published
        if (originalAsset.status === 'published') {
            await this.revokeAsset({
                assetId: originalAssetId,
                reason: 'superseded',
                explanation: `Superseded by version ${updatedAsset.version}`,
                replacementId: updatedAsset.id,
            }, tenantId, userId);
        }
        return {
            ...response,
            asset: updatedAsset,
        };
    }
    /**
     * Sign content with crypto pipeline
     */
    async signContent(contentHash, content) {
        if (!this.cryptoPipeline) {
            // Fallback to simple signature
            const hmac = crypto.createHmac('sha256', process.env.CONTENT_SIGNING_SECRET || 'default-secret');
            hmac.update(content);
            return {
                keyId: this.config.signingKeyId,
                keyVersion: 1,
                algorithm: 'HMAC_SHA256',
                signature: hmac.digest('base64'),
            };
        }
        return this.cryptoPipeline.signPayload(Buffer.from(contentHash), this.config.signingKeyId, {
            includeTimestamp: true,
            metadata: {
                purpose: 'official-content-signing',
                generator: this.config.claimGenerator,
            },
        });
    }
    /**
     * Generate C2PA manifest for media content
     */
    async generateC2PAManifest(content, mimeType, contentHash, title, actorId) {
        const manifestId = `urn:uuid:${crypto.randomUUID()}`;
        const instanceId = `xmp:iid:${crypto.randomUUID()}`;
        // Create assertions
        const assertions = [
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
        const actions = [
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
        const claim = {
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
        let signatureValue;
        let algorithm = 'ES256';
        let certificate = '';
        let certificateChain = [];
        if (this.cryptoPipeline) {
            const bundle = await this.cryptoPipeline.signPayload(Buffer.from(claimData), this.config.signingKeyId, { includeTimestamp: true });
            signatureValue = bundle.signature;
            algorithm = bundle.algorithm;
            certificateChain = bundle.certificateChain || [];
            certificate = certificateChain[0] || '';
        }
        else {
            const hmac = crypto.createHmac('sha256', process.env.CONTENT_SIGNING_SECRET || 'default-secret');
            hmac.update(claimData);
            signatureValue = hmac.digest('base64');
            algorithm = 'HMAC_SHA256';
        }
        const signature = {
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
    async distributeAsset(asset, channels) {
        const results = [];
        for (const channel of channels) {
            try {
                const url = await this.distributeToChannel(asset, channel);
                results.push({ channel, success: true, url });
            }
            catch (error) {
                logger.error({ error, channel, assetId: asset.id }, 'Failed to distribute to channel');
                results.push({
                    channel,
                    success: false,
                    error: error.message,
                });
            }
        }
        return results;
    }
    /**
     * Distribute to a specific channel
     */
    async distributeToChannel(asset, channel) {
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
    async propagateRevocation(asset, revocation) {
        const results = [];
        if (!asset.distributions) {
            return results;
        }
        for (const distribution of asset.distributions) {
            const status = {
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
            }
            catch (error) {
                status.status = 'failed';
                status.error = error.message;
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
    async propagateToChannel(asset, distribution, revocation) {
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
    async storeAsset(asset) {
        await pg_js_1.pool.query(`INSERT INTO signed_assets (
        id, tenant_id, title, description, asset_type, content_hash,
        mime_type, file_size, storage_uri, public_url, version,
        previous_version_id, signature, c2pa_manifest, revocation,
        distributions, created_at, created_by, updated_at, updated_by,
        status, classification, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`, [
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
        ]);
    }
    /**
     * Update asset in database
     */
    async updateAsset(asset) {
        await pg_js_1.pool.query(`UPDATE signed_assets SET
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
      WHERE id = $1 AND tenant_id = $2`, [
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
        ]);
    }
    /**
     * Map database row to SignedAsset
     */
    mapRowToAsset(row) {
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
    async getContentBuffer(content) {
        if (Buffer.isBuffer(content)) {
            return content;
        }
        // Assume it's a file path
        return fs_1.promises.readFile(content);
    }
    /**
     * Check if MIME type is a media type suitable for C2PA
     */
    isMediaType(mimeType) {
        return (mimeType.startsWith('image/') ||
            mimeType.startsWith('video/') ||
            mimeType.startsWith('audio/') ||
            mimeType === 'application/pdf');
    }
    /**
     * Ensure service is initialized
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Cleanup any resources if needed
    }
}
exports.ContentSigningService = ContentSigningService;
// Export default instance
exports.contentSigningService = new ContentSigningService();
