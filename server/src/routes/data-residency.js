"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataResidencyRouter = void 0;
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const residency_service_js_1 = require("../data-residency/residency-service.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const router = express_1.default.Router();
exports.dataResidencyRouter = router;
const dataResidencyService = new residency_service_js_1.DataResidencyService();
// Validation schemas
const ResidencyConfigSchema = zod_1.z.object({
    region: zod_1.z.string().min(1),
    country: zod_1.z.string().min(2).max(3),
    jurisdiction: zod_1.z.string().min(1),
    dataClassifications: zod_1.z.array(zod_1.z.string()).default([]),
    allowedTransfers: zod_1.z.array(zod_1.z.string()).default([]),
    retentionPolicyDays: zod_1.z.number().min(1).max(36500).default(2555),
    encryptionRequired: zod_1.z.boolean().default(true),
});
const KMSConfigSchema = zod_1.z.object({
    provider: zod_1.z.enum([
        'aws-kms',
        'azure-keyvault',
        'gcp-kms',
        'hashicorp-vault',
        'customer-managed',
    ]),
    keyId: zod_1.z.string().min(1),
    region: zod_1.z.string().min(1),
    endpoint: zod_1.z.string().url().optional(),
    credentials: zod_1.z
        .object({
        accessKey: zod_1.z.string().optional(),
        secretKey: zod_1.z.string().optional(),
        token: zod_1.z.string().optional(),
    })
        .optional(),
});
const EncryptDataSchema = zod_1.z.object({
    data: zod_1.z.string().min(1),
    dataClassification: zod_1.z.object({
        level: zod_1.z.enum([
            'public',
            'internal',
            'confidential',
            'restricted',
            'top-secret',
        ]),
        categories: zod_1.z.array(zod_1.z.string()).default([]),
        residencyRequirements: zod_1.z.array(zod_1.z.string()).default([]),
        encryptionRequired: zod_1.z.boolean().default(true),
        auditRequired: zod_1.z.boolean().default(true),
    }),
});
const DecryptDataSchema = zod_1.z.object({
    encryptedData: zod_1.z.string().min(1),
    encryptionMetadata: zod_1.z.object({}).passthrough(),
});
const TransferComplianceSchema = zod_1.z.object({
    sourceRegion: zod_1.z.string().min(1),
    targetRegion: zod_1.z.string().min(1),
    dataClassification: zod_1.z.object({
        level: zod_1.z.enum([
            'public',
            'internal',
            'confidential',
            'restricted',
            'top-secret',
        ]),
        categories: zod_1.z.array(zod_1.z.string()).default([]),
        residencyRequirements: zod_1.z.array(zod_1.z.string()).default([]),
        encryptionRequired: zod_1.z.boolean().default(true),
        auditRequired: zod_1.z.boolean().default(true),
    }),
});
/**
 * POST /api/data-residency/configure-residency
 * Configure data residency requirements for a tenant
 */
router.post('/configure-residency', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.configure-residency');
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const validatedConfig = ResidencyConfigSchema.parse(req.body);
        const configId = await dataResidencyService.configureDataResidency(tenantId, validatedConfig);
        res.json({
            success: true,
            configId,
            message: 'Data residency configuration updated successfully',
            configuration: validatedConfig,
        });
        otel_tracing_js_1.otelService.addSpanAttributes({
            'data-residency.tenant_id': tenantId,
            'data-residency.region': validatedConfig.region,
            'data-residency.country': validatedConfig.country,
            'data-residency.encryption_required': validatedConfig.encryptionRequired,
        });
    }
    catch (error) {
        console.error('Data residency configuration failed:', error);
        otel_tracing_js_1.otelService.recordException(error);
        if (error.name === 'ZodError') {
            res.status(400).json({
                error: 'Invalid configuration data',
                details: error.errors,
                example: {
                    region: 'us-east-1',
                    country: 'US',
                    jurisdiction: 'United States',
                    dataClassifications: ['confidential', 'restricted'],
                    allowedTransfers: ['us-west-2', 'ca-central-1'],
                    retentionPolicyDays: 2555,
                    encryptionRequired: true,
                },
            });
        }
        else {
            res.status(500).json({
                error: 'Configuration failed',
                message: error.message,
            });
        }
    }
    finally {
        span?.end();
    }
});
/**
 * POST /api/data-residency/configure-kms
 * Configure BYOK (Bring Your Own Key) for customer-managed encryption
 */
router.post('/configure-kms', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.configure-kms');
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const validatedConfig = KMSConfigSchema.parse(req.body);
        const kmsConfigId = await dataResidencyService.configureKMS(tenantId, validatedConfig);
        res.json({
            success: true,
            kmsConfigId,
            message: 'KMS configuration updated successfully',
            configuration: {
                provider: validatedConfig.provider,
                region: validatedConfig.region,
                keyId: validatedConfig.keyId.substring(0, 8) + '***', // Masked for security
            },
        });
        otel_tracing_js_1.otelService.addSpanAttributes({
            'data-residency.tenant_id': tenantId,
            'data-residency.kms_provider': validatedConfig.provider,
            'data-residency.kms_region': validatedConfig.region,
        });
    }
    catch (error) {
        console.error('KMS configuration failed:', error);
        otel_tracing_js_1.otelService.recordException(error);
        if (error.name === 'ZodError') {
            res.status(400).json({
                error: 'Invalid KMS configuration',
                details: error.errors,
                supportedProviders: [
                    'aws-kms',
                    'azure-keyvault',
                    'gcp-kms',
                    'hashicorp-vault',
                    'customer-managed',
                ],
                example: {
                    provider: 'aws-kms',
                    keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
                    region: 'us-east-1',
                    credentials: {
                        accessKey: 'AKIAIOSFODNN7EXAMPLE',
                        secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                    },
                },
            });
        }
        else {
            res.status(500).json({
                error: 'KMS configuration failed',
                message: error.message,
            });
        }
    }
    finally {
        span?.end();
    }
});
/**
 * POST /api/data-residency/encrypt
 * Encrypt data using configured KMS and residency policies
 */
router.post('/encrypt', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.encrypt-data');
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const validatedRequest = EncryptDataSchema.parse(req.body);
        const result = await dataResidencyService.encryptData(tenantId, validatedRequest.data, validatedRequest.dataClassification);
        res.json({
            success: true,
            encryptedData: result.encryptedData,
            encryptionMetadata: result.encryptionMetadata,
            residencyCompliant: result.residencyCompliant,
            dataClassification: validatedRequest.dataClassification.level,
        });
        otel_tracing_js_1.otelService.addSpanAttributes({
            'data-residency.tenant_id': tenantId,
            'data-residency.classification': validatedRequest.dataClassification.level,
            'data-residency.compliant': result.residencyCompliant,
            'data-residency.encrypted': true,
        });
    }
    catch (error) {
        console.error('Data encryption failed:', error);
        otel_tracing_js_1.otelService.recordException(error);
        if (error.name === 'ZodError') {
            res.status(400).json({
                error: 'Invalid encryption request',
                details: error.errors,
                example: {
                    data: 'Sensitive customer information',
                    dataClassification: {
                        level: 'confidential',
                        categories: ['customer-data', 'financial'],
                        residencyRequirements: ['us-east-1', 'US'],
                        encryptionRequired: true,
                        auditRequired: true,
                    },
                },
            });
        }
        else {
            res.status(500).json({
                error: 'Encryption failed',
                message: error.message,
            });
        }
    }
    finally {
        span?.end();
    }
});
/**
 * POST /api/data-residency/decrypt
 * Decrypt data using configured KMS
 */
router.post('/decrypt', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.decrypt-data');
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const validatedRequest = DecryptDataSchema.parse(req.body);
        const decryptedData = await dataResidencyService.decryptData(tenantId, validatedRequest.encryptedData, validatedRequest.encryptionMetadata);
        res.json({
            success: true,
            data: decryptedData,
            decryptedAt: new Date().toISOString(),
        });
        otel_tracing_js_1.otelService.addSpanAttributes({
            'data-residency.tenant_id': tenantId,
            'data-residency.decryption_successful': true,
        });
    }
    catch (error) {
        console.error('Data decryption failed:', error);
        otel_tracing_js_1.otelService.recordException(error);
        if (error.name === 'ZodError') {
            res.status(400).json({
                error: 'Invalid decryption request',
                details: error.errors,
            });
        }
        else {
            res.status(500).json({
                error: 'Decryption failed',
                message: error.message,
            });
        }
    }
    finally {
        span?.end();
    }
});
/**
 * POST /api/data-residency/check-transfer-compliance
 * Check compliance for cross-region data transfers
 */
router.post('/check-transfer-compliance', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.check-transfer-compliance');
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const validatedRequest = TransferComplianceSchema.parse(req.body);
        const complianceResult = await dataResidencyService.checkDataTransferCompliance(tenantId, validatedRequest.sourceRegion, validatedRequest.targetRegion, validatedRequest.dataClassification);
        res.json({
            compliance: complianceResult,
            sourceRegion: validatedRequest.sourceRegion,
            targetRegion: validatedRequest.targetRegion,
            dataClassification: validatedRequest.dataClassification.level,
            checkedAt: new Date().toISOString(),
        });
        otel_tracing_js_1.otelService.addSpanAttributes({
            'data-residency.tenant_id': tenantId,
            'data-residency.source_region': validatedRequest.sourceRegion,
            'data-residency.target_region': validatedRequest.targetRegion,
            'data-residency.transfer_compliant': complianceResult.compliant,
        });
    }
    catch (error) {
        console.error('Transfer compliance check failed:', error);
        otel_tracing_js_1.otelService.recordException(error);
        if (error.name === 'ZodError') {
            res.status(400).json({
                error: 'Invalid compliance check request',
                details: error.errors,
                example: {
                    sourceRegion: 'us-east-1',
                    targetRegion: 'eu-west-1',
                    dataClassification: {
                        level: 'confidential',
                        categories: ['customer-data'],
                        residencyRequirements: ['US'],
                        encryptionRequired: true,
                        auditRequired: true,
                    },
                },
            });
        }
        else {
            res.status(500).json({
                error: 'Compliance check failed',
                message: error.message,
            });
        }
    }
    finally {
        span?.end();
    }
});
/**
 * GET /api/data-residency/report
 * Generate comprehensive data residency compliance report
 */
router.get('/report', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.generate-report');
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const report = await dataResidencyService.generateResidencyReport(tenantId);
        res.json(report);
        otel_tracing_js_1.otelService.addSpanAttributes({
            'data-residency.tenant_id': tenantId,
            'data-residency.compliance_status': report.compliance?.overallStatus || 'unknown',
            'data-residency.encryption_coverage': report.compliance?.encryptionCoverage || 0,
        });
    }
    catch (error) {
        console.error('Report generation failed:', error);
        otel_tracing_js_1.otelService.recordException(error);
        res.status(500).json({
            error: 'Report generation failed',
            message: error.message,
        });
    }
    finally {
        span?.end();
    }
});
/**
 * GET /api/data-residency/health
 * Data residency service health check
 */
router.get('/health', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.health');
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                residencyConfig: 'operational',
                kmsIntegration: 'operational',
                encryption: 'operational',
                auditTrail: 'operational',
            },
            supportedProviders: [
                'aws-kms',
                'azure-keyvault',
                'gcp-kms',
                'hashicorp-vault',
                'customer-managed',
            ],
            supportedRegions: [
                'us-east-1',
                'us-west-2',
                'eu-west-1',
                'eu-central-1',
                'ap-southeast-1',
            ],
            version: '1.0.0',
        };
        res.json(health);
    }
    catch (error) {
        console.error('Data residency health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
    finally {
        span?.end();
    }
});
/**
 * GET /api/data-residency/supported-regions
 * Get list of supported regions and their compliance characteristics
 */
router.get('/supported-regions', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.supported-regions');
    try {
        const regions = {
            'us-east-1': {
                name: 'US East (N. Virginia)',
                country: 'US',
                jurisdiction: 'United States',
                dataLaws: ['CCPA', 'HIPAA', 'SOX'],
                kmsProviders: ['aws-kms', 'customer-managed'],
                encryptionRequired: false,
            },
            'us-west-2': {
                name: 'US West (Oregon)',
                country: 'US',
                jurisdiction: 'United States',
                dataLaws: ['CCPA', 'HIPAA', 'SOX'],
                kmsProviders: ['aws-kms', 'customer-managed'],
                encryptionRequired: false,
            },
            'eu-west-1': {
                name: 'Europe (Ireland)',
                country: 'IE',
                jurisdiction: 'European Union',
                dataLaws: ['GDPR'],
                kmsProviders: ['aws-kms', 'customer-managed'],
                encryptionRequired: true,
            },
            'eu-central-1': {
                name: 'Europe (Frankfurt)',
                country: 'DE',
                jurisdiction: 'European Union',
                dataLaws: ['GDPR', 'BDSG'],
                kmsProviders: ['aws-kms', 'customer-managed'],
                encryptionRequired: true,
            },
            'ap-southeast-1': {
                name: 'Asia Pacific (Singapore)',
                country: 'SG',
                jurisdiction: 'Singapore',
                dataLaws: ['PDPA'],
                kmsProviders: ['aws-kms', 'customer-managed'],
                encryptionRequired: false,
            },
            'ca-central-1': {
                name: 'Canada (Central)',
                country: 'CA',
                jurisdiction: 'Canada',
                dataLaws: ['PIPEDA'],
                kmsProviders: ['aws-kms', 'customer-managed'],
                encryptionRequired: false,
            },
        };
        res.json({
            regions,
            totalRegions: Object.keys(regions).length,
            jurisdictions: [
                ...new Set(Object.values(regions).map((r) => r.jurisdiction)),
            ],
            supportedLaws: [
                ...new Set(Object.values(regions).flatMap((r) => r.dataLaws)),
            ],
        });
    }
    catch (error) {
        console.error('Supported regions query failed:', error);
        res.status(500).json({
            error: 'Regions query failed',
            message: error.message,
        });
    }
    finally {
        span?.end();
    }
});
/**
 * GET /api/data-residency/data-classifications
 * Get supported data classification levels and their requirements
 */
router.get('/data-classifications', async (req, res) => {
    const span = otel_tracing_js_1.otelService.createSpan('data-residency.data-classifications');
    try {
        const classifications = {
            public: {
                description: 'Information that can be freely shared',
                encryptionRequired: false,
                auditRequired: false,
                residencyRestrictions: [],
                retentionPolicy: 'indefinite',
            },
            internal: {
                description: 'Information for internal use only',
                encryptionRequired: false,
                auditRequired: true,
                residencyRestrictions: [],
                retentionPolicy: '7 years',
            },
            confidential: {
                description: 'Sensitive business information',
                encryptionRequired: true,
                auditRequired: true,
                residencyRestrictions: ['same-jurisdiction'],
                retentionPolicy: '7 years',
            },
            restricted: {
                description: 'Highly sensitive information with access controls',
                encryptionRequired: true,
                auditRequired: true,
                residencyRestrictions: ['same-country'],
                retentionPolicy: '10 years',
            },
            'top-secret': {
                description: 'Maximum security classification',
                encryptionRequired: true,
                auditRequired: true,
                residencyRestrictions: ['no-transfer'],
                retentionPolicy: '25 years',
            },
        };
        res.json({
            classifications,
            defaultClassification: 'internal',
            encryptionAlgorithms: ['aes-256-gcm', 'aes-256-cbc'],
            keyManagement: [
                'aws-kms',
                'azure-keyvault',
                'gcp-kms',
                'customer-managed',
            ],
        });
    }
    catch (error) {
        console.error('Data classifications query failed:', error);
        res.status(500).json({
            error: 'Classifications query failed',
            message: error.message,
        });
    }
    finally {
        span?.end();
    }
});
