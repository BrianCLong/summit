"use strict";
/**
 * Compliance and Risk Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReportSchema = exports.AuditFindingSchema = exports.RiskThresholdSchema = exports.RiskAssessmentRequestSchema = exports.RiskScoreSchema = exports.RiskDimensionSchema = exports.ComplianceCheckResultSchema = exports.ComplianceMappingSchema = exports.RequiredSectionSchema = exports.ComplianceStandardSchema = void 0;
const zod_1 = require("zod");
const document_js_1 = require("./document.js");
// Compliance Standard Schema
exports.ComplianceStandardSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    authority: zod_1.z.string(),
    description: zod_1.z.string(),
    categories: zod_1.z.array(zod_1.z.string()).default([]),
    applicable_document_types: zod_1.z.array(zod_1.z.string()).default([]),
});
// Required Section Schema
exports.RequiredSectionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    is_mandatory: zod_1.z.boolean().default(true),
    compliance_standards: zod_1.z.array(zod_1.z.string()).default([]),
});
// Compliance Mapping Schema
exports.ComplianceMappingSchema = zod_1.z.object({
    document_type_id: zod_1.z.string(),
    standards: zod_1.z.array(zod_1.z.string()),
    required_sections: zod_1.z.array(exports.RequiredSectionSchema),
    review_frequency: zod_1.z.enum(['continuous', 'per_incident', 'per_release', 'monthly', 'quarterly', 'semi_annual', 'annual']),
});
// Compliance Check Result Schema
exports.ComplianceCheckResultSchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid(),
    document_type_id: zod_1.z.string(),
    checked_at: zod_1.z.string().datetime(),
    overall_compliant: zod_1.z.boolean(),
    applicable_standards: zod_1.z.array(zod_1.z.string()),
    section_results: zod_1.z.array(zod_1.z.object({
        section_name: zod_1.z.string(),
        present: zod_1.z.boolean(),
        compliant: zod_1.z.boolean(),
        issues: zod_1.z.array(zod_1.z.string()),
        suggestions: zod_1.z.array(zod_1.z.string()),
    })),
    missing_sections: zod_1.z.array(zod_1.z.string()),
    risk_issues: zod_1.z.array(zod_1.z.object({
        severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
        description: zod_1.z.string(),
        recommendation: zod_1.z.string(),
        standard: zod_1.z.string().optional(),
    })),
    score: zod_1.z.number().min(0).max(100),
});
// Risk Dimension Schema
exports.RiskDimensionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    weight: zod_1.z.number().min(0).max(1),
    factors: zod_1.z.array(zod_1.z.string()),
});
// Risk Score Schema
exports.RiskScoreSchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid(),
    scored_at: zod_1.z.string().datetime(),
    scored_by: zod_1.z.string().optional(),
    dimension_scores: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    weighted_score: zod_1.z.number().min(0).max(10),
    risk_level: document_js_1.RiskLevelSchema,
    modifiers_applied: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.number(),
        reason: zod_1.z.string(),
    })),
    factors: zod_1.z.array(zod_1.z.object({
        dimension: zod_1.z.string(),
        factor: zod_1.z.string(),
        score: zod_1.z.number(),
        notes: zod_1.z.string().optional(),
    })),
});
// Risk Assessment Request Schema
exports.RiskAssessmentRequestSchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid(),
    include_related_documents: zod_1.z.boolean().default(false),
    dimension_overrides: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
});
// Risk Threshold Schema
exports.RiskThresholdSchema = zod_1.z.object({
    level: document_js_1.RiskLevelSchema,
    min: zod_1.z.number(),
    max: zod_1.z.number(),
    color: zod_1.z.string(),
    description: zod_1.z.string(),
    actions: zod_1.z.array(zod_1.z.string()),
});
// Audit Finding Schema
exports.AuditFindingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    finding_type: zod_1.z.enum(['compliance_gap', 'missing_section', 'outdated_content', 'missing_signature', 'risk_issue', 'policy_violation']),
    severity: zod_1.z.enum(['info', 'low', 'medium', 'high', 'critical']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    recommendation: zod_1.z.string(),
    compliance_standard: zod_1.z.string().optional(),
    found_at: zod_1.z.string().datetime(),
    found_by: zod_1.z.string(),
    status: zod_1.z.enum(['open', 'acknowledged', 'in_progress', 'resolved', 'accepted_risk', 'false_positive']),
    resolved_at: zod_1.z.string().datetime().optional(),
    resolved_by: zod_1.z.string().optional(),
    resolution_notes: zod_1.z.string().optional(),
});
// Compliance Report Schema
exports.ComplianceReportSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    generated_at: zod_1.z.string().datetime(),
    generated_by: zod_1.z.string(),
    report_type: zod_1.z.enum(['full', 'summary', 'gap_analysis', 'risk_assessment']),
    scope: zod_1.z.object({
        document_ids: zod_1.z.array(zod_1.z.string().uuid()).optional(),
        document_types: zod_1.z.array(zod_1.z.string()).optional(),
        departments: zod_1.z.array(zod_1.z.string()).optional(),
        standards: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    summary: zod_1.z.object({
        total_documents: zod_1.z.number(),
        compliant_documents: zod_1.z.number(),
        non_compliant_documents: zod_1.z.number(),
        compliance_rate: zod_1.z.number(),
        critical_findings: zod_1.z.number(),
        high_findings: zod_1.z.number(),
        medium_findings: zod_1.z.number(),
        low_findings: zod_1.z.number(),
    }),
    findings: zod_1.z.array(exports.AuditFindingSchema),
    recommendations: zod_1.z.array(zod_1.z.object({
        priority: zod_1.z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        affected_documents: zod_1.z.array(zod_1.z.string().uuid()),
        estimated_effort: zod_1.z.string().optional(),
    })),
});
