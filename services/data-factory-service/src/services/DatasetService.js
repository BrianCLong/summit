"use strict";
/**
 * Data Factory Service - Dataset Service
 *
 * Manages dataset lifecycle: creation, versioning, splits, and metadata.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetService = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
const index_js_1 = require("../types/index.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'dataset-service' });
class DatasetService {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    async create(request, createdBy) {
        const id = (0, uuid_1.v4)();
        const version = '1.0.0';
        const now = new Date();
        const policyProfile = await this.getPolicyProfile(request.policyProfileId);
        if (!policyProfile) {
            throw new Error(`Policy profile not found: ${request.policyProfileId}`);
        }
        const result = await (0, connection_js_1.query)(`INSERT INTO datasets (
        id, name, description, version, status, task_type, use_case, model_target,
        source_provenance, license_id, license_type, license_text, license_url,
        attribution_required, commercial_use_allowed, derivative_works_allowed,
        sharing_allowed, license_expiration_date, jurisdiction, data_localization_required,
        retention_policy_id, compliance_frameworks, export_restrictions,
        policy_profile_id, schema_definition, quality_metrics, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`, [
            id,
            request.name,
            request.description,
            version,
            index_js_1.DatasetStatus.DRAFT,
            request.taskType,
            request.useCase,
            request.modelTarget || null,
            JSON.stringify({
                sourceId: (0, uuid_1.v4)(),
                sourceName: 'manual-upload',
                sourceType: 'internal',
                collectionDate: now,
                collectionMethod: 'manual',
                originalFormat: 'mixed',
                transformationHistory: [],
            }),
            request.license.licenseId,
            request.license.licenseType,
            request.license.licenseText || null,
            request.license.licenseUrl || null,
            request.license.attributionRequired,
            request.license.commercialUseAllowed,
            request.license.derivativeWorksAllowed,
            request.license.sharingAllowed,
            request.license.expirationDate || null,
            request.jurisdiction.jurisdiction,
            request.jurisdiction.dataLocalizationRequired,
            request.jurisdiction.retentionPolicyId,
            JSON.stringify(request.jurisdiction.complianceFrameworks),
            JSON.stringify(request.jurisdiction.exportRestrictions),
            request.policyProfileId,
            JSON.stringify(request.schema),
            JSON.stringify({ labelDistribution: {} }),
            JSON.stringify(request.tags || []),
            createdBy,
        ]);
        const dataset = this.mapRowToDataset(result.rows[0], policyProfile);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'create',
            actorId: createdBy,
            actorRole: 'user',
            newState: dataset,
            metadata: {},
        });
        logger.info({ datasetId: id, name: request.name }, 'Dataset created');
        return dataset;
    }
    async getById(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM datasets WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const policyProfile = await this.getPolicyProfile(row.policy_profile_id);
        const splits = await this.getSplits(id);
        return this.mapRowToDataset(row, policyProfile, splits);
    }
    async list(params, filters) {
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        if (filters?.status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(filters.status);
        }
        if (filters?.taskType) {
            conditions.push(`task_type = $${paramIndex++}`);
            values.push(filters.taskType);
        }
        if (filters?.useCase) {
            conditions.push(`use_case = $${paramIndex++}`);
            values.push(filters.useCase);
        }
        if (filters?.createdBy) {
            conditions.push(`created_by = $${paramIndex++}`);
            values.push(filters.createdBy);
        }
        if (filters?.tags && filters.tags.length > 0) {
            conditions.push(`tags ?| $${paramIndex++}`);
            values.push(filters.tags);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await (0, connection_js_1.query)(`SELECT COUNT(*) as count FROM datasets ${whereClause}`, values);
        const totalItems = parseInt(countResult.rows[0].count, 10);
        const offset = (params.page - 1) * params.pageSize;
        const sortColumn = params.sortBy || 'created_at';
        const sortOrder = params.sortOrder || 'desc';
        const dataResult = await (0, connection_js_1.query)(`SELECT * FROM datasets ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`, [...values, params.pageSize, offset]);
        const datasets = await Promise.all(dataResult.rows.map(async (row) => {
            const policyProfile = await this.getPolicyProfile(row.policy_profile_id);
            const splits = await this.getSplits(row.id);
            return this.mapRowToDataset(row, policyProfile, splits);
        }));
        return {
            data: datasets,
            pagination: {
                page: params.page,
                pageSize: params.pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / params.pageSize),
                hasNext: params.page * params.pageSize < totalItems,
                hasPrevious: params.page > 1,
            },
        };
    }
    async update(id, request, updatedBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Dataset not found: ${id}`);
        }
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (request.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(request.name);
        }
        if (request.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(request.description);
        }
        if (request.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(request.status);
        }
        if (request.tags !== undefined) {
            updates.push(`tags = $${paramIndex++}`);
            values.push(JSON.stringify(request.tags));
        }
        if (request.policyProfileId !== undefined) {
            updates.push(`policy_profile_id = $${paramIndex++}`);
            values.push(request.policyProfileId);
        }
        if (updates.length === 0) {
            return existing;
        }
        values.push(id);
        await (0, connection_js_1.query)(`UPDATE datasets SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
        const updated = await this.getById(id);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'update',
            actorId: updatedBy,
            actorRole: 'user',
            previousState: existing,
            newState: updated,
            metadata: { changes: Object.keys(request) },
        });
        logger.info({ datasetId: id }, 'Dataset updated');
        return updated;
    }
    async publish(id, publishedBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Dataset not found: ${id}`);
        }
        if (existing.status !== index_js_1.DatasetStatus.ACTIVE) {
            throw new Error('Dataset must be active before publishing');
        }
        if (existing.sampleCount === 0) {
            throw new Error('Dataset must have samples before publishing');
        }
        await (0, connection_js_1.query)('UPDATE datasets SET published_at = NOW() WHERE id = $1', [id]);
        const published = await this.getById(id);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'publish',
            actorId: publishedBy,
            actorRole: 'user',
            newState: published,
            metadata: {},
        });
        logger.info({ datasetId: id }, 'Dataset published');
        return published;
    }
    async createVersion(id, newVersion, createdBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Dataset not found: ${id}`);
        }
        return await (0, connection_js_1.transaction)(async (client) => {
            const newId = (0, uuid_1.v4)();
            await client.query(`INSERT INTO datasets (
          id, name, description, version, status, task_type, use_case, model_target,
          source_provenance, license_id, license_type, license_text, license_url,
          attribution_required, commercial_use_allowed, derivative_works_allowed,
          sharing_allowed, license_expiration_date, jurisdiction, data_localization_required,
          retention_policy_id, compliance_frameworks, export_restrictions,
          policy_profile_id, schema_definition, quality_metrics, tags, created_by
        )
        SELECT
          $1, name, description, $2, 'draft', task_type, use_case, model_target,
          source_provenance, license_id, license_type, license_text, license_url,
          attribution_required, commercial_use_allowed, derivative_works_allowed,
          sharing_allowed, license_expiration_date, jurisdiction, data_localization_required,
          retention_policy_id, compliance_frameworks, export_restrictions,
          policy_profile_id, schema_definition, quality_metrics, tags, $3
        FROM datasets WHERE id = $4`, [newId, newVersion, createdBy, id]);
            // Copy splits
            await client.query(`INSERT INTO dataset_splits (dataset_id, split_type, sample_count, percentage, seed, stratify_by)
         SELECT $1, split_type, 0, percentage, seed, stratify_by
         FROM dataset_splits WHERE dataset_id = $2`, [newId, id]);
            logger.info({ sourceDatasetId: id, newDatasetId: newId, version: newVersion }, 'Dataset version created');
            return (await this.getById(newId));
        });
    }
    async configureSplits(id, splits, configuredBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Dataset not found: ${id}`);
        }
        const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            throw new Error('Split percentages must sum to 100');
        }
        await (0, connection_js_1.transaction)(async (client) => {
            await client.query('DELETE FROM dataset_splits WHERE dataset_id = $1', [id]);
            for (const split of splits) {
                await client.query(`INSERT INTO dataset_splits (dataset_id, split_type, percentage, seed, stratify_by)
           VALUES ($1, $2, $3, $4, $5)`, [id, split.splitType, split.percentage, split.seed, split.stratifyBy || null]);
            }
        });
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'configure_splits',
            actorId: configuredBy,
            actorRole: 'user',
            newState: { splits },
            metadata: {},
        });
        return this.getSplits(id);
    }
    async applySplits(id, appliedBy) {
        const dataset = await this.getById(id);
        if (!dataset) {
            throw new Error(`Dataset not found: ${id}`);
        }
        const splits = await this.getSplits(id);
        if (splits.length === 0) {
            throw new Error('No splits configured');
        }
        await (0, connection_js_1.transaction)(async (client) => {
            // Get all sample IDs with deterministic ordering
            const samples = await client.query('SELECT id FROM samples WHERE dataset_id = $1 ORDER BY content_hash', [id]);
            const sampleIds = samples.rows.map((r) => r.id);
            const totalSamples = sampleIds.length;
            let currentIndex = 0;
            for (const split of splits) {
                const count = Math.round((split.percentage / 100) * totalSamples);
                const splitSampleIds = sampleIds.slice(currentIndex, currentIndex + count);
                if (splitSampleIds.length > 0) {
                    await client.query(`UPDATE samples SET split = $1 WHERE id = ANY($2)`, [split.splitType, splitSampleIds]);
                    await client.query(`UPDATE dataset_splits SET sample_count = $1
             WHERE dataset_id = $2 AND split_type = $3`, [splitSampleIds.length, id, split.splitType]);
                }
                currentIndex += count;
            }
        });
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'apply_splits',
            actorId: appliedBy,
            actorRole: 'user',
            metadata: { sampleCount: dataset.sampleCount },
        });
        logger.info({ datasetId: id }, 'Splits applied to samples');
    }
    async updateQualityMetrics(id, metrics) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Dataset not found: ${id}`);
        }
        const updatedMetrics = {
            ...existing.qualityMetrics,
            ...metrics,
        };
        await (0, connection_js_1.query)('UPDATE datasets SET quality_metrics = $1 WHERE id = $2', [JSON.stringify(updatedMetrics), id]);
        logger.debug({ datasetId: id }, 'Quality metrics updated');
    }
    async delete(id, deletedBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Dataset not found: ${id}`);
        }
        if (existing.status === index_js_1.DatasetStatus.ACTIVE) {
            throw new Error('Cannot delete active dataset. Archive it first.');
        }
        await (0, connection_js_1.query)('DELETE FROM datasets WHERE id = $1', [id]);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'delete',
            actorId: deletedBy,
            actorRole: 'user',
            previousState: existing,
            metadata: {},
        });
        logger.info({ datasetId: id }, 'Dataset deleted');
    }
    async getSplits(datasetId) {
        const result = await (0, connection_js_1.query)('SELECT split_type, sample_count, percentage, seed, stratify_by FROM dataset_splits WHERE dataset_id = $1', [datasetId]);
        return result.rows.map((row) => ({
            splitType: row.split_type,
            sampleCount: row.sample_count,
            percentage: Number(row.percentage),
            seed: row.seed,
            stratifyBy: row.stratify_by || undefined,
        }));
    }
    async getPolicyProfile(profileId) {
        const result = await (0, connection_js_1.query)('SELECT * FROM policy_profiles WHERE profile_id = $1', [profileId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            profileId: row.profile_id,
            profileName: row.profile_name,
            allowedUseCases: JSON.parse(row.allowed_use_cases),
            prohibitedUseCases: JSON.parse(row.prohibited_use_cases),
            requiredRedactions: JSON.parse(row.required_redactions),
            piiHandling: row.pii_handling,
            sensitivityLevel: row.sensitivity_level,
            auditLevel: row.audit_level,
        };
    }
    mapRowToDataset(row, policyProfile, splits = []) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            version: row.version,
            status: row.status,
            taskType: row.task_type,
            useCase: row.use_case,
            modelTarget: row.model_target || undefined,
            sampleCount: row.sample_count,
            labeledSampleCount: row.labeled_sample_count,
            splits,
            provenance: JSON.parse(row.source_provenance),
            license: {
                licenseId: row.license_id,
                licenseType: row.license_type,
                licenseText: row.license_text || undefined,
                licenseUrl: row.license_url || undefined,
                attributionRequired: row.attribution_required,
                commercialUseAllowed: row.commercial_use_allowed,
                derivativeWorksAllowed: row.derivative_works_allowed,
                sharingAllowed: row.sharing_allowed,
                expirationDate: row.license_expiration_date || undefined,
            },
            jurisdiction: {
                jurisdiction: row.jurisdiction,
                dataLocalizationRequired: row.data_localization_required,
                retentionPolicyId: row.retention_policy_id,
                retentionDays: 90, // Default from policy
                complianceFrameworks: JSON.parse(row.compliance_frameworks),
                exportRestrictions: JSON.parse(row.export_restrictions),
            },
            policyProfile,
            schema: JSON.parse(row.schema_definition),
            qualityMetrics: JSON.parse(row.quality_metrics),
            tags: JSON.parse(row.tags),
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            publishedAt: row.published_at || undefined,
        };
    }
}
exports.DatasetService = DatasetService;
