"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleImporter = void 0;
const index_js_1 = require("../types/index.js");
class BundleImporter {
    pool;
    signer;
    config;
    constructor(config) {
        this.pool = config.pgPool;
        this.signer = config.signer;
        this.config = config;
    }
    /**
     * Import data bundle
     */
    async importBundle(request) {
        const errors = [];
        const warnings = [];
        const conflicts = [];
        try {
            // Get bundle (either from path or directly)
            const bundle = request.bundleData;
            if (!bundle) {
                throw new Error('Bundle data is required');
            }
            // Verify bundle
            const verification = await this.verifyBundle(bundle, request);
            if (!verification.manifestValid || !verification.checksumValid) {
                errors.push('Bundle verification failed - cannot import');
                return this.createFailureResult(bundle.manifest.id, verification, errors, warnings, conflicts, request.dryRun);
            }
            if (request.verifySignatures &&
                !verification.signaturesValid) {
                errors.push('Signature verification failed - cannot import');
                return this.createFailureResult(bundle.manifest.id, verification, errors, warnings, conflicts, request.dryRun);
            }
            // Check authorization
            const authErrors = await this.checkImportAuthorization(bundle, request);
            if (authErrors.length > 0) {
                errors.push(...authErrors);
                return this.createFailureResult(bundle.manifest.id, verification, errors, warnings, conflicts, request.dryRun);
            }
            // Import content
            const importStats = await this.importContent(bundle, request, conflicts, errors, warnings);
            // Audit the import
            if (!request.dryRun) {
                await this.auditImport(bundle, request, importStats, errors);
            }
            return {
                success: errors.length === 0,
                bundleId: bundle.manifest.id,
                verification,
                statistics: importStats,
                conflicts: conflicts.map((c) => ({
                    type: c.resourceType,
                    id: c.resourceId,
                    reason: c.type,
                    resolution: c.resolution || 'unresolved',
                })),
                errors,
                warnings,
                importedAt: new Date().toISOString(),
                dryRun: request.dryRun,
            };
        }
        catch (error) {
            console.error('Bundle import failed:', error);
            errors.push(`Import failed: ${error.message}`);
            return {
                success: false,
                bundleId: 'unknown',
                verification: {
                    manifestValid: false,
                    checksumValid: false,
                    signaturesValid: false,
                    notExpired: false,
                },
                statistics: this.createEmptyStatistics(),
                conflicts: [],
                errors,
                warnings,
                importedAt: new Date().toISOString(),
                dryRun: request.dryRun,
            };
        }
    }
    /**
     * Verify bundle integrity and authorization
     */
    async verifyBundle(bundle, request) {
        const result = await this.signer.verifyBundle(bundle);
        return {
            manifestValid: true, // Schema validation done by Zod
            checksumValid: result.checksumValid,
            signaturesValid: result.signaturesValid,
            notExpired: result.notExpired,
        };
    }
    /**
     * Check import authorization
     */
    async checkImportAuthorization(bundle, request) {
        const errors = [];
        // Check classification compatibility
        if (bundle.manifest.sourceDeployment.classification !== this.config.classification) {
            errors.push(`Classification mismatch: bundle is ${bundle.manifest.sourceDeployment.classification}, target is ${this.config.classification}`);
        }
        // Check target deployment matches
        if (bundle.manifest.targetDeployment &&
            bundle.manifest.targetDeployment.id !== this.config.deploymentId) {
            errors.push(`Bundle is intended for deployment ${bundle.manifest.targetDeployment.id}, not ${this.config.deploymentId}`);
        }
        // Check requester authorization (in production, check against RBAC)
        if (!request.requester || request.requester.trim().length === 0) {
            errors.push('Requester is required for import');
        }
        return errors;
    }
    /**
     * Import bundle content
     */
    async importContent(bundle, request, conflicts, errors, warnings) {
        const stats = {
            casesImported: 0,
            entitiesImported: 0,
            relationshipsImported: 0,
            evidenceImported: 0,
            casesSkipped: 0,
            entitiesSkipped: 0,
            relationshipsSkipped: 0,
            evidenceSkipped: 0,
            conflicts: 0,
        };
        try {
            // Use transaction for atomic import
            if (!request.dryRun) {
                await this.pool.query('BEGIN');
            }
            // Import cases
            for (const caseData of bundle.content.cases) {
                const result = await this.importCase(caseData, request, conflicts);
                if (result === 'imported')
                    stats.casesImported++;
                else if (result === 'skipped')
                    stats.casesSkipped++;
                else if (result === 'conflict')
                    stats.conflicts++;
            }
            // Import entities
            for (const entityData of bundle.content.entities) {
                const result = await this.importEntity(entityData, request, conflicts);
                if (result === 'imported')
                    stats.entitiesImported++;
                else if (result === 'skipped')
                    stats.entitiesSkipped++;
                else if (result === 'conflict')
                    stats.conflicts++;
            }
            // Import relationships
            for (const relationshipData of bundle.content.relationships) {
                const result = await this.importRelationship(relationshipData, request, conflicts);
                if (result === 'imported')
                    stats.relationshipsImported++;
                else if (result === 'skipped')
                    stats.relationshipsSkipped++;
                else if (result === 'conflict')
                    stats.conflicts++;
            }
            // Import evidence
            for (const evidenceData of bundle.content.evidence) {
                const result = await this.importEvidence(evidenceData, request, conflicts);
                if (result === 'imported')
                    stats.evidenceImported++;
                else if (result === 'skipped')
                    stats.evidenceSkipped++;
                else if (result === 'conflict')
                    stats.conflicts++;
            }
            // Import provenance
            for (const provenanceData of bundle.content.provenance) {
                await this.importProvenance(provenanceData, request);
            }
            // Commit transaction
            if (!request.dryRun) {
                await this.pool.query('COMMIT');
            }
            else {
                await this.pool.query('ROLLBACK');
                warnings.push('Dry run mode - changes were not persisted');
            }
        }
        catch (error) {
            if (!request.dryRun) {
                await this.pool.query('ROLLBACK');
            }
            errors.push(`Content import failed: ${error.message}`);
            console.error('Content import error:', error);
        }
        return stats;
    }
    /**
     * Import individual resources with conflict detection
     */
    async importCase(caseData, request, conflicts) {
        try {
            // Check if case already exists
            const existing = await this.pool.query('SELECT * FROM cases WHERE id = $1', [caseData.id]);
            if (existing.rows.length > 0) {
                // Conflict detected
                const conflict = this.createConflict('case', caseData.id, existing.rows[0], caseData);
                conflicts.push(conflict);
                // Handle conflict based on resolution strategy
                switch (request.conflictResolution) {
                    case 'abort':
                        throw new Error(`Duplicate case detected: ${caseData.id}`);
                    case 'skip':
                        if (!request.dryRun) {
                            await this.recordConflict(conflict);
                        }
                        return 'skipped';
                    case 'overwrite':
                        if (!request.dryRun) {
                            await this.updateCase(caseData);
                            await this.recordConflict({
                                ...conflict,
                                resolution: 'overwritten',
                                resolvedBy: request.requester,
                            });
                        }
                        return 'imported';
                    case 'merge':
                        if (!request.dryRun) {
                            await this.mergeCase(existing.rows[0], caseData);
                            await this.recordConflict({
                                ...conflict,
                                resolution: 'merged',
                                resolvedBy: request.requester,
                            });
                        }
                        return 'imported';
                }
            }
            // Insert new case
            if (!request.dryRun) {
                await this.insertCase(caseData);
            }
            return 'imported';
        }
        catch (error) {
            console.error(`Failed to import case ${caseData.id}:`, error);
            return 'conflict';
        }
    }
    async importEntity(entityData, request, conflicts) {
        try {
            const existing = await this.pool.query('SELECT * FROM entities WHERE id = $1', [entityData.id]);
            if (existing.rows.length > 0) {
                const conflict = this.createConflict('entity', entityData.id, existing.rows[0], entityData);
                conflicts.push(conflict);
                switch (request.conflictResolution) {
                    case 'abort':
                        throw new Error(`Duplicate entity detected: ${entityData.id}`);
                    case 'skip':
                        if (!request.dryRun) {
                            await this.recordConflict(conflict);
                        }
                        return 'skipped';
                    case 'overwrite':
                        if (!request.dryRun) {
                            await this.updateEntity(entityData);
                            await this.recordConflict({
                                ...conflict,
                                resolution: 'overwritten',
                                resolvedBy: request.requester,
                            });
                        }
                        return 'imported';
                    case 'merge':
                        if (!request.dryRun) {
                            await this.mergeEntity(existing.rows[0], entityData);
                            await this.recordConflict({
                                ...conflict,
                                resolution: 'merged',
                                resolvedBy: request.requester,
                            });
                        }
                        return 'imported';
                }
            }
            if (!request.dryRun) {
                await this.insertEntity(entityData);
            }
            return 'imported';
        }
        catch (error) {
            console.error(`Failed to import entity ${entityData.id}:`, error);
            return 'conflict';
        }
    }
    async importRelationship(relationshipData, request, conflicts) {
        try {
            const existing = await this.pool.query('SELECT * FROM relationships WHERE id = $1', [relationshipData.id]);
            if (existing.rows.length > 0) {
                const conflict = this.createConflict('relationship', relationshipData.id, existing.rows[0], relationshipData);
                conflicts.push(conflict);
                switch (request.conflictResolution) {
                    case 'abort':
                        throw new Error(`Duplicate relationship detected: ${relationshipData.id}`);
                    case 'skip':
                        if (!request.dryRun) {
                            await this.recordConflict(conflict);
                        }
                        return 'skipped';
                    case 'overwrite':
                        if (!request.dryRun) {
                            await this.updateRelationship(relationshipData);
                            await this.recordConflict({
                                ...conflict,
                                resolution: 'overwritten',
                                resolvedBy: request.requester,
                            });
                        }
                        return 'imported';
                    case 'merge':
                        if (!request.dryRun) {
                            await this.mergeRelationship(existing.rows[0], relationshipData);
                            await this.recordConflict({
                                ...conflict,
                                resolution: 'merged',
                                resolvedBy: request.requester,
                            });
                        }
                        return 'imported';
                }
            }
            if (!request.dryRun) {
                await this.insertRelationship(relationshipData);
            }
            return 'imported';
        }
        catch (error) {
            console.error(`Failed to import relationship ${relationshipData.id}:`, error);
            return 'conflict';
        }
    }
    async importEvidence(evidenceData, request, conflicts) {
        try {
            const existing = await this.pool.query('SELECT * FROM evidence WHERE id = $1', [evidenceData.id]);
            if (existing.rows.length > 0) {
                const conflict = this.createConflict('evidence', evidenceData.id, existing.rows[0], evidenceData);
                conflicts.push(conflict);
                switch (request.conflictResolution) {
                    case 'abort':
                        throw new Error(`Duplicate evidence detected: ${evidenceData.id}`);
                    case 'skip':
                        if (!request.dryRun) {
                            await this.recordConflict(conflict);
                        }
                        return 'skipped';
                    default:
                        // For evidence, only allow skip or abort (no overwrite/merge)
                        if (!request.dryRun) {
                            await this.recordConflict(conflict);
                        }
                        return 'skipped';
                }
            }
            if (!request.dryRun) {
                await this.insertEvidence(evidenceData);
            }
            return 'imported';
        }
        catch (error) {
            console.error(`Failed to import evidence ${evidenceData.id}:`, error);
            return 'conflict';
        }
    }
    async importProvenance(provenanceData, request) {
        if (!request.dryRun) {
            try {
                await this.insertProvenance(provenanceData);
            }
            catch (error) {
                console.error(`Failed to import provenance ${provenanceData.id}:`, error);
            }
        }
    }
    /**
     * Database operations
     */
    async insertCase(caseData) {
        await this.pool.query(`INSERT INTO cases (id, name, description, status, tenant_id, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`, [
            caseData.id,
            caseData.name,
            caseData.description,
            caseData.status,
            caseData.tenant_id,
            caseData.created_at,
            caseData.updated_at,
            JSON.stringify(caseData.metadata || {}),
        ]);
    }
    async updateCase(caseData) {
        await this.pool.query(`UPDATE cases
       SET name = $2, description = $3, status = $4, updated_at = $5, metadata = $6
       WHERE id = $1`, [
            caseData.id,
            caseData.name,
            caseData.description,
            caseData.status,
            caseData.updated_at,
            JSON.stringify(caseData.metadata || {}),
        ]);
    }
    async mergeCase(existing, incoming) {
        // Merge logic: prefer newer data, combine metadata
        const mergedMetadata = {
            ...existing.metadata,
            ...incoming.metadata,
            _merged: true,
            _merged_at: new Date().toISOString(),
        };
        await this.pool.query(`UPDATE cases
       SET name = $2, description = $3, status = $4, updated_at = $5, metadata = $6
       WHERE id = $1`, [
            existing.id,
            incoming.name || existing.name,
            incoming.description || existing.description,
            incoming.status || existing.status,
            new Date().toISOString(),
            JSON.stringify(mergedMetadata),
        ]);
    }
    async insertEntity(entityData) {
        await this.pool.query(`INSERT INTO entities (id, type, name, properties, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`, [
            entityData.id,
            entityData.type,
            entityData.name,
            JSON.stringify(entityData.properties || {}),
            entityData.created_at,
            entityData.updated_at,
        ]);
    }
    async updateEntity(entityData) {
        await this.pool.query(`UPDATE entities
       SET type = $2, name = $3, properties = $4, updated_at = $5
       WHERE id = $1`, [
            entityData.id,
            entityData.type,
            entityData.name,
            JSON.stringify(entityData.properties || {}),
            entityData.updated_at,
        ]);
    }
    async mergeEntity(existing, incoming) {
        const mergedProperties = {
            ...existing.properties,
            ...incoming.properties,
            _merged: true,
            _merged_at: new Date().toISOString(),
        };
        await this.pool.query(`UPDATE entities
       SET name = $2, properties = $3, updated_at = $4
       WHERE id = $1`, [
            existing.id,
            incoming.name || existing.name,
            JSON.stringify(mergedProperties),
            new Date().toISOString(),
        ]);
    }
    async insertRelationship(relationshipData) {
        await this.pool.query(`INSERT INTO relationships (id, type, source_id, target_id, properties, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`, [
            relationshipData.id,
            relationshipData.type,
            relationshipData.source_id,
            relationshipData.target_id,
            JSON.stringify(relationshipData.properties || {}),
            relationshipData.created_at,
            relationshipData.updated_at,
        ]);
    }
    async updateRelationship(relationshipData) {
        await this.pool.query(`UPDATE relationships
       SET type = $2, properties = $3, updated_at = $4
       WHERE id = $1`, [
            relationshipData.id,
            relationshipData.type,
            JSON.stringify(relationshipData.properties || {}),
            relationshipData.updated_at,
        ]);
    }
    async mergeRelationship(existing, incoming) {
        const mergedProperties = {
            ...existing.properties,
            ...incoming.properties,
            _merged: true,
            _merged_at: new Date().toISOString(),
        };
        await this.pool.query(`UPDATE relationships
       SET properties = $2, updated_at = $3
       WHERE id = $1`, [existing.id, JSON.stringify(mergedProperties), new Date().toISOString()]);
    }
    async insertEvidence(evidenceData) {
        await this.pool.query(`INSERT INTO evidence (id, case_id, source_ref, checksum, checksum_algorithm,
        content_type, file_size, transform_chain, license_id, policy_labels,
        authority_id, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`, [
            evidenceData.id,
            evidenceData.case_id,
            evidenceData.source_ref,
            evidenceData.checksum,
            evidenceData.checksum_algorithm,
            evidenceData.content_type,
            evidenceData.file_size,
            JSON.stringify(evidenceData.transform_chain || []),
            evidenceData.license_id,
            JSON.stringify(evidenceData.policy_labels || []),
            evidenceData.authority_id,
            evidenceData.created_at,
            JSON.stringify(evidenceData.metadata || {}),
        ]);
    }
    async insertProvenance(provenanceData) {
        await this.pool.query(`INSERT INTO provenance_chains (id, claim_id, transforms, sources, lineage, created_at, authority_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`, [
            provenanceData.id,
            provenanceData.claim_id,
            JSON.stringify(provenanceData.transforms || []),
            JSON.stringify(provenanceData.sources || []),
            JSON.stringify(provenanceData.lineage || {}),
            provenanceData.created_at,
            provenanceData.authority_id,
        ]);
    }
    /**
     * Conflict management
     */
    createConflict(resourceType, resourceId, existingData, incomingData) {
        return {
            id: (0, index_js_1.generateConflictId)(),
            bundleId: incomingData.bundle_id || 'unknown',
            type: 'duplicate_id',
            resourceType: resourceType,
            resourceId,
            existingData,
            incomingData,
            detectedAt: new Date().toISOString(),
        };
    }
    async recordConflict(conflict) {
        try {
            await this.pool.query(`INSERT INTO sync_conflicts (id, bundle_id, type, resource_type, resource_id,
          existing_data, incoming_data, detected_at, resolved_at, resolution, resolved_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                conflict.id,
                conflict.bundleId,
                conflict.type,
                conflict.resourceType,
                conflict.resourceId,
                JSON.stringify(conflict.existingData),
                JSON.stringify(conflict.incomingData),
                conflict.detectedAt,
                conflict.resolvedAt || null,
                conflict.resolution || null,
                conflict.resolvedBy || null,
            ]);
        }
        catch (error) {
            console.error('Failed to record conflict:', error);
        }
    }
    /**
     * Audit import operation
     */
    async auditImport(bundle, request, statistics, errors) {
        try {
            await this.pool.query(`INSERT INTO sync_audit_log
         (bundle_id, operation, actor, source_deployment, target_deployment, scope,
          result, statistics, errors, reason, classification, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`, [
                bundle.manifest.id,
                'import',
                request.requester,
                bundle.manifest.sourceDeployment.id,
                this.config.deploymentId,
                JSON.stringify(bundle.manifest.scope),
                errors.length === 0 ? 'success' : 'failure',
                JSON.stringify(statistics),
                JSON.stringify(errors),
                request.reason,
                this.config.classification,
            ]);
        }
        catch (error) {
            console.error('Failed to audit import:', error);
        }
    }
    /**
     * Helper methods
     */
    createEmptyStatistics() {
        return {
            casesImported: 0,
            entitiesImported: 0,
            relationshipsImported: 0,
            evidenceImported: 0,
            casesSkipped: 0,
            entitiesSkipped: 0,
            relationshipsSkipped: 0,
            evidenceSkipped: 0,
            conflicts: 0,
        };
    }
    createFailureResult(bundleId, verification, errors, warnings, conflicts, dryRun) {
        return {
            success: false,
            bundleId,
            verification,
            statistics: this.createEmptyStatistics(),
            conflicts: conflicts.map((c) => ({
                type: c.resourceType,
                id: c.resourceId,
                reason: c.type,
                resolution: c.resolution || 'unresolved',
            })),
            errors,
            warnings,
            importedAt: new Date().toISOString(),
            dryRun,
        };
    }
}
exports.BundleImporter = BundleImporter;
