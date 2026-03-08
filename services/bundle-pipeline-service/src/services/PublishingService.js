"use strict";
// @ts-nocheck
/**
 * PublishingService - Handles bundle and briefing publication and delivery
 * Supports evidence store, email, webhooks, and secure portal delivery
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishingService = void 0;
const uuid_1 = require("uuid");
const jszip_1 = __importDefault(require("jszip"));
const ManifestService_js_1 = require("./ManifestService.js");
const BundleRepository_js_1 = require("../repositories/BundleRepository.js");
class PublishingService {
    pool;
    logger;
    repository;
    manifestService;
    provenanceClient;
    governanceClient;
    constructor(pool, provenanceClient, governanceClient, logger) {
        this.pool = pool;
        this.logger = logger.child({ service: 'PublishingService' });
        this.repository = new BundleRepository_js_1.BundleRepository(pool, logger);
        this.manifestService = new ManifestService_js_1.ManifestService();
        this.provenanceClient = provenanceClient;
        this.governanceClient = governanceClient;
    }
    /**
     * Publish a bundle and deliver to configured channels
     */
    async publishBundle(request, context) {
        const errors = [];
        const deliveryResults = [];
        const publishedAt = new Date().toISOString();
        this.logger.info({ bundleId: request.bundleId, bundleType: request.bundleType }, 'Publishing bundle');
        try {
            // 1. Fetch the bundle
            const bundle = await this.fetchBundle(request.bundleId, request.bundleType);
            if (!bundle) {
                errors.push('Bundle not found');
                return {
                    success: false,
                    bundleId: request.bundleId,
                    bundleType: request.bundleType,
                    publishedAt,
                    deliveryResults,
                    errors,
                };
            }
            // 2. Verify bundle is approved
            if (bundle.status !== 'approved') {
                errors.push(`Bundle must be approved before publishing. Current status: ${bundle.status}`);
                return {
                    success: false,
                    bundleId: request.bundleId,
                    bundleType: request.bundleType,
                    publishedAt,
                    deliveryResults,
                    errors,
                };
            }
            // 3. Verify all approvals are in place
            const approvalCheck = this.verifyApprovals(bundle);
            if (!approvalCheck.valid) {
                errors.push(...approvalCheck.errors);
                return {
                    success: false,
                    bundleId: request.bundleId,
                    bundleType: request.bundleType,
                    publishedAt,
                    deliveryResults,
                    errors,
                };
            }
            // 4. Final governance check before publish
            const governanceCheck = await this.governanceClient.checkExportPermissions(bundle.caseId, this.extractItemIds(bundle, request.bundleType), context.userId);
            if (governanceCheck.blocked) {
                errors.push(`Publication blocked: ${governanceCheck.reason}`);
                return {
                    success: false,
                    bundleId: request.bundleId,
                    bundleType: request.bundleType,
                    publishedAt,
                    deliveryResults,
                    errors,
                };
            }
            // 5. Generate exportable archive
            const archive = await this.generateArchive(bundle, request.bundleType);
            // 6. Store in evidence store (primary storage)
            const evidenceStoreResult = await this.storeInEvidenceStore(archive, bundle, request.bundleType, context);
            deliveryResults.push(evidenceStoreResult);
            // 7. Deliver to additional channels
            const channels = request.deliveryChannels || this.getDefaultDeliveryChannels(bundle, request.bundleType);
            for (const channel of channels) {
                const result = await this.deliverToChannel(channel, archive, bundle, request.bundleType, context);
                deliveryResults.push(...result);
            }
            // 8. Update bundle status
            await this.updateBundleStatus(request.bundleId, request.bundleType, 'published');
            // 9. Update delivery status in bundle
            const deliveryStatus = deliveryResults.map((r) => ({
                channelType: r.channel,
                recipient: r.recipient,
                status: r.status === 'success' ? 'delivered' : r.status === 'pending' ? 'pending' : 'failed',
                sentAt: r.sentAt,
                deliveredAt: r.deliveredAt,
                error: r.error,
            }));
            if (request.bundleType === 'briefing') {
                await this.repository.updateBriefingDeliveryStatus(request.bundleId, deliveryStatus);
            }
            // 10. Record in provenance
            await this.provenanceClient.appendEntry(bundle.provenanceChainId, {
                action: 'bundle_published',
                actor: context.userId,
                contentHash: archive.contentHash,
                metadata: {
                    archiveUri: evidenceStoreResult.deliveredAt,
                    deliveryChannels: channels.length,
                    successfulDeliveries: deliveryResults.filter((r) => r.status === 'success').length,
                },
            });
            // 11. Send notifications if requested
            if (request.notifyRecipients) {
                await this.sendNotifications(bundle, request.bundleType, deliveryResults, context);
            }
            this.logger.info({
                bundleId: request.bundleId,
                archiveHash: archive.contentHash,
                deliveries: deliveryResults.length,
            }, 'Bundle published successfully');
            return {
                success: true,
                bundleId: request.bundleId,
                bundleType: request.bundleType,
                publishedAt,
                deliveryResults,
                archiveUri: evidenceStoreResult.deliveredAt,
                archiveHash: archive.contentHash,
                errors,
            };
        }
        catch (err) {
            this.logger.error({ err, bundleId: request.bundleId }, 'Failed to publish bundle');
            errors.push(`Publication failed: ${err instanceof Error ? err.message : String(err)}`);
            return {
                success: false,
                bundleId: request.bundleId,
                bundleType: request.bundleType,
                publishedAt,
                deliveryResults,
                errors,
            };
        }
    }
    /**
     * Generate a downloadable archive for a bundle
     */
    async generateArchive(bundle, bundleType) {
        const zip = new jszip_1.default();
        const fixedDate = new Date('2000-01-01T00:00:00Z'); // Deterministic timestamps
        // Add manifest
        zip.file('manifest.json', JSON.stringify(bundle.manifest, null, 2), { date: fixedDate });
        // Add bundle metadata
        const metadata = {
            id: bundle.id,
            type: bundleType,
            title: bundle.title,
            caseId: bundle.caseId,
            classificationLevel: bundle.classificationLevel,
            sensitivityMarkings: bundle.sensitivityMarkings,
            createdAt: bundle.createdAt,
            createdBy: bundle.createdBy,
            publishedAt: new Date().toISOString(),
            provenanceChainId: bundle.provenanceChainId,
        };
        zip.file('metadata.json', JSON.stringify(metadata, null, 2), { date: fixedDate });
        // Add type-specific content
        if (bundleType === 'evidence') {
            const evidenceBundle = bundle;
            this.addEvidenceBundleContent(zip, evidenceBundle, fixedDate);
        }
        else if (bundleType === 'claim') {
            const claimBundle = bundle;
            this.addClaimBundleContent(zip, claimBundle, fixedDate);
        }
        else if (bundleType === 'briefing') {
            const briefingPackage = bundle;
            this.addBriefingContent(zip, briefingPackage, fixedDate);
        }
        // Generate ZIP buffer
        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
        });
        // Compute content hash
        const contentHash = this.manifestService.hashContent(buffer);
        const filename = `${bundleType}_bundle_${bundle.id}_${Date.now()}.zip`;
        return {
            buffer,
            filename,
            contentHash,
            manifest: bundle.manifest,
        };
    }
    /**
     * Retract a published bundle
     */
    async retractBundle(bundleId, bundleType, reason, context) {
        try {
            const bundle = await this.fetchBundle(bundleId, bundleType);
            if (!bundle) {
                return { success: false, error: 'Bundle not found' };
            }
            if (bundle.status !== 'published') {
                return { success: false, error: 'Bundle is not published' };
            }
            // Update status to retracted
            await this.updateBundleStatus(bundleId, bundleType, 'retracted');
            // Record retraction in provenance
            await this.provenanceClient.appendEntry(bundle.provenanceChainId, {
                action: 'bundle_retracted',
                actor: context.userId,
                metadata: {
                    reason,
                    retractedAt: new Date().toISOString(),
                },
            });
            // Record in governance audit
            await this.governanceClient.recordGovernanceAction('bundle_retracted', bundleType, bundleId, context.userId, { reason });
            this.logger.info({ bundleId, reason }, 'Bundle retracted');
            return { success: true };
        }
        catch (err) {
            this.logger.error({ err, bundleId }, 'Failed to retract bundle');
            return { success: false, error: String(err) };
        }
    }
    /**
     * Supersede a published bundle with a new version
     */
    async supersedeBundle(oldBundleId, newBundleId, bundleType, context) {
        try {
            const oldBundle = await this.fetchBundle(oldBundleId, bundleType);
            const newBundle = await this.fetchBundle(newBundleId, bundleType);
            if (!oldBundle || !newBundle) {
                return { success: false, error: 'One or both bundles not found' };
            }
            if (oldBundle.status !== 'published') {
                return { success: false, error: 'Old bundle is not published' };
            }
            // Update old bundle status
            await this.updateBundleStatus(oldBundleId, bundleType, 'superseded');
            // Record supersession in provenance
            await this.provenanceClient.appendEntry(oldBundle.provenanceChainId, {
                action: 'bundle_superseded',
                actor: context.userId,
                metadata: {
                    supersededBy: newBundleId,
                    supersededAt: new Date().toISOString(),
                },
            });
            await this.provenanceClient.appendEntry(newBundle.provenanceChainId, {
                action: 'bundle_supersedes',
                actor: context.userId,
                metadata: {
                    supersedes: oldBundleId,
                    supersededAt: new Date().toISOString(),
                },
            });
            this.logger.info({ oldBundleId, newBundleId }, 'Bundle superseded');
            return { success: true };
        }
        catch (err) {
            this.logger.error({ err, oldBundleId, newBundleId }, 'Failed to supersede bundle');
            return { success: false, error: String(err) };
        }
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    async fetchBundle(bundleId, bundleType) {
        switch (bundleType) {
            case 'evidence':
                return this.repository.getEvidenceBundle(bundleId);
            case 'claim':
                return this.repository.getClaimBundle(bundleId);
            case 'briefing':
                return this.repository.getBriefingPackage(bundleId);
            default:
                return null;
        }
    }
    extractItemIds(bundle, bundleType) {
        if (bundleType === 'evidence') {
            return bundle.evidenceItems.map((e) => e.id);
        }
        if (bundleType === 'claim') {
            return bundle.claims.map((c) => c.id);
        }
        // For briefings, extract from source bundles
        return [];
    }
    verifyApprovals(bundle) {
        const errors = [];
        const approvedCount = bundle.approvals.filter((a) => a.decision === 'approved').length;
        if (approvedCount < bundle.requiredApprovals) {
            errors.push(`Insufficient approvals: ${approvedCount}/${bundle.requiredApprovals} required`);
        }
        // Check four-eyes for briefings
        if ('fourEyesRequired' in bundle && bundle.fourEyesRequired) {
            const uniqueApprovers = new Set(bundle.approvals
                .filter((a) => a.decision === 'approved')
                .map((a) => a.approverId));
            if (uniqueApprovers.size < 2) {
                errors.push('Four-eyes approval required: need at least 2 unique approvers');
            }
        }
        return { valid: errors.length === 0, errors };
    }
    addEvidenceBundleContent(zip, bundle, fixedDate) {
        // Evidence items
        const evidenceFolder = zip.folder('evidence');
        for (let i = 0; i < bundle.evidenceItems.length; i++) {
            const item = bundle.evidenceItems[i];
            const filename = `${i.toString().padStart(4, '0')}_${item.id}.json`;
            evidenceFolder?.file(filename, JSON.stringify(item, null, 2), { date: fixedDate });
        }
        // Chain of custody
        zip.file('chain_of_custody.json', JSON.stringify(bundle.chainOfCustodyEvents, null, 2), { date: fixedDate });
        // License restrictions
        if (bundle.licenseRestrictions.length > 0) {
            zip.file('license_restrictions.json', JSON.stringify(bundle.licenseRestrictions, null, 2), { date: fixedDate });
        }
        // Legal holds
        if (bundle.legalHolds.length > 0) {
            zip.file('legal_holds.json', JSON.stringify(bundle.legalHolds, null, 2), { date: fixedDate });
        }
        // Approvals
        zip.file('approvals.json', JSON.stringify(bundle.approvals, null, 2), { date: fixedDate });
    }
    addClaimBundleContent(zip, bundle, fixedDate) {
        // Claims
        const claimsFolder = zip.folder('claims');
        for (let i = 0; i < bundle.claims.length; i++) {
            const claim = bundle.claims[i];
            const filename = `${i.toString().padStart(4, '0')}_${claim.id}.json`;
            claimsFolder?.file(filename, JSON.stringify(claim, null, 2), { date: fixedDate });
        }
        // Assessment summary
        if (bundle.assessmentSummary) {
            zip.file('assessment_summary.txt', bundle.assessmentSummary, { date: fixedDate });
        }
        // Analysis metadata
        zip.file('analysis.json', JSON.stringify({
            overallConfidence: bundle.overallConfidence,
            conflictingClaimsCount: bundle.conflictingClaimsCount,
            supportingEvidenceBundleIds: bundle.supportingEvidenceBundleIds,
        }, null, 2), { date: fixedDate });
        // Approvals
        zip.file('approvals.json', JSON.stringify(bundle.approvals, null, 2), { date: fixedDate });
    }
    addBriefingContent(zip, briefing, fixedDate) {
        // Executive summary
        if (briefing.executiveSummary) {
            zip.file('executive_summary.txt', briefing.executiveSummary, { date: fixedDate });
        }
        // Narrative sections
        const sectionsFolder = zip.folder('sections');
        for (const section of briefing.narrativeSections) {
            const filename = `${section.order.toString().padStart(3, '0')}_${section.id}.json`;
            sectionsFolder?.file(filename, JSON.stringify(section, null, 2), { date: fixedDate });
        }
        // Key findings
        zip.file('key_findings.json', JSON.stringify(briefing.keyFindings, null, 2), { date: fixedDate });
        // Recommendations
        zip.file('recommendations.json', JSON.stringify(briefing.recommendations, null, 2), { date: fixedDate });
        // Annexes
        const annexesFolder = zip.folder('annexes');
        for (const annex of briefing.annexes) {
            const filename = `${annex.order.toString().padStart(3, '0')}_${annex.id}.json`;
            annexesFolder?.file(filename, JSON.stringify(annex, null, 2), { date: fixedDate });
        }
        // Visualizations
        if (briefing.visualizations.length > 0) {
            zip.file('visualizations.json', JSON.stringify(briefing.visualizations, null, 2), { date: fixedDate });
        }
        // Citation index
        zip.file('citations.json', JSON.stringify(briefing.citationIndex, null, 2), { date: fixedDate });
        // Redaction log
        if (briefing.redactionLog.length > 0) {
            zip.file('redaction_log.json', JSON.stringify(briefing.redactionLog, null, 2), { date: fixedDate });
        }
        // Approvals
        zip.file('approvals.json', JSON.stringify(briefing.approvals, null, 2), { date: fixedDate });
    }
    async storeInEvidenceStore(archive, bundle, bundleType, context) {
        const now = new Date().toISOString();
        try {
            // In production, this would call the evidence store API
            // For now, simulate storage
            const storageUri = `evidence-store://${context.tenantId}/${bundleType}/${bundle.id}/${archive.filename}`;
            // Record storage in database
            await this.pool.query(`INSERT INTO published_bundles (
          id, bundle_id, bundle_type, archive_hash, storage_uri,
          published_by, published_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                (0, uuid_1.v4)(),
                bundle.id,
                bundleType,
                archive.contentHash,
                storageUri,
                context.userId,
                now,
                context.tenantId,
            ]);
            return {
                channel: 'evidence_store',
                recipient: storageUri,
                status: 'success',
                sentAt: now,
                deliveredAt: storageUri,
            };
        }
        catch (err) {
            this.logger.error({ err }, 'Failed to store in evidence store');
            return {
                channel: 'evidence_store',
                recipient: 'evidence_store',
                status: 'failed',
                sentAt: now,
                error: String(err),
            };
        }
    }
    async deliverToChannel(channel, archive, bundle, bundleType, context) {
        const results = [];
        const now = new Date().toISOString();
        for (const recipient of channel.recipients) {
            try {
                switch (channel.type) {
                    case 'email':
                        results.push(await this.deliverViaEmail(recipient, archive, bundle, bundleType, context));
                        break;
                    case 'api_webhook':
                        results.push(await this.deliverViaWebhook(channel.config, archive, bundle, bundleType, context));
                        break;
                    case 'secure_portal':
                        results.push(await this.deliverToSecurePortal(recipient, archive, bundle, bundleType, context));
                        break;
                    default:
                        results.push({
                            channel: channel.type,
                            recipient,
                            status: 'failed',
                            sentAt: now,
                            error: `Unsupported delivery channel: ${channel.type}`,
                        });
                }
            }
            catch (err) {
                results.push({
                    channel: channel.type,
                    recipient,
                    status: 'failed',
                    sentAt: now,
                    error: String(err),
                });
            }
        }
        return results;
    }
    async deliverViaEmail(recipient, archive, bundle, bundleType, context) {
        const now = new Date().toISOString();
        // In production, this would call an email service
        this.logger.info({ recipient, bundleId: bundle.id, bundleType }, 'Email delivery requested (stub)');
        // Stub implementation - return pending status
        return {
            channel: 'email',
            recipient,
            status: 'pending',
            sentAt: now,
        };
    }
    async deliverViaWebhook(config, archive, bundle, bundleType, context) {
        const now = new Date().toISOString();
        const webhookUrl = config.url;
        if (!webhookUrl) {
            return {
                channel: 'api_webhook',
                recipient: 'unknown',
                status: 'failed',
                sentAt: now,
                error: 'Webhook URL not configured',
            };
        }
        try {
            const payload = {
                event: 'bundle_published',
                bundleId: bundle.id,
                bundleType,
                title: bundle.title,
                classificationLevel: bundle.classificationLevel,
                archiveHash: archive.contentHash,
                publishedAt: now,
                publishedBy: context.userId,
            };
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': config.secret || '',
                },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                return {
                    channel: 'api_webhook',
                    recipient: webhookUrl,
                    status: 'success',
                    sentAt: now,
                    deliveredAt: now,
                };
            }
            return {
                channel: 'api_webhook',
                recipient: webhookUrl,
                status: 'failed',
                sentAt: now,
                error: `Webhook returned ${response.status}`,
            };
        }
        catch (err) {
            return {
                channel: 'api_webhook',
                recipient: webhookUrl,
                status: 'failed',
                sentAt: now,
                error: String(err),
            };
        }
    }
    async deliverToSecurePortal(recipient, archive, bundle, bundleType, context) {
        const now = new Date().toISOString();
        // In production, this would upload to a secure portal
        this.logger.info({ recipient, bundleId: bundle.id }, 'Secure portal delivery requested (stub)');
        return {
            channel: 'secure_portal',
            recipient,
            status: 'pending',
            sentAt: now,
        };
    }
    getDefaultDeliveryChannels(bundle, bundleType) {
        // For briefings, use the configured delivery channels
        if (bundleType === 'briefing') {
            const briefing = bundle;
            return briefing.deliveryChannels;
        }
        // Default to evidence store only
        return [];
    }
    async updateBundleStatus(bundleId, bundleType, status) {
        switch (bundleType) {
            case 'evidence':
                await this.repository.updateEvidenceBundleStatus(bundleId, status);
                break;
            case 'claim':
                await this.repository.updateClaimBundleStatus(bundleId, status);
                break;
            case 'briefing':
                await this.repository.updateBriefingPackageStatus(bundleId, status);
                break;
        }
    }
    async sendNotifications(bundle, bundleType, deliveryResults, context) {
        // In production, this would send notifications via configured channels
        this.logger.info({
            bundleId: bundle.id,
            bundleType,
            successfulDeliveries: deliveryResults.filter((r) => r.status === 'success').length,
        }, 'Notifications sent (stub)');
    }
}
exports.PublishingService = PublishingService;
