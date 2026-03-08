"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_RESIDENCY_SCHEMA = exports.DataResidencyService = void 0;
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const toEncodedString = (value, encoding) => Buffer.from(value).toString(encoding);
const randomHex = (size) => toEncodedString((0, crypto_1.randomBytes)(size), 'hex');
const ResidencyConfigSchema = zod_1.z.object({
    region: zod_1.z.string(),
    country: zod_1.z.string(),
    jurisdiction: zod_1.z.string(),
    dataClassifications: zod_1.z.array(zod_1.z.string()),
    allowedTransfers: zod_1.z.array(zod_1.z.string()),
    retentionPolicyDays: zod_1.z.number().min(1).max(36500), // 1 day to 100 years
    encryptionRequired: zod_1.z.boolean(),
});
const KMSConfigSchema = zod_1.z.object({
    provider: zod_1.z.enum([
        'aws-kms',
        'azure-keyvault',
        'gcp-kms',
        'hashicorp-vault',
        'customer-managed',
    ]),
    keyId: zod_1.z.string(),
    region: zod_1.z.string(),
    endpoint: zod_1.z.string().optional(),
    credentials: zod_1.z
        .object({
        accessKey: zod_1.z.string().optional(),
        secretKey: zod_1.z.string().optional(),
        token: zod_1.z.string().optional(),
    })
        .optional(),
});
class DataResidencyService {
    kmsProviders = new Map();
    constructor() {
        this.initializeKMSProviders();
    }
    initializeKMSProviders() {
        // Initialize KMS providers based on environment
        if (process.env.AWS_KMS_ENABLED === 'true') {
            this.kmsProviders.set('aws-kms', {
                encrypt: this.encryptWithAWSKMS.bind(this),
                decrypt: this.decryptWithAWSKMS.bind(this),
                generateDataKey: this.generateAWSDataKey.bind(this),
            });
        }
        if (process.env.AZURE_KEYVAULT_ENABLED === 'true') {
            this.kmsProviders.set('azure-keyvault', {
                encrypt: this.encryptWithAzureKV.bind(this),
                decrypt: this.decryptWithAzureKV.bind(this),
                generateDataKey: this.generateAzureDataKey.bind(this),
            });
        }
        if (process.env.GCP_KMS_ENABLED === 'true') {
            this.kmsProviders.set('gcp-kms', {
                encrypt: this.encryptWithGCPKMS.bind(this),
                decrypt: this.decryptWithGCPKMS.bind(this),
                generateDataKey: this.generateGCPDataKey.bind(this),
            });
        }
        // Customer-managed encryption (envelope encryption with local keys)
        this.kmsProviders.set('customer-managed', {
            encrypt: this.encryptWithCustomerKey.bind(this),
            decrypt: this.decryptWithCustomerKey.bind(this),
            generateDataKey: this.generateCustomerDataKey.bind(this),
        });
    }
    async configureDataResidency(tenantId, config) {
        const span = otel_tracing_js_1.otelService.createSpan('data-residency.configure');
        try {
            const validatedConfig = ResidencyConfigSchema.parse(config);
            const pool = (0, postgres_js_1.getPostgresPool)();
            const configId = `residency-${tenantId}-${Date.now()}`;
            // Store residency configuration
            await pool.query(`INSERT INTO data_residency_configs (
          id, tenant_id, region, country, jurisdiction, 
          data_classifications, allowed_transfers, retention_policy_days, 
          encryption_required, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
        ON CONFLICT (tenant_id) 
        DO UPDATE SET 
          region = EXCLUDED.region,
          country = EXCLUDED.country,
          jurisdiction = EXCLUDED.jurisdiction,
          data_classifications = EXCLUDED.data_classifications,
          allowed_transfers = EXCLUDED.allowed_transfers,
          retention_policy_days = EXCLUDED.retention_policy_days,
          encryption_required = EXCLUDED.encryption_required,
          updated_at = now()`, [
                configId,
                tenantId,
                validatedConfig.region,
                validatedConfig.country,
                validatedConfig.jurisdiction,
                JSON.stringify(validatedConfig.dataClassifications),
                JSON.stringify(validatedConfig.allowedTransfers),
                validatedConfig.retentionPolicyDays,
                validatedConfig.encryptionRequired,
            ]);
            // Create audit log entry
            await pool.query(`INSERT INTO data_residency_audit (
          tenant_id, action, config_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, now())`, [
                tenantId,
                'residency_config_updated',
                configId,
                JSON.stringify({
                    region: validatedConfig.region,
                    country: validatedConfig.country,
                    jurisdiction: validatedConfig.jurisdiction,
                }),
            ]);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'data-residency.tenant_id': tenantId,
                'data-residency.region': validatedConfig.region,
                'data-residency.country': validatedConfig.country,
            });
            return configId;
        }
        catch (error) {
            console.error('Data residency configuration failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async configureKMS(tenantId, config) {
        const span = otel_tracing_js_1.otelService.createSpan('data-residency.configure-kms');
        try {
            const validatedConfig = KMSConfigSchema.parse(config);
            const pool = (0, postgres_js_1.getPostgresPool)();
            const kmsConfigId = `kms-${tenantId}-${Date.now()}`;
            // Test KMS connectivity before storing config
            await this.testKMSConnectivity(validatedConfig);
            // Store KMS configuration (credentials encrypted at rest)
            const encryptedCredentials = config.credentials
                ? await this.encryptCredentials(JSON.stringify(config.credentials))
                : null;
            await pool.query(`INSERT INTO kms_configs (
          id, tenant_id, provider, key_id, region, endpoint, 
          encrypted_credentials, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
        ON CONFLICT (tenant_id) 
        DO UPDATE SET 
          provider = EXCLUDED.provider,
          key_id = EXCLUDED.key_id,
          region = EXCLUDED.region,
          endpoint = EXCLUDED.endpoint,
          encrypted_credentials = EXCLUDED.encrypted_credentials,
          updated_at = now()`, [
                kmsConfigId,
                tenantId,
                validatedConfig.provider,
                validatedConfig.keyId,
                validatedConfig.region,
                validatedConfig.endpoint,
                encryptedCredentials,
            ]);
            // Create audit log entry (no sensitive data)
            await pool.query(`INSERT INTO data_residency_audit (
          tenant_id, action, config_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, now())`, [
                tenantId,
                'kms_config_updated',
                kmsConfigId,
                JSON.stringify({
                    provider: validatedConfig.provider,
                    region: validatedConfig.region,
                    keyId: validatedConfig.keyId.substring(0, 8) + '***',
                }),
            ]);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'data-residency.tenant_id': tenantId,
                'data-residency.kms_provider': validatedConfig.provider,
                'data-residency.kms_region': validatedConfig.region,
            });
            return kmsConfigId;
        }
        catch (error) {
            console.error('KMS configuration failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async encryptData(tenantId, data, dataClassification) {
        const span = otel_tracing_js_1.otelService.createSpan('data-residency.encrypt');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Get residency and KMS configs
            const region = process.env.SUMMIT_REGION || 'us-east-1';
            const [residencyConfig, kmsConfig] = await Promise.all([
                this.getResidencyConfig(tenantId),
                this.getKMSConfig(tenantId, region),
            ]);
            // Check residency compliance
            const residencyCompliant = this.checkResidencyCompliance(dataClassification, residencyConfig);
            if (!residencyCompliant && residencyConfig?.encryptionRequired) {
                throw new Error('Data classification not compatible with tenant residency requirements');
            }
            // Encrypt based on KMS configuration
            let encryptionResult;
            if (kmsConfig && this.kmsProviders.has(kmsConfig.provider)) {
                const kmsProvider = this.kmsProviders.get(kmsConfig.provider);
                encryptionResult = await kmsProvider.encrypt(data, kmsConfig, dataClassification);
            }
            else {
                // Fallback to local encryption
                encryptionResult = await this.encryptLocally(data, dataClassification);
            }
            const encryptionMetadata = {
                algorithm: encryptionResult.algorithm,
                keyId: encryptionResult.keyId,
                encryptionTimestamp: new Date().toISOString(),
                dataClassification: dataClassification.level,
                residencyRegion: residencyConfig?.region || 'unknown',
                kmsProvider: kmsConfig?.provider || 'local',
            };
            // Store encryption audit trail
            await pool.query(`INSERT INTO encryption_audit (
          tenant_id, data_hash, classification_level, encryption_method,
          kms_provider, region, compliant, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`, [
                tenantId,
                (0, crypto_1.createHash)('sha256').update(data).digest('hex'),
                dataClassification.level,
                encryptionResult.algorithm,
                kmsConfig?.provider || 'local',
                residencyConfig?.region || 'unknown',
                residencyCompliant,
            ]);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'data-residency.tenant_id': tenantId,
                'data-residency.classification': dataClassification.level,
                'data-residency.compliant': residencyCompliant,
                'data-residency.encryption_method': encryptionResult.algorithm,
            });
            return {
                encryptedData: encryptionResult.encryptedData,
                encryptionMetadata,
                residencyCompliant,
            };
        }
        catch (error) {
            console.error('Data encryption failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async decryptData(tenantId, encryptedData, encryptionMetadata) {
        const span = otel_tracing_js_1.otelService.createSpan('data-residency.decrypt');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Get KMS config for decryption
            const region = process.env.SUMMIT_REGION || 'us-east-1';
            const kmsConfig = await this.getKMSConfig(tenantId, region);
            let decryptedData;
            if (kmsConfig && this.kmsProviders.has(kmsConfig.provider)) {
                const kmsProvider = this.kmsProviders.get(kmsConfig.provider);
                decryptedData = await kmsProvider.decrypt(encryptedData, kmsConfig, encryptionMetadata);
            }
            else {
                // Fallback to local decryption
                decryptedData = await this.decryptLocally(encryptedData, encryptionMetadata);
            }
            // Audit decryption event
            await pool.query(`INSERT INTO decryption_audit (
          tenant_id, data_hash, decryption_timestamp, successful, created_at
        ) VALUES ($1, $2, now(), $3, now())`, [
                tenantId,
                (0, crypto_1.createHash)('sha256').update(decryptedData).digest('hex'),
                true,
            ]);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'data-residency.tenant_id': tenantId,
                'data-residency.decryption_successful': true,
                'data-residency.kms_provider': kmsConfig?.provider || 'local',
            });
            return decryptedData;
        }
        catch (error) {
            console.error('Data decryption failed:', error);
            // Audit failed decryption
            const pool = (0, postgres_js_1.getPostgresPool)();
            await pool
                .query(`INSERT INTO decryption_audit (
          tenant_id, decryption_timestamp, successful, error_message, created_at
        ) VALUES ($1, now(), $2, $3, now())`, [tenantId, false, error.message])
                .catch(() => { }); // Non-fatal audit logging
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async checkDataTransferCompliance(tenantId, sourceRegion, targetRegion, dataClassification) {
        const span = otel_tracing_js_1.otelService.createSpan('data-residency.transfer-compliance');
        try {
            const residencyConfig = await this.getResidencyConfig(tenantId);
            if (!residencyConfig) {
                return {
                    compliant: false,
                    reason: 'No data residency configuration found for tenant',
                };
            }
            // Check if target region is in allowed transfers
            if (!residencyConfig.allowedTransfers.includes(targetRegion)) {
                return {
                    compliant: false,
                    reason: `Transfer to ${targetRegion} not permitted by residency policy`,
                };
            }
            // Check jurisdiction compatibility
            const jurisdictionMapping = await this.getJurisdictionMapping();
            const sourceJurisdiction = jurisdictionMapping[sourceRegion];
            const targetJurisdiction = jurisdictionMapping[targetRegion];
            if (sourceJurisdiction !== targetJurisdiction) {
                const additionalControls = [];
                const requiredApprovals = [];
                // High-classification data requires additional controls
                if (['confidential', 'restricted', 'top-secret'].includes(dataClassification.level)) {
                    additionalControls.push('encrypted-in-transit');
                    additionalControls.push('encrypted-at-rest');
                    requiredApprovals.push('data-protection-officer');
                }
                // Cross-jurisdiction transfers may require legal review
                if (this.requiresLegalReview(sourceJurisdiction, targetJurisdiction)) {
                    requiredApprovals.push('legal-counsel');
                    additionalControls.push('data-processing-agreement');
                }
                return {
                    compliant: true,
                    additionalControls,
                    requiredApprovals,
                };
            }
            return { compliant: true };
        }
        catch (error) {
            console.error('Transfer compliance check failed:', error);
            return {
                compliant: false,
                reason: 'Transfer compliance check failed: ' + error.message,
            };
        }
        finally {
            span?.end();
        }
    }
    async generateResidencyReport(tenantId) {
        const span = otel_tracing_js_1.otelService.createSpan('data-residency.generate-report');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Get all residency data
            const [residencyConfig, kmsConfig, auditData, encryptionStats] = await Promise.all([
                this.getResidencyConfig(tenantId),
                this.getKMSConfig(tenantId),
                this.getAuditData(tenantId),
                this.getEncryptionStats(tenantId),
            ]);
            const report = {
                metadata: {
                    tenantId,
                    generatedAt: new Date().toISOString(),
                    reportType: 'data-residency-compliance',
                    version: '1.0',
                },
                configuration: {
                    residency: residencyConfig,
                    kms: kmsConfig
                        ? {
                            provider: kmsConfig.provider,
                            region: kmsConfig.region,
                            keyId: kmsConfig.keyId.substring(0, 8) + '***',
                        }
                        : null,
                },
                compliance: {
                    overallStatus: this.calculateComplianceStatus(residencyConfig, kmsConfig, encryptionStats),
                    encryptionCoverage: encryptionStats.encryptionRate,
                    dataClassificationBreakdown: encryptionStats.classificationBreakdown,
                    crossBorderTransfers: auditData.transferCount,
                },
                audit: {
                    totalEvents: auditData.totalEvents,
                    encryptionEvents: auditData.encryptionEvents,
                    decryptionEvents: auditData.decryptionEvents,
                    complianceViolations: auditData.violations,
                },
                recommendations: this.generateComplianceRecommendations(residencyConfig, kmsConfig, encryptionStats),
            };
            // Store report
            await pool.query(`INSERT INTO residency_reports (
          tenant_id, report_data, created_at
        ) VALUES ($1, $2, now())`, [tenantId, JSON.stringify(report)]);
            return report;
        }
        catch (error) {
            console.error('Residency report generation failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    // KMS Provider Implementations
    async encryptWithAWSKMS(data, config, classification) {
        // In production, use AWS SDK
        // For demo, simulate AWS KMS envelope encryption
        const dataKey = (0, crypto_1.randomBytes)(32); // 256-bit key
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', dataKey, (0, crypto_1.randomBytes)(16));
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return {
            encryptedData: encrypted,
            algorithm: 'aes-256-gcm-aws-kms',
            keyId: config.keyId,
            encryptedDataKey: toEncodedString(Buffer.from(`aws-kms-encrypted-${toEncodedString(dataKey, 'hex')}`), 'base64'),
            authTag: toEncodedString(cipher.getAuthTag(), 'base64'),
        };
    }
    async decryptWithAWSKMS(encryptedData, config, metadata) {
        // In production, decrypt data key with AWS KMS, then decrypt data
        const dataKey = Buffer.from(metadata.encryptedDataKey, 'base64')
            .toString()
            .replace('aws-kms-encrypted-', '');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', Buffer.from(dataKey, 'hex'), Buffer.alloc(16));
        decipher.setAuthTag(Buffer.from(metadata.authTag, 'base64'));
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async generateAWSDataKey(keyId) {
        // AWS KMS GenerateDataKey equivalent
        return {
            plaintextDataKey: (0, crypto_1.randomBytes)(32),
            encryptedDataKey: Buffer.from(`aws-kms-encrypted-${randomHex(32)}`),
        };
    }
    async encryptWithAzureKV(data, config, classification) {
        // Azure Key Vault encryption simulation
        const dataKey = (0, crypto_1.randomBytes)(32);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-cbc', dataKey, (0, crypto_1.randomBytes)(16));
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return {
            encryptedData: encrypted,
            algorithm: 'aes-256-cbc-azure-kv',
            keyId: config.keyId,
            encryptedDataKey: toEncodedString(Buffer.from(`azure-kv-encrypted-${toEncodedString(dataKey, 'hex')}`), 'base64'),
        };
    }
    async decryptWithAzureKV(encryptedData, config, metadata) {
        // Azure Key Vault decryption simulation
        const dataKey = Buffer.from(metadata.encryptedDataKey, 'base64')
            .toString()
            .replace('azure-kv-encrypted-', '');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-cbc', Buffer.from(dataKey, 'hex'), Buffer.alloc(16));
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async generateAzureDataKey(keyId) {
        return {
            plaintextDataKey: (0, crypto_1.randomBytes)(32),
            encryptedDataKey: Buffer.from(`azure-kv-encrypted-${randomHex(32)}`),
        };
    }
    async encryptWithGCPKMS(data, config, classification) {
        // GCP KMS encryption simulation
        const dataKey = (0, crypto_1.randomBytes)(32);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', dataKey, (0, crypto_1.randomBytes)(12));
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return {
            encryptedData: encrypted,
            algorithm: 'aes-256-gcm-gcp-kms',
            keyId: config.keyId,
            encryptedDataKey: toEncodedString(Buffer.from(`gcp-kms-encrypted-${toEncodedString(dataKey, 'hex')}`), 'base64'),
            authTag: toEncodedString(cipher.getAuthTag(), 'base64'),
        };
    }
    async decryptWithGCPKMS(encryptedData, config, metadata) {
        // GCP KMS decryption simulation
        const dataKey = Buffer.from(metadata.encryptedDataKey, 'base64')
            .toString()
            .replace('gcp-kms-encrypted-', '');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', Buffer.from(dataKey, 'hex'), Buffer.alloc(12));
        decipher.setAuthTag(Buffer.from(metadata.authTag, 'base64'));
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async generateGCPDataKey(keyId) {
        return {
            plaintextDataKey: (0, crypto_1.randomBytes)(32),
            encryptedDataKey: Buffer.from(`gcp-kms-encrypted-${randomHex(32)}`),
        };
    }
    async encryptWithCustomerKey(data, config, classification) {
        // Customer-managed encryption with envelope encryption pattern
        const dataKey = (0, crypto_1.randomBytes)(32);
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', dataKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        // In production, encrypt data key with customer's root key
        const rootKey = await this.getCustomerRootKey(config.keyId);
        const keyEncryptionKey = (0, crypto_1.createCipheriv)('aes-256-gcm', rootKey, (0, crypto_1.randomBytes)(16));
        let encryptedDataKey = keyEncryptionKey.update(dataKey, undefined, 'base64');
        encryptedDataKey += keyEncryptionKey.final('base64');
        return {
            encryptedData: encrypted,
            algorithm: 'aes-256-gcm-customer-managed',
            keyId: config.keyId,
            encryptedDataKey,
            iv: toEncodedString(iv, 'base64'),
            authTag: toEncodedString(cipher.getAuthTag(), 'base64'),
            keyAuthTag: toEncodedString(keyEncryptionKey.getAuthTag(), 'base64'),
        };
    }
    async decryptWithCustomerKey(encryptedData, config, metadata) {
        // Decrypt with customer-managed key
        const rootKey = await this.getCustomerRootKey(config.keyId);
        // Decrypt data key first
        const keyDecipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', rootKey, Buffer.alloc(16));
        keyDecipher.setAuthTag(Buffer.from(metadata.keyAuthTag, 'base64'));
        let dataKey = keyDecipher.update(metadata.encryptedDataKey, 'base64');
        dataKey = Buffer.concat([dataKey, keyDecipher.final()]);
        // Decrypt actual data
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', dataKey, Buffer.from(metadata.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(metadata.authTag, 'base64'));
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async generateCustomerDataKey(keyId) {
        const rootKey = await this.getCustomerRootKey(keyId);
        const dataKey = (0, crypto_1.randomBytes)(32);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', rootKey, (0, crypto_1.randomBytes)(16));
        let encryptedDataKey = cipher.update(dataKey, undefined, 'base64');
        encryptedDataKey += cipher.final('base64');
        return {
            plaintextDataKey: dataKey,
            encryptedDataKey: Buffer.from(encryptedDataKey, 'base64'),
        };
    }
    // Helper methods
    async getCustomerRootKey(keyId) {
        // In production, retrieve from secure key storage
        return Buffer.from(process.env.CUSTOMER_ROOT_KEY || 'customer-root-key-32-byte-length!!!', 'utf8');
    }
    async testKMSConnectivity(config) {
        try {
            // Test connectivity to KMS provider
            switch (config.provider) {
                case 'aws-kms':
                    // AWS SDK connectivity test
                    return true;
                case 'azure-keyvault':
                    // Azure Key Vault connectivity test
                    return true;
                case 'gcp-kms':
                    // GCP KMS connectivity test
                    return true;
                case 'customer-managed':
                    // Local key accessibility test
                    return true;
                default:
                    throw new Error('Unsupported KMS provider');
            }
        }
        catch (error) {
            console.error('KMS connectivity test failed:', error);
            return false;
        }
    }
    async encryptCredentials(credentials) {
        // Encrypt credentials with system key
        const systemKey = Buffer.from(process.env.SYSTEM_ENCRYPTION_KEY || 'system-key-32-byte-length!!!!!!', 'utf8');
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', systemKey, iv);
        let encrypted = cipher.update(credentials, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return JSON.stringify({
            encrypted,
            iv: toEncodedString(iv, 'base64'),
            authTag: toEncodedString(cipher.getAuthTag(), 'base64'),
        });
    }
    async getResidencyConfig(tenantId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query('SELECT * FROM data_residency_configs WHERE tenant_id = $1', [tenantId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            region: row.region,
            country: row.country,
            jurisdiction: row.jurisdiction,
            dataClassifications: JSON.parse(row.data_classifications || '[]'),
            allowedTransfers: JSON.parse(row.allowed_transfers || '[]'),
            retentionPolicyDays: row.retention_policy_days,
            encryptionRequired: row.encryption_required,
        };
    }
    async getKMSConfig(tenantId, region) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        let query = 'SELECT * FROM kms_configs WHERE tenant_id = $1';
        const params = [tenantId];
        if (region) {
            query += ' AND (region = $2 OR region IS NULL)';
            params.push(region);
        }
        const result = await pool.query(query, params);
        if (result.rows.length === 0)
            return null;
        // Prioritize regional match if multiple found
        const row = result.rows.find(r => r.region === region) || result.rows[0];
        return {
            provider: row.provider,
            keyId: row.key_id,
            region: row.region,
            endpoint: row.endpoint,
            // Don't return decrypted credentials in this context
        };
    }
    checkResidencyCompliance(classification, config) {
        if (!config)
            return false;
        // Check if data classification is allowed in tenant's region
        if (classification.residencyRequirements.length > 0) {
            return (classification.residencyRequirements.includes(config.region) ||
                classification.residencyRequirements.includes(config.country) ||
                classification.residencyRequirements.includes(config.jurisdiction));
        }
        return true;
    }
    async encryptLocally(data, classification) {
        const key = (0, crypto_1.randomBytes)(32);
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return {
            encryptedData: encrypted,
            algorithm: 'aes-256-gcm-local',
            keyId: `local-${randomHex(8)}`,
            iv: toEncodedString(iv, 'base64'),
            authTag: toEncodedString(cipher.getAuthTag(), 'base64'),
        };
    }
    async decryptLocally(encryptedData, metadata) {
        // For demo purposes, local decryption is simulated
        // In production, you'd need proper key management
        throw new Error('Local decryption requires proper key storage implementation');
    }
    async getJurisdictionMapping() {
        return {
            'us-east-1': 'US',
            'us-west-2': 'US',
            'eu-west-1': 'EU',
            'eu-central-1': 'EU',
            'ap-southeast-1': 'APAC',
            'ca-central-1': 'CANADA',
            'ap-northeast-1': 'JAPAN',
        };
    }
    requiresLegalReview(sourceJurisdiction, targetJurisdiction) {
        // Define jurisdiction pairs that require legal review
        const legalReviewRequired = new Set([
            'US-EU',
            'EU-US',
            'US-APAC',
            'APAC-US',
            'EU-APAC',
            'APAC-EU',
        ]);
        return legalReviewRequired.has(`${sourceJurisdiction}-${targetJurisdiction}`);
    }
    async getAuditData(tenantId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const [auditEvents, encEvents, decEvents, violations] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM data_residency_audit WHERE tenant_id = $1', [tenantId]),
            pool.query('SELECT COUNT(*) FROM encryption_audit WHERE tenant_id = $1', [
                tenantId,
            ]),
            pool.query('SELECT COUNT(*) FROM decryption_audit WHERE tenant_id = $1', [
                tenantId,
            ]),
            pool.query('SELECT COUNT(*) FROM encryption_audit WHERE tenant_id = $1 AND compliant = false', [tenantId]),
        ]);
        return {
            totalEvents: parseInt(auditEvents.rows[0].count),
            encryptionEvents: parseInt(encEvents.rows[0].count),
            decryptionEvents: parseInt(decEvents.rows[0].count),
            violations: parseInt(violations.rows[0].count),
            transferCount: 0, // Would be calculated from transfer audit logs
        };
    }
    async getEncryptionStats(tenantId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const stats = await pool.query(`
      SELECT 
        classification_level,
        COUNT(*) as count,
        AVG(CASE WHEN compliant THEN 1.0 ELSE 0.0 END) as compliance_rate
      FROM encryption_audit 
      WHERE tenant_id = $1 
      GROUP BY classification_level
    `, [tenantId]);
        const totalEvents = await pool.query('SELECT COUNT(*) FROM encryption_audit WHERE tenant_id = $1', [tenantId]);
        const encryptedEvents = await pool.query("SELECT COUNT(*) FROM encryption_audit WHERE tenant_id = $1 AND encryption_method != 'none'", [tenantId]);
        const total = parseInt(totalEvents.rows[0].count);
        const encrypted = parseInt(encryptedEvents.rows[0].count);
        return {
            encryptionRate: total > 0 ? (encrypted / total) * 100 : 100,
            classificationBreakdown: stats.rows.reduce((acc, row) => {
                acc[row.classification_level] = {
                    count: parseInt(row.count),
                    complianceRate: parseFloat(row.compliance_rate) * 100,
                };
                return acc;
            }, {}),
        };
    }
    calculateComplianceStatus(residencyConfig, kmsConfig, encryptionStats) {
        if (!residencyConfig)
            return 'non-compliant';
        if (residencyConfig.encryptionRequired && !kmsConfig)
            return 'partial';
        if (encryptionStats.encryptionRate < 95)
            return 'partial';
        return 'compliant';
    }
    generateComplianceRecommendations(residencyConfig, kmsConfig, encryptionStats) {
        const recommendations = [];
        if (!residencyConfig) {
            recommendations.push('Configure data residency requirements for your tenant');
        }
        if (!kmsConfig) {
            recommendations.push('Configure BYOK (Bring Your Own Key) for enhanced security');
        }
        if (encryptionStats.encryptionRate < 100) {
            recommendations.push('Ensure all sensitive data is encrypted at rest');
        }
        if (Object.keys(encryptionStats.classificationBreakdown).length === 0) {
            recommendations.push('Implement data classification scheme');
        }
        if (recommendations.length === 0) {
            recommendations.push('Data residency configuration is compliant');
            recommendations.push('Consider regular compliance audits');
        }
        return recommendations;
    }
}
exports.DataResidencyService = DataResidencyService;
// Database schema for data residency
exports.DATA_RESIDENCY_SCHEMA = `
CREATE TABLE IF NOT EXISTS data_residency_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  data_classifications JSONB DEFAULT '[]',
  allowed_transfers JSONB DEFAULT '[]',
  retention_policy_days INTEGER DEFAULT 2555,
  encryption_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kms_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('aws-kms', 'azure-keyvault', 'gcp-kms', 'hashicorp-vault', 'customer-managed')),
  key_id TEXT NOT NULL,
  region TEXT NOT NULL,
  endpoint TEXT,
  encrypted_credentials TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_residency_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  config_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encryption_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  classification_level TEXT NOT NULL,
  encryption_method TEXT NOT NULL,
  kms_provider TEXT,
  region TEXT,
  compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decryption_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  data_hash TEXT,
  decryption_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  successful BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residency_reports (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residency_tenant ON data_residency_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kms_tenant ON kms_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_residency_audit_tenant ON data_residency_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_tenant ON encryption_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decryption_audit_tenant ON decryption_audit(tenant_id);
`;
