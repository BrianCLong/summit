/**
 * Compliance and Risk Type Definitions
 */

import { z } from 'zod';
import { RiskLevelSchema } from './document.js';

// Compliance Standard Schema
export const ComplianceStandardSchema = z.object({
  id: z.string(),
  name: z.string(),
  authority: z.string(),
  description: z.string(),
  categories: z.array(z.string()).default([]),
  applicable_document_types: z.array(z.string()).default([]),
});

export type ComplianceStandard = z.infer<typeof ComplianceStandardSchema>;

// Required Section Schema
export const RequiredSectionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  is_mandatory: z.boolean().default(true),
  compliance_standards: z.array(z.string()).default([]),
});

export type RequiredSection = z.infer<typeof RequiredSectionSchema>;

// Compliance Mapping Schema
export const ComplianceMappingSchema = z.object({
  document_type_id: z.string(),
  standards: z.array(z.string()),
  required_sections: z.array(RequiredSectionSchema),
  review_frequency: z.enum(['continuous', 'per_incident', 'per_release', 'monthly', 'quarterly', 'semi_annual', 'annual']),
});

export type ComplianceMapping = z.infer<typeof ComplianceMappingSchema>;

// Compliance Check Result Schema
export const ComplianceCheckResultSchema = z.object({
  document_id: z.string().uuid(),
  document_type_id: z.string(),
  checked_at: z.string().datetime(),
  overall_compliant: z.boolean(),
  applicable_standards: z.array(z.string()),
  section_results: z.array(z.object({
    section_name: z.string(),
    present: z.boolean(),
    compliant: z.boolean(),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
  })),
  missing_sections: z.array(z.string()),
  risk_issues: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    recommendation: z.string(),
    standard: z.string().optional(),
  })),
  score: z.number().min(0).max(100),
});

export type ComplianceCheckResult = z.infer<typeof ComplianceCheckResultSchema>;

// Risk Dimension Schema
export const RiskDimensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  weight: z.number().min(0).max(1),
  factors: z.array(z.string()),
});

export type RiskDimension = z.infer<typeof RiskDimensionSchema>;

// Risk Score Schema
export const RiskScoreSchema = z.object({
  document_id: z.string().uuid(),
  scored_at: z.string().datetime(),
  scored_by: z.string().optional(),
  dimension_scores: z.record(z.string(), z.number()),
  weighted_score: z.number().min(0).max(10),
  risk_level: RiskLevelSchema,
  modifiers_applied: z.array(z.object({
    name: z.string(),
    value: z.number(),
    reason: z.string(),
  })),
  factors: z.array(z.object({
    dimension: z.string(),
    factor: z.string(),
    score: z.number(),
    notes: z.string().optional(),
  })),
});

export type RiskScore = z.infer<typeof RiskScoreSchema>;

// Risk Assessment Request Schema
export const RiskAssessmentRequestSchema = z.object({
  document_id: z.string().uuid(),
  include_related_documents: z.boolean().default(false),
  dimension_overrides: z.record(z.string(), z.number()).optional(),
});

export type RiskAssessmentRequest = z.infer<typeof RiskAssessmentRequestSchema>;

// Risk Threshold Schema
export const RiskThresholdSchema = z.object({
  level: RiskLevelSchema,
  min: z.number(),
  max: z.number(),
  color: z.string(),
  description: z.string(),
  actions: z.array(z.string()),
});

export type RiskThreshold = z.infer<typeof RiskThresholdSchema>;

// Audit Finding Schema
export const AuditFindingSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  finding_type: z.enum(['compliance_gap', 'missing_section', 'outdated_content', 'missing_signature', 'risk_issue', 'policy_violation']),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  compliance_standard: z.string().optional(),
  found_at: z.string().datetime(),
  found_by: z.string(),
  status: z.enum(['open', 'acknowledged', 'in_progress', 'resolved', 'accepted_risk', 'false_positive']),
  resolved_at: z.string().datetime().optional(),
  resolved_by: z.string().optional(),
  resolution_notes: z.string().optional(),
});

export type AuditFinding = z.infer<typeof AuditFindingSchema>;

// Compliance Report Schema
export const ComplianceReportSchema = z.object({
  id: z.string().uuid(),
  generated_at: z.string().datetime(),
  generated_by: z.string(),
  report_type: z.enum(['full', 'summary', 'gap_analysis', 'risk_assessment']),
  scope: z.object({
    document_ids: z.array(z.string().uuid()).optional(),
    document_types: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    standards: z.array(z.string()).optional(),
  }),
  summary: z.object({
    total_documents: z.number(),
    compliant_documents: z.number(),
    non_compliant_documents: z.number(),
    compliance_rate: z.number(),
    critical_findings: z.number(),
    high_findings: z.number(),
    medium_findings: z.number(),
    low_findings: z.number(),
  }),
  findings: z.array(AuditFindingSchema),
  recommendations: z.array(z.object({
    priority: z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
    title: z.string(),
    description: z.string(),
    affected_documents: z.array(z.string().uuid()),
    estimated_effort: z.string().optional(),
  })),
});

export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
