"use strict";
/**
 * BundleRepository - Data access layer for evidence and claim bundles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleRepository = void 0;
class BundleRepository {
    pool;
    logger;
    constructor(pool, logger) {
        this.pool = pool;
        this.logger = logger.child({ component: 'BundleRepository' });
    }
    // ============================================================================
    // Evidence Bundle Operations
    // ============================================================================
    async saveEvidenceBundle(bundle) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`INSERT INTO evidence_bundles (
          id, case_id, tenant_id, title, description,
          evidence_items, related_entity_ids,
          classification_level, sensitivity_markings,
          license_restrictions, legal_holds, warrant_metadata,
          manifest, provenance_chain_id, chain_of_custody_events,
          status, version, created_at, created_by, updated_at,
          published_at, expires_at, approvals, required_approvals, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25
        )`, [
                bundle.id,
                bundle.caseId,
                bundle.tenantId,
                bundle.title,
                bundle.description,
                JSON.stringify(bundle.evidenceItems),
                JSON.stringify(bundle.relatedEntityIds),
                bundle.classificationLevel,
                JSON.stringify(bundle.sensitivityMarkings),
                JSON.stringify(bundle.licenseRestrictions),
                JSON.stringify(bundle.legalHolds),
                JSON.stringify(bundle.warrantMetadata),
                JSON.stringify(bundle.manifest),
                bundle.provenanceChainId,
                JSON.stringify(bundle.chainOfCustodyEvents),
                bundle.status,
                bundle.version,
                bundle.createdAt,
                bundle.createdBy,
                bundle.updatedAt,
                bundle.publishedAt,
                bundle.expiresAt,
                JSON.stringify(bundle.approvals),
                bundle.requiredApprovals,
                JSON.stringify(bundle.metadata),
            ]);
            await client.query('COMMIT');
            this.logger.debug({ bundleId: bundle.id }, 'Evidence bundle saved');
        }
        catch (err) {
            await client.query('ROLLBACK');
            this.logger.error({ err, bundleId: bundle.id }, 'Failed to save evidence bundle');
            throw err;
        }
        finally {
            client.release();
        }
    }
    async getEvidenceBundle(id) {
        const result = await this.pool.query('SELECT * FROM evidence_bundles WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToEvidenceBundle(result.rows[0]);
    }
    async getEvidenceBundlesByCase(caseId, tenantId) {
        const result = await this.pool.query('SELECT * FROM evidence_bundles WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [caseId, tenantId]);
        return result.rows.map((row) => this.mapRowToEvidenceBundle(row));
    }
    async updateEvidenceBundleStatus(id, status) {
        const updates = {
            status,
            updated_at: new Date().toISOString(),
        };
        if (status === 'published') {
            updates.published_at = new Date().toISOString();
        }
        const setClauses = Object.keys(updates)
            .map((key, i) => `${key} = $${i + 2}`)
            .join(', ');
        await this.pool.query(`UPDATE evidence_bundles SET ${setClauses} WHERE id = $1`, [id, ...Object.values(updates)]);
    }
    async updateEvidenceBundleApprovals(id, approvals) {
        await this.pool.query('UPDATE evidence_bundles SET approvals = $2, updated_at = $3 WHERE id = $1', [id, JSON.stringify(approvals), new Date().toISOString()]);
    }
    async incrementEvidenceBundleVersion(id) {
        const result = await this.pool.query('UPDATE evidence_bundles SET version = version + 1, updated_at = $2 WHERE id = $1 RETURNING version', [id, new Date().toISOString()]);
        return result.rows[0]?.version || 1;
    }
    // ============================================================================
    // Claim Bundle Operations
    // ============================================================================
    async saveClaimBundle(bundle) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`INSERT INTO claim_bundles (
          id, case_id, tenant_id, title, description,
          claims, supporting_evidence_bundle_ids, related_entity_ids,
          overall_confidence, conflicting_claims_count, assessment_summary,
          classification_level, sensitivity_markings,
          manifest, provenance_chain_id,
          status, version, created_at, created_by, updated_at, published_at,
          approvals, required_approvals, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )`, [
                bundle.id,
                bundle.caseId,
                bundle.tenantId,
                bundle.title,
                bundle.description,
                JSON.stringify(bundle.claims),
                JSON.stringify(bundle.supportingEvidenceBundleIds),
                JSON.stringify(bundle.relatedEntityIds),
                bundle.overallConfidence,
                bundle.conflictingClaimsCount,
                bundle.assessmentSummary,
                bundle.classificationLevel,
                JSON.stringify(bundle.sensitivityMarkings),
                JSON.stringify(bundle.manifest),
                bundle.provenanceChainId,
                bundle.status,
                bundle.version,
                bundle.createdAt,
                bundle.createdBy,
                bundle.updatedAt,
                bundle.publishedAt,
                JSON.stringify(bundle.approvals),
                bundle.requiredApprovals,
                JSON.stringify(bundle.metadata),
            ]);
            await client.query('COMMIT');
            this.logger.debug({ bundleId: bundle.id }, 'Claim bundle saved');
        }
        catch (err) {
            await client.query('ROLLBACK');
            this.logger.error({ err, bundleId: bundle.id }, 'Failed to save claim bundle');
            throw err;
        }
        finally {
            client.release();
        }
    }
    async getClaimBundle(id) {
        const result = await this.pool.query('SELECT * FROM claim_bundles WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToClaimBundle(result.rows[0]);
    }
    async getClaimBundlesByCase(caseId, tenantId) {
        const result = await this.pool.query('SELECT * FROM claim_bundles WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [caseId, tenantId]);
        return result.rows.map((row) => this.mapRowToClaimBundle(row));
    }
    async updateClaimBundleStatus(id, status) {
        const updates = {
            status,
            updated_at: new Date().toISOString(),
        };
        if (status === 'published') {
            updates.published_at = new Date().toISOString();
        }
        const setClauses = Object.keys(updates)
            .map((key, i) => `${key} = $${i + 2}`)
            .join(', ');
        await this.pool.query(`UPDATE claim_bundles SET ${setClauses} WHERE id = $1`, [id, ...Object.values(updates)]);
    }
    async updateClaimBundleApprovals(id, approvals) {
        await this.pool.query('UPDATE claim_bundles SET approvals = $2, updated_at = $3 WHERE id = $1', [id, JSON.stringify(approvals), new Date().toISOString()]);
    }
    // ============================================================================
    // Briefing Package Operations
    // ============================================================================
    async saveBriefingPackage(briefing) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`INSERT INTO briefing_packages (
          id, case_id, tenant_id, title, briefing_type,
          evidence_bundle_ids, claim_bundle_ids, additional_sources,
          executive_summary, narrative_sections, key_findings,
          recommendations, annexes, slide_decks, visualizations,
          classification_level, sensitivity_markings, redaction_log,
          manifest, provenance_chain_id, citation_index,
          status, version, created_at, created_by, updated_at,
          published_at, distribution_list,
          approvals, required_approvals, four_eyes_required,
          delivery_channels, delivery_status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
        )`, [
                briefing.id,
                briefing.caseId,
                briefing.tenantId,
                briefing.title,
                briefing.briefingType,
                JSON.stringify(briefing.evidenceBundleIds),
                JSON.stringify(briefing.claimBundleIds),
                JSON.stringify(briefing.additionalSources),
                briefing.executiveSummary,
                JSON.stringify(briefing.narrativeSections),
                JSON.stringify(briefing.keyFindings),
                JSON.stringify(briefing.recommendations),
                JSON.stringify(briefing.annexes),
                JSON.stringify(briefing.slideDecks),
                JSON.stringify(briefing.visualizations),
                briefing.classificationLevel,
                JSON.stringify(briefing.sensitivityMarkings),
                JSON.stringify(briefing.redactionLog),
                JSON.stringify(briefing.manifest),
                briefing.provenanceChainId,
                JSON.stringify(briefing.citationIndex),
                briefing.status,
                briefing.version,
                briefing.createdAt,
                briefing.createdBy,
                briefing.updatedAt,
                briefing.publishedAt,
                JSON.stringify(briefing.distributionList),
                JSON.stringify(briefing.approvals),
                briefing.requiredApprovals,
                briefing.fourEyesRequired,
                JSON.stringify(briefing.deliveryChannels),
                JSON.stringify(briefing.deliveryStatus),
                JSON.stringify(briefing.metadata),
            ]);
            await client.query('COMMIT');
            this.logger.debug({ briefingId: briefing.id }, 'Briefing package saved');
        }
        catch (err) {
            await client.query('ROLLBACK');
            this.logger.error({ err, briefingId: briefing.id }, 'Failed to save briefing package');
            throw err;
        }
        finally {
            client.release();
        }
    }
    async getBriefingPackage(id) {
        const result = await this.pool.query('SELECT * FROM briefing_packages WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToBriefingPackage(result.rows[0]);
    }
    async getBriefingPackagesByCase(caseId, tenantId) {
        const result = await this.pool.query('SELECT * FROM briefing_packages WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [caseId, tenantId]);
        return result.rows.map((row) => this.mapRowToBriefingPackage(row));
    }
    async updateBriefingPackageStatus(id, status) {
        const updates = {
            status,
            updated_at: new Date().toISOString(),
        };
        if (status === 'published') {
            updates.published_at = new Date().toISOString();
        }
        const setClauses = Object.keys(updates)
            .map((key, i) => `${key} = $${i + 2}`)
            .join(', ');
        await this.pool.query(`UPDATE briefing_packages SET ${setClauses} WHERE id = $1`, [id, ...Object.values(updates)]);
    }
    async updateBriefingPackageApprovals(id, approvals) {
        await this.pool.query('UPDATE briefing_packages SET approvals = $2, updated_at = $3 WHERE id = $1', [id, JSON.stringify(approvals), new Date().toISOString()]);
    }
    async updateBriefingDeliveryStatus(id, deliveryStatus) {
        await this.pool.query('UPDATE briefing_packages SET delivery_status = $2, updated_at = $3 WHERE id = $1', [id, JSON.stringify(deliveryStatus), new Date().toISOString()]);
    }
    // ============================================================================
    // Evidence and Claim Item Operations
    // ============================================================================
    async getEvidenceItem(id, caseId) {
        const result = await this.pool.query('SELECT * FROM evidence_items WHERE id = $1 AND case_id = $2', [id, caseId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToEvidenceItem(result.rows[0]);
    }
    async getClaimItem(id, caseId) {
        const result = await this.pool.query('SELECT * FROM claim_items WHERE id = $1 AND case_id = $2', [id, caseId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToClaimItem(result.rows[0]);
    }
    // ============================================================================
    // Mapping Functions
    // ============================================================================
    mapRowToEvidenceBundle(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            tenantId: row.tenant_id,
            title: row.title,
            description: row.description,
            evidenceItems: JSON.parse(row.evidence_items || '[]'),
            relatedEntityIds: JSON.parse(row.related_entity_ids || '[]'),
            classificationLevel: row.classification_level,
            sensitivityMarkings: JSON.parse(row.sensitivity_markings || '[]'),
            licenseRestrictions: JSON.parse(row.license_restrictions || '[]'),
            legalHolds: JSON.parse(row.legal_holds || '[]'),
            warrantMetadata: row.warrant_metadata
                ? JSON.parse(row.warrant_metadata)
                : undefined,
            manifest: JSON.parse(row.manifest),
            provenanceChainId: row.provenance_chain_id,
            chainOfCustodyEvents: JSON.parse(row.chain_of_custody_events || '[]'),
            status: row.status,
            version: row.version,
            createdAt: row.created_at,
            createdBy: row.created_by,
            updatedAt: row.updated_at,
            publishedAt: row.published_at,
            expiresAt: row.expires_at,
            approvals: JSON.parse(row.approvals || '[]'),
            requiredApprovals: row.required_approvals,
            metadata: JSON.parse(row.metadata || '{}'),
        };
    }
    mapRowToClaimBundle(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            tenantId: row.tenant_id,
            title: row.title,
            description: row.description,
            claims: JSON.parse(row.claims || '[]'),
            supportingEvidenceBundleIds: JSON.parse(row.supporting_evidence_bundle_ids || '[]'),
            relatedEntityIds: JSON.parse(row.related_entity_ids || '[]'),
            overallConfidence: row.overall_confidence,
            conflictingClaimsCount: row.conflicting_claims_count,
            assessmentSummary: row.assessment_summary,
            classificationLevel: row.classification_level,
            sensitivityMarkings: JSON.parse(row.sensitivity_markings || '[]'),
            manifest: JSON.parse(row.manifest),
            provenanceChainId: row.provenance_chain_id,
            status: row.status,
            version: row.version,
            createdAt: row.created_at,
            createdBy: row.created_by,
            updatedAt: row.updated_at,
            publishedAt: row.published_at,
            approvals: JSON.parse(row.approvals || '[]'),
            requiredApprovals: row.required_approvals,
            metadata: JSON.parse(row.metadata || '{}'),
        };
    }
    mapRowToBriefingPackage(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            tenantId: row.tenant_id,
            title: row.title,
            briefingType: row.briefing_type,
            evidenceBundleIds: JSON.parse(row.evidence_bundle_ids || '[]'),
            claimBundleIds: JSON.parse(row.claim_bundle_ids || '[]'),
            additionalSources: JSON.parse(row.additional_sources || '[]'),
            executiveSummary: row.executive_summary,
            narrativeSections: JSON.parse(row.narrative_sections || '[]'),
            keyFindings: JSON.parse(row.key_findings || '[]'),
            recommendations: JSON.parse(row.recommendations || '[]'),
            annexes: JSON.parse(row.annexes || '[]'),
            slideDecks: row.slide_decks ? JSON.parse(row.slide_decks) : undefined,
            visualizations: JSON.parse(row.visualizations || '[]'),
            classificationLevel: row.classification_level,
            sensitivityMarkings: JSON.parse(row.sensitivity_markings || '[]'),
            redactionLog: JSON.parse(row.redaction_log || '[]'),
            manifest: JSON.parse(row.manifest),
            provenanceChainId: row.provenance_chain_id,
            citationIndex: JSON.parse(row.citation_index || '[]'),
            status: row.status,
            version: row.version,
            createdAt: row.created_at,
            createdBy: row.created_by,
            updatedAt: row.updated_at,
            publishedAt: row.published_at,
            distributionList: JSON.parse(row.distribution_list || '[]'),
            approvals: JSON.parse(row.approvals || '[]'),
            requiredApprovals: row.required_approvals,
            fourEyesRequired: row.four_eyes_required,
            deliveryChannels: JSON.parse(row.delivery_channels || '[]'),
            deliveryStatus: JSON.parse(row.delivery_status || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
        };
    }
    mapRowToEvidenceItem(row) {
        return {
            id: row.id,
            type: row.type,
            title: row.title,
            description: row.description,
            sourceUri: row.source_uri,
            contentHash: row.content_hash,
            mimeType: row.mime_type,
            sizeBytes: row.size_bytes,
            collectedAt: row.collected_at,
            collectedBy: row.collected_by,
            chainOfCustodyHash: row.chain_of_custody_hash,
            classificationLevel: row.classification_level,
            sensitivityMarkings: JSON.parse(row.sensitivity_markings || '[]'),
            licenseType: row.license_type,
            metadata: JSON.parse(row.metadata || '{}'),
        };
    }
    mapRowToClaimItem(row) {
        return {
            id: row.id,
            statement: row.statement,
            confidence: row.confidence,
            source: row.source,
            createdBy: row.created_by,
            createdAt: row.created_at,
            supportingEvidenceIds: JSON.parse(row.supporting_evidence_ids || '[]'),
            contradictingEvidenceIds: JSON.parse(row.contradicting_evidence_ids || '[]'),
            status: row.status,
            provenanceHash: row.provenance_hash,
            entityRefs: JSON.parse(row.entity_refs || '[]'),
            tags: JSON.parse(row.tags || '[]'),
        };
    }
}
exports.BundleRepository = BundleRepository;
