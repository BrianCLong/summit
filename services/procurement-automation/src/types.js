"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SBOMReferenceSchema = exports.ATOPackageSchema = exports.ComplianceFormTemplateSchema = exports.FormFieldSchema = exports.ComplianceControlSchema = exports.ProcurementRequestSchema = exports.ATODocumentTypeSchema = exports.ATOStatusSchema = exports.ProcurementFrameworkSchema = void 0;
const zod_1 = require("zod");
// Government Procurement Frameworks
exports.ProcurementFrameworkSchema = zod_1.z.enum([
    'FedRAMP',
    'FedRAMP_High',
    'FedRAMP_Moderate',
    'FedRAMP_Low',
    'StateRAMP',
    'IL2',
    'IL4',
    'IL5',
    'IL6',
    'FISMA',
    'CMMC_L1',
    'CMMC_L2',
    'CMMC_L3',
    'NIST_800_53',
    'NIST_800_171',
    'CJIS',
    'ITAR',
    'SOC2',
    'HIPAA',
]);
// ATO Status
exports.ATOStatusSchema = zod_1.z.enum([
    'not_started',
    'in_progress',
    'pending_review',
    'conditional',
    'granted',
    'denied',
    'expired',
    'revoked',
]);
// Document Types for ATO
exports.ATODocumentTypeSchema = zod_1.z.enum([
    'SSP', // System Security Plan
    'SAR', // Security Assessment Report
    'POA_M', // Plan of Action and Milestones
    'ATO_LETTER', // Authorization to Operate Letter
    'CONMON_REPORT', // Continuous Monitoring Report
    'INCIDENT_RESPONSE_PLAN',
    'CONFIGURATION_MGMT_PLAN',
    'CONTINGENCY_PLAN',
    'PIA', // Privacy Impact Assessment
    'PTA', // Privacy Threshold Analysis
    'SBOM', // Software Bill of Materials
    'VULNERABILITY_SCAN',
    'PENETRATION_TEST',
    'FIPS_VALIDATION',
    'SUPPLY_CHAIN_RISK',
]);
// Procurement Request
exports.ProcurementRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    requestor: zod_1.z.object({
        name: zod_1.z.string(),
        email: zod_1.z.string().email(),
        organization: zod_1.z.string(),
        role: zod_1.z.string(),
    }),
    targetFrameworks: zod_1.z.array(exports.ProcurementFrameworkSchema),
    dataClassification: zod_1.z.enum(['public', 'cui', 'secret', 'top_secret']),
    systemBoundary: zod_1.z.object({
        components: zod_1.z.array(zod_1.z.string()),
        dataFlows: zod_1.z.array(zod_1.z.string()),
        externalInterfaces: zod_1.z.array(zod_1.z.string()),
    }),
    timeline: zod_1.z.object({
        submittedAt: zod_1.z.date(),
        targetAtoDate: zod_1.z.date().optional(),
        urgency: zod_1.z.enum(['standard', 'expedited', 'emergency']),
    }),
    status: exports.ATOStatusSchema,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Compliance Control
exports.ComplianceControlSchema = zod_1.z.object({
    id: zod_1.z.string(),
    family: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    framework: exports.ProcurementFrameworkSchema,
    priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3']),
    status: zod_1.z.enum(['not_started', 'in_progress', 'implemented', 'assessed', 'inherited']),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        url: zod_1.z.string().optional(),
        description: zod_1.z.string(),
        collectedAt: zod_1.z.date(),
    })),
    responsibleParty: zod_1.z.string(),
    implementationNarrative: zod_1.z.string().optional(),
});
// Form Field Definition
exports.FormFieldSchema = zod_1.z.object({
    id: zod_1.z.string(),
    label: zod_1.z.string(),
    type: zod_1.z.enum(['text', 'textarea', 'select', 'multiselect', 'date', 'file', 'checkbox']),
    required: zod_1.z.boolean(),
    options: zod_1.z.array(zod_1.z.string()).optional(),
    defaultValue: zod_1.z.unknown().optional(),
    autoFillSource: zod_1.z.string().optional(), // Reference to data source for auto-fill
    validation: zod_1.z.object({
        pattern: zod_1.z.string().optional(),
        minLength: zod_1.z.number().optional(),
        maxLength: zod_1.z.number().optional(),
    }).optional(),
});
// Compliance Form Template
exports.ComplianceFormTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    framework: exports.ProcurementFrameworkSchema,
    documentType: exports.ATODocumentTypeSchema,
    version: zod_1.z.string(),
    sections: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        fields: zod_1.z.array(exports.FormFieldSchema),
    })),
});
// ATO Package
exports.ATOPackageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    procurementRequestId: zod_1.z.string().uuid(),
    framework: exports.ProcurementFrameworkSchema,
    status: exports.ATOStatusSchema,
    documents: zod_1.z.array(zod_1.z.object({
        type: exports.ATODocumentTypeSchema,
        name: zod_1.z.string(),
        version: zod_1.z.string(),
        status: zod_1.z.enum(['draft', 'review', 'approved', 'rejected']),
        url: zod_1.z.string().optional(),
        generatedAt: zod_1.z.date().optional(),
        approvedBy: zod_1.z.string().optional(),
        approvedAt: zod_1.z.date().optional(),
    })),
    controls: zod_1.z.array(exports.ComplianceControlSchema),
    riskScore: zod_1.z.number().min(0).max(100),
    completionPercentage: zod_1.z.number().min(0).max(100),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// SBOM Reference
exports.SBOMReferenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    format: zod_1.z.enum(['spdx-json', 'spdx-yaml', 'cyclonedx-json', 'cyclonedx-xml']),
    version: zod_1.z.string(),
    generatedAt: zod_1.z.date(),
    components: zod_1.z.number(),
    vulnerabilities: zod_1.z.object({
        critical: zod_1.z.number(),
        high: zod_1.z.number(),
        medium: zod_1.z.number(),
        low: zod_1.z.number(),
    }),
    licenses: zod_1.z.array(zod_1.z.string()),
    attestationUrl: zod_1.z.string().optional(),
});
