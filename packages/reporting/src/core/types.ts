/**
 * Core types for the reporting and intelligence products platform
 */

import { z } from 'zod';

// Report classification and security
export const ClassificationLevelSchema = z.enum([
  'UNCLASSIFIED',
  'CUI',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'TOP_SECRET_SCI'
]);

export type ClassificationLevel = z.infer<typeof ClassificationLevelSchema>;

export const ClassificationMarkingSchema = z.object({
  level: ClassificationLevelSchema,
  caveats: z.array(z.string()).optional(),
  sciControls: z.array(z.string()).optional(),
  disseminationControls: z.array(z.string()).optional(),
  releasability: z.array(z.string()).optional(),
  derivedFrom: z.string().optional(),
  declassifyOn: z.string().optional(),
  downgradeOn: z.string().optional()
});

export type ClassificationMarking = z.infer<typeof ClassificationMarkingSchema>;

// Report formats
export const ReportFormatSchema = z.enum([
  'PDF',
  'DOCX',
  'PPTX',
  'HTML',
  'XLSX',
  'CSV',
  'JSON',
  'XML',
  'MARKDOWN'
]);

export type ReportFormat = z.infer<typeof ReportFormatSchema>;

// Intelligence product types
export const IntelProductTypeSchema = z.enum([
  'SITUATIONAL_AWARENESS',
  'THREAT_ASSESSMENT',
  'STRATEGIC_INTELLIGENCE',
  'TACTICAL_INTELLIGENCE',
  'INDICATIONS_WARNINGS',
  'TREND_ANALYSIS',
  'PROFILE_DOSSIER',
  'NETWORK_ANALYSIS',
  'GEOSPATIAL_INTELLIGENCE',
  'OSINT_REPORT',
  'BRIEFING',
  'EXECUTIVE_SUMMARY',
  'TECHNICAL_REPORT',
  'CUSTOM'
]);

export type IntelProductType = z.infer<typeof IntelProductTypeSchema>;

// Report status
export const ReportStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
  'REJECTED'
]);

export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// Confidence levels
export const ConfidenceLevelSchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CONFIRMED'
]);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

// Report sections
export const ReportSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number(),
  type: z.enum(['TEXT', 'CHART', 'TABLE', 'MAP', 'TIMELINE', 'NETWORK', 'CUSTOM']),
  data: z.any().optional(),
  metadata: z.record(z.any()).optional()
});

export type ReportSection = z.infer<typeof ReportSectionSchema>;

// Report template
export const ReportTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  productType: IntelProductTypeSchema,
  format: ReportFormatSchema,
  sections: z.array(ReportSectionSchema),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['STRING', 'NUMBER', 'DATE', 'BOOLEAN', 'ARRAY', 'OBJECT']),
    required: z.boolean().default(false),
    defaultValue: z.any().optional()
  })).optional(),
  styling: z.object({
    theme: z.string().optional(),
    colors: z.record(z.string()).optional(),
    fonts: z.record(z.string()).optional(),
    logo: z.string().optional(),
    headerFooter: z.boolean().default(true)
  }).optional(),
  classification: ClassificationMarkingSchema.optional(),
  version: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  tags: z.array(z.string()).optional()
});

export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;

// Report metadata
export const ReportMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  productType: IntelProductTypeSchema,
  classification: ClassificationMarkingSchema,
  status: ReportStatusSchema,
  author: z.string(),
  contributors: z.array(z.string()).optional(),
  organization: z.string().optional(),
  dateProduced: z.date(),
  datePublished: z.date().optional(),
  validUntil: z.date().optional(),
  sources: z.array(z.object({
    id: z.string(),
    name: z.string(),
    reliability: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).optional(),
    confidence: ConfidenceLevelSchema.optional()
  })).optional(),
  keywords: z.array(z.string()).optional(),
  relatedReports: z.array(z.string()).optional(),
  geographicFocus: z.array(z.string()).optional(),
  timePeriod: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional()
});

export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;

// Complete report structure
export const ReportSchema = z.object({
  metadata: ReportMetadataSchema,
  template: z.string(), // Template ID
  sections: z.array(ReportSectionSchema),
  executiveSummary: z.string().optional(),
  keyFindings: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    url: z.string().optional(),
    data: z.any().optional()
  })).optional(),
  version: z.number().default(1),
  revisionHistory: z.array(z.object({
    version: z.number(),
    date: z.date(),
    author: z.string(),
    changes: z.string()
  })).optional()
});

export type Report = z.infer<typeof ReportSchema>;

// Report generation request
export const ReportGenerationRequestSchema = z.object({
  templateId: z.string(),
  data: z.record(z.any()),
  format: ReportFormatSchema,
  metadata: ReportMetadataSchema.partial(),
  options: z.object({
    includeExecutiveSummary: z.boolean().default(true),
    includeKeyFindings: z.boolean().default(true),
    includeRecommendations: z.boolean().default(true),
    includeCharts: z.boolean().default(true),
    includeMaps: z.boolean().default(true),
    includeTimelines: z.boolean().default(true),
    language: z.string().default('en'),
    pageSize: z.enum(['A4', 'LETTER', 'LEGAL']).default('LETTER'),
    orientation: z.enum(['PORTRAIT', 'LANDSCAPE']).default('PORTRAIT')
  }).optional()
});

export type ReportGenerationRequest = z.infer<typeof ReportGenerationRequestSchema>;

// Dissemination tracking
export const DisseminationRecordSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  recipient: z.string(),
  method: z.enum(['EMAIL', 'PORTAL', 'SFTP', 'API', 'DOWNLOAD']),
  timestamp: z.date(),
  accessedAt: z.date().optional(),
  downloadedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  watermarked: z.boolean().default(false),
  trackingId: z.string().optional()
});

export type DisseminationRecord = z.infer<typeof DisseminationRecordSchema>;

// Report analytics
export const ReportAnalyticsSchema = z.object({
  reportId: z.string(),
  views: z.number().default(0),
  downloads: z.number().default(0),
  uniqueViewers: z.number().default(0),
  averageTimeSpent: z.number().optional(), // in seconds
  feedback: z.array(z.object({
    userId: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    timestamp: z.date()
  })).optional(),
  engagement: z.object({
    opened: z.number().default(0),
    sectionsViewed: z.record(z.number()).optional(),
    attachmentsOpened: z.record(z.number()).optional()
  }).optional()
});

export type ReportAnalytics = z.infer<typeof ReportAnalyticsSchema>;
