import { z } from 'zod';

// Government Procurement Frameworks
export const ProcurementFrameworkSchema = z.enum([
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
export type ProcurementFramework = z.infer<typeof ProcurementFrameworkSchema>;

// ATO Status
export const ATOStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'pending_review',
  'conditional',
  'granted',
  'denied',
  'expired',
  'revoked',
]);
export type ATOStatus = z.infer<typeof ATOStatusSchema>;

// Document Types for ATO
export const ATODocumentTypeSchema = z.enum([
  'SSP',                    // System Security Plan
  'SAR',                    // Security Assessment Report
  'POA_M',                  // Plan of Action and Milestones
  'ATO_LETTER',             // Authorization to Operate Letter
  'CONMON_REPORT',          // Continuous Monitoring Report
  'INCIDENT_RESPONSE_PLAN',
  'CONFIGURATION_MGMT_PLAN',
  'CONTINGENCY_PLAN',
  'PIA',                    // Privacy Impact Assessment
  'PTA',                    // Privacy Threshold Analysis
  'SBOM',                   // Software Bill of Materials
  'VULNERABILITY_SCAN',
  'PENETRATION_TEST',
  'FIPS_VALIDATION',
  'SUPPLY_CHAIN_RISK',
]);
export type ATODocumentType = z.infer<typeof ATODocumentTypeSchema>;

// Procurement Request
export const ProcurementRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  requestor: z.object({
    name: z.string(),
    email: z.string().email(),
    organization: z.string(),
    role: z.string(),
  }),
  targetFrameworks: z.array(ProcurementFrameworkSchema),
  dataClassification: z.enum(['public', 'cui', 'secret', 'top_secret']),
  systemBoundary: z.object({
    components: z.array(z.string()),
    dataFlows: z.array(z.string()),
    externalInterfaces: z.array(z.string()),
  }),
  timeline: z.object({
    submittedAt: z.date(),
    targetAtoDate: z.date().optional(),
    urgency: z.enum(['standard', 'expedited', 'emergency']),
  }),
  status: ATOStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ProcurementRequest = z.infer<typeof ProcurementRequestSchema>;

// Compliance Control
export const ComplianceControlSchema = z.object({
  id: z.string(),
  family: z.string(),
  title: z.string(),
  description: z.string(),
  framework: ProcurementFrameworkSchema,
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  status: z.enum(['not_started', 'in_progress', 'implemented', 'assessed', 'inherited']),
  evidence: z.array(z.object({
    type: z.string(),
    url: z.string().optional(),
    description: z.string(),
    collectedAt: z.date(),
  })),
  responsibleParty: z.string(),
  implementationNarrative: z.string().optional(),
});
export type ComplianceControl = z.infer<typeof ComplianceControlSchema>;

// Form Field Definition
export const FormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'select', 'multiselect', 'date', 'file', 'checkbox']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
  autoFillSource: z.string().optional(), // Reference to data source for auto-fill
  validation: z.object({
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }).optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

// Compliance Form Template
export const ComplianceFormTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  framework: ProcurementFrameworkSchema,
  documentType: ATODocumentTypeSchema,
  version: z.string(),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    fields: z.array(FormFieldSchema),
  })),
});
export type ComplianceFormTemplate = z.infer<typeof ComplianceFormTemplateSchema>;

// ATO Package
export const ATOPackageSchema = z.object({
  id: z.string().uuid(),
  procurementRequestId: z.string().uuid(),
  framework: ProcurementFrameworkSchema,
  status: ATOStatusSchema,
  documents: z.array(z.object({
    type: ATODocumentTypeSchema,
    name: z.string(),
    version: z.string(),
    status: z.enum(['draft', 'review', 'approved', 'rejected']),
    url: z.string().optional(),
    generatedAt: z.date().optional(),
    approvedBy: z.string().optional(),
    approvedAt: z.date().optional(),
  })),
  controls: z.array(ComplianceControlSchema),
  riskScore: z.number().min(0).max(100),
  completionPercentage: z.number().min(0).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ATOPackage = z.infer<typeof ATOPackageSchema>;

// SBOM Reference
export const SBOMReferenceSchema = z.object({
  id: z.string(),
  format: z.enum(['spdx-json', 'spdx-yaml', 'cyclonedx-json', 'cyclonedx-xml']),
  version: z.string(),
  generatedAt: z.date(),
  components: z.number(),
  vulnerabilities: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  licenses: z.array(z.string()),
  attestationUrl: z.string().optional(),
});
export type SBOMReference = z.infer<typeof SBOMReferenceSchema>;
