#!/usr/bin/env node
/**
 * Regulatory Stance Analyzer for Summit/IntelGraph
 * =================================================
 *
 * Analyzes the platform's regulatory stance under various compliance frameworks
 * (GDPR, CCPA, EU AI Act) by examining data flows, processing operations, and
 * feature implementations.
 *
 * DISCLAIMER: This is a simulation/aid tool, NOT legal advice.
 * Always consult qualified legal counsel for compliance matters.
 *
 * Usage:
 *   pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --lens gdpr
 *   pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --lens eu_ai_act
 *   pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --all
 *
 * @module compliance/analyze-regulatory-stance
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// ============================================================================
// Type Definitions
// ============================================================================

interface RegulatoryLens {
  id: string;
  name: string;
  jurisdiction: string;
  effectiveDate: string;
  authority: string;
  referenceUrl: string;
  categories: LensCategory[];
  dataTypeMappings: Record<string, string[]>;
  featureMappings: Record<string, string[]>;
  processingOperations: Record<string, ProcessingOperation>;
}

interface LensCategory {
  id: string;
  name: string;
  description: string;
  articles?: string[];
  requirements?: string[];
  rights?: string[];
  practices?: string[];
  domains?: string[];
  bases?: string[];
  dataTypes?: string[];
}

interface ProcessingOperation {
  obligations: string[];
}

interface FeatureRiskEntry {
  risk_level: string;
  obligations: string[];
  articles?: string[];
}

interface FeatureRiskMatrix {
  [feature: string]: {
    [lens: string]: FeatureRiskEntry;
  };
}

interface ServiceMapping {
  dataTypes: string[];
  features: string[];
  regulations: string[];
}

interface LensConfiguration {
  lenses: RegulatoryLens[];
  featureRiskMatrix: FeatureRiskMatrix;
  serviceMappings: Record<string, ServiceMapping>;
  obligationTemplates: Record<string, ObligationTemplate>;
  analysisConfig: AnalysisConfig;
}

interface ObligationTemplate {
  name: string;
  description: string;
  triggers?: string[];
  requirements?: string[];
  sla?: string;
  steps?: string[];
  outputs: string[];
}

interface AnalysisConfig {
  defaultLens: string;
  outputFormat: string;
  reportDirectory: string;
  severityLevels: Record<string, SeverityLevel>;
  complianceScoring: {
    weights: Record<string, number>;
    passingThreshold: number;
  };
}

interface SeverityLevel {
  threshold: number;
  description: string;
  color: string;
}

interface Finding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  service?: string;
  dataTypes?: string[];
  features?: string[];
  obligations: string[];
  articles?: string[];
  remediation?: string[];
}

interface StanceReport {
  metadata: {
    lensId: string;
    lensName: string;
    generatedAt: string;
    platformVersion: string;
    disclaimer: string;
  };
  summary: {
    overallScore: number;
    passingThreshold: number;
    status: "compliant" | "needs_review" | "non_compliant";
    findingCounts: Record<string, number>;
  };
  findings: Finding[];
  obligationChecklist: ObligationChecklistItem[];
  recommendations: Recommendation[];
  dataFlowAnalysis: DataFlowAnalysisResult;
}

interface ObligationChecklistItem {
  id: string;
  obligation: string;
  category: string;
  status: "implemented" | "partial" | "not_implemented" | "not_applicable";
  evidence?: string;
  gaps?: string[];
}

interface Recommendation {
  priority: number;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  relatedFindings: string[];
}

interface DataFlowAnalysisResult {
  entryPoints: DataFlowPoint[];
  storageLocations: DataFlowPoint[];
  processingServices: DataFlowPoint[];
  exitPoints: DataFlowPoint[];
  crossBorderTransfers: CrossBorderTransfer[];
}

interface DataFlowPoint {
  name: string;
  dataTypes: string[];
  riskLevel: string;
  regulatoryFlags: string[];
}

interface CrossBorderTransfer {
  source: string;
  destination: string;
  mechanism: string;
  requiresTIA: boolean;
}

// ============================================================================
// Configuration Loading
// ============================================================================

const ROOT_DIR = path.resolve(import.meta.dirname || __dirname, "../..");
const LENSES_PATH = path.join(ROOT_DIR, "compliance/regulatory-lenses.yml");
const DATA_FLOW_PATH = path.join(ROOT_DIR, "docs/compliance/data-flow-map.md");
const REPORTS_DIR = path.join(ROOT_DIR, "reports");

function loadLensConfiguration(): LensConfiguration {
  if (!fs.existsSync(LENSES_PATH)) {
    throw new Error(`Regulatory lenses configuration not found: ${LENSES_PATH}`);
  }

  const content = fs.readFileSync(LENSES_PATH, "utf-8");
  const config = yaml.load(content) as LensConfiguration;

  if (!config.lenses || config.lenses.length === 0) {
    throw new Error("No regulatory lenses defined in configuration");
  }

  return config;
}

function getLens(config: LensConfiguration, lensId: string): RegulatoryLens {
  const lens = config.lenses.find((l) => l.id === lensId);
  if (!lens) {
    const available = config.lenses.map((l) => l.id).join(", ");
    throw new Error(`Lens "${lensId}" not found. Available lenses: ${available}`);
  }
  return lens;
}

// ============================================================================
// Analysis Functions
// ============================================================================

function analyzeServiceMappings(config: LensConfiguration, lens: RegulatoryLens): Finding[] {
  const findings: Finding[] = [];
  const serviceMappings = config.serviceMappings || {};

  for (const [serviceName, mapping] of Object.entries(serviceMappings)) {
    if (!mapping.regulations.includes(lens.id)) {
      continue;
    }

    // Check for high-risk features
    const highRiskFeatures = mapping.features.filter((feature) => {
      const riskEntry = config.featureRiskMatrix?.[feature]?.[lens.id];
      return riskEntry && (riskEntry.risk_level === "high" || riskEntry.risk_level === "critical");
    });

    if (highRiskFeatures.length > 0) {
      const riskInfo = highRiskFeatures
        .map((f) => {
          const entry = config.featureRiskMatrix[f][lens.id];
          return {
            feature: f,
            ...entry,
          };
        })
        .filter(Boolean);

      const allObligations = riskInfo.flatMap((r) => r.obligations || []);
      const allArticles = riskInfo.flatMap((r) => r.articles || []);

      findings.push({
        id: `${lens.id}-${serviceName}-high-risk`,
        category: "high_risk_processing",
        title: `High-Risk Processing in ${serviceName}`,
        description: `Service "${serviceName}" implements high-risk features: ${highRiskFeatures.join(", ")}`,
        severity: "high",
        service: serviceName,
        features: highRiskFeatures,
        dataTypes: mapping.dataTypes,
        obligations: [...new Set(allObligations)],
        articles: [...new Set(allArticles)],
        remediation: [
          "Conduct Data Protection Impact Assessment (DPIA)",
          "Implement required safeguards and controls",
          "Document lawful basis for processing",
          "Ensure human oversight mechanisms are in place",
        ],
      });
    }

    // Check for special category data
    const specialCategoryTypes =
      lens.dataTypeMappings?.special_category || lens.dataTypeMappings?.sensitive_data || [];
    const handlesSpecialCategory = mapping.dataTypes.some(
      (dt) =>
        specialCategoryTypes.includes(dt) ||
        dt.includes("biometric") ||
        dt.includes("health") ||
        dt.includes("genetic")
    );

    if (handlesSpecialCategory) {
      findings.push({
        id: `${lens.id}-${serviceName}-special-category`,
        category: "special_category_data",
        title: `Special Category Data in ${serviceName}`,
        description: `Service "${serviceName}" may process special category/sensitive data`,
        severity: "critical",
        service: serviceName,
        dataTypes: mapping.dataTypes,
        obligations: [
          "explicit_consent_or_legal_basis",
          "enhanced_security_measures",
          "dpia_required",
          "access_restrictions",
        ],
        remediation: [
          "Verify explicit consent or applicable legal exemption",
          "Implement enhanced access controls",
          "Conduct mandatory DPIA",
          "Apply data minimization principles",
        ],
      });
    }

    // Check for automated decision-making
    if (
      mapping.features.includes("automated_decision_making") ||
      mapping.features.includes("profiling")
    ) {
      findings.push({
        id: `${lens.id}-${serviceName}-automated-decisions`,
        category: "automated_decisions",
        title: `Automated Decision-Making in ${serviceName}`,
        description: `Service "${serviceName}" implements automated decision-making or profiling`,
        severity: "high",
        service: serviceName,
        features: mapping.features.filter(
          (f) => f.includes("automated") || f.includes("profiling")
        ),
        obligations: [
          "human_review_mechanism",
          "explanation_capability",
          "right_to_contest",
          "transparency_notice",
        ],
        articles: lens.id === "gdpr" ? ["Art. 22"] : lens.id === "eu_ai_act" ? ["Art. 14"] : [],
        remediation: [
          "Implement human review/override capability",
          "Provide meaningful explanations of decisions",
          "Enable data subjects to contest decisions",
          "Document the logic and significance of processing",
        ],
      });
    }
  }

  return findings;
}

function analyzeDataFlows(config: LensConfiguration, lens: RegulatoryLens): DataFlowAnalysisResult {
  const serviceMappings = config.serviceMappings || {};

  const entryPoints: DataFlowPoint[] = [
    {
      name: "Web Application",
      dataTypes: ["user_credentials", "session_data", "preferences"],
      riskLevel: "medium",
      regulatoryFlags: ["transparency_required", "consent_management"],
    },
    {
      name: "API Gateway",
      dataTypes: ["api_keys", "request_metadata", "query_parameters"],
      riskLevel: "low",
      regulatoryFlags: ["access_logging"],
    },
    {
      name: "GraphQL API",
      dataTypes: ["entity_data", "relationship_data", "search_queries"],
      riskLevel: "medium",
      regulatoryFlags: ["purpose_limitation"],
    },
    {
      name: "Ingest Connectors",
      dataTypes: ["external_feeds", "osint_data"],
      riskLevel: "high",
      regulatoryFlags: ["third_party_data", "lawful_basis_verification"],
    },
  ];

  const storageLocations: DataFlowPoint[] = [
    {
      name: "Neo4j Graph Database",
      dataTypes: ["entities", "relationships", "properties"],
      riskLevel: "high",
      regulatoryFlags: ["encryption_required", "access_control", "retention"],
    },
    {
      name: "PostgreSQL",
      dataTypes: ["user_accounts", "case_metadata", "audit_logs"],
      riskLevel: "high",
      regulatoryFlags: ["encryption_required", "access_control", "backup"],
    },
    {
      name: "Redis Cache",
      dataTypes: ["session_data", "query_cache"],
      riskLevel: "low",
      regulatoryFlags: ["ttl_required", "no_persistence_sensitive"],
    },
  ];

  const processingServices: DataFlowPoint[] = Object.entries(serviceMappings)
    .filter(([, mapping]) => mapping.regulations.includes(lens.id))
    .map(([name, mapping]) => ({
      name,
      dataTypes: mapping.dataTypes,
      riskLevel: mapping.features.some(
        (f) => f.includes("automated") || f.includes("profiling") || f.includes("biometric")
      )
        ? "high"
        : "medium",
      regulatoryFlags: mapping.features,
    }));

  const exitPoints: DataFlowPoint[] = [
    {
      name: "DSAR Export",
      dataTypes: ["personal_data_package"],
      riskLevel: "medium",
      regulatoryFlags: ["identity_verification", "encryption", "audit_trail"],
    },
    {
      name: "Report Export",
      dataTypes: ["investigation_reports"],
      riskLevel: "medium",
      regulatoryFlags: ["access_control", "watermarking"],
    },
    {
      name: "API Responses",
      dataTypes: ["query_results"],
      riskLevel: "low",
      regulatoryFlags: ["rate_limiting", "field_level_access"],
    },
  ];

  const crossBorderTransfers: CrossBorderTransfer[] = [
    {
      source: "EU",
      destination: "US (Cloud Provider)",
      mechanism: "SCCs + Supplementary Measures",
      requiresTIA: true,
    },
    {
      source: "EU",
      destination: "US (LLM Provider)",
      mechanism: "SCCs + DPA",
      requiresTIA: true,
    },
  ];

  return {
    entryPoints,
    storageLocations,
    processingServices,
    exitPoints,
    crossBorderTransfers,
  };
}

function generateObligationChecklist(
  config: LensConfiguration,
  lens: RegulatoryLens
): ObligationChecklistItem[] {
  const checklist: ObligationChecklistItem[] = [];

  // Core obligations based on lens categories
  for (const category of lens.categories) {
    const categoryObligations = getObligationsForCategory(category, lens.id);

    for (const obligation of categoryObligations) {
      checklist.push({
        id: `${lens.id}-${category.id}-${obligation.id}`,
        obligation: obligation.name,
        category: category.name,
        status: evaluateObligationStatus(obligation.id),
        evidence: getEvidenceForObligation(obligation.id),
        gaps: getGapsForObligation(obligation.id),
      });
    }
  }

  return checklist;
}

function getObligationsForCategory(
  category: LensCategory,
  lensId: string
): { id: string; name: string }[] {
  const obligations: { id: string; name: string }[] = [];

  if (category.id === "data_subject_rights" && lensId === "gdpr") {
    obligations.push(
      { id: "access", name: "Right of Access (Art. 15)" },
      { id: "rectification", name: "Right to Rectification (Art. 16)" },
      { id: "erasure", name: "Right to Erasure (Art. 17)" },
      { id: "portability", name: "Right to Data Portability (Art. 20)" },
      { id: "object", name: "Right to Object (Art. 21)" },
      {
        id: "automated_decisions",
        name: "Automated Decision Rights (Art. 22)",
      }
    );
  } else if (category.id === "consumer_rights" && lensId === "ccpa") {
    obligations.push(
      { id: "know", name: "Right to Know" },
      { id: "delete", name: "Right to Delete" },
      { id: "opt_out", name: "Right to Opt-Out of Sale" },
      { id: "correct", name: "Right to Correct" },
      { id: "limit", name: "Right to Limit Sensitive Data Use" }
    );
  } else if (category.id === "high_risk_ai" && lensId === "eu_ai_act") {
    obligations.push(
      { id: "risk_management", name: "Risk Management System" },
      { id: "data_governance", name: "Data Governance" },
      { id: "technical_docs", name: "Technical Documentation" },
      { id: "human_oversight", name: "Human Oversight" },
      { id: "transparency", name: "Transparency Requirements" },
      { id: "conformity", name: "Conformity Assessment" }
    );
  } else if (category.id === "security") {
    obligations.push(
      { id: "encryption", name: "Encryption at Rest and in Transit" },
      { id: "access_control", name: "Access Control Measures" },
      { id: "breach_notification", name: "Breach Notification Process" },
      { id: "incident_response", name: "Incident Response Plan" }
    );
  } else if (category.id === "accountability") {
    obligations.push(
      { id: "records", name: "Records of Processing Activities" },
      { id: "dpia", name: "Data Protection Impact Assessment" },
      { id: "dpo", name: "Data Protection Officer" },
      { id: "policies", name: "Privacy Policies and Notices" }
    );
  }

  return obligations;
}

function evaluateObligationStatus(
  obligationId: string
): "implemented" | "partial" | "not_implemented" | "not_applicable" {
  // Simulated evaluation based on known platform capabilities
  const implementedObligations = [
    "access",
    "erasure",
    "encryption",
    "access_control",
    "records",
    "delete",
    "know",
  ];
  const partialObligations = [
    "portability",
    "automated_decisions",
    "dpia",
    "human_oversight",
    "transparency",
    "risk_management",
  ];

  if (implementedObligations.includes(obligationId)) {
    return "implemented";
  } else if (partialObligations.includes(obligationId)) {
    return "partial";
  }
  return "not_implemented";
}

function getEvidenceForObligation(obligationId: string): string | undefined {
  const evidenceMap: Record<string, string> = {
    access: "DSAR export functionality in services/compliance/dsar.ts",
    erasure: "RTBF worker in services/compliance/workers/rtbf_worker.ts",
    encryption: "AES-256-GCM encryption configured for all data stores",
    access_control: "RBAC + ABAC via OPA policy engine",
    records: "Audit ledger in services/audit_svc/",
    delete: "DSAR deletion workflow implemented",
    know: "DSAR export with full data package",
  };
  return evidenceMap[obligationId];
}

function getGapsForObligation(obligationId: string): string[] | undefined {
  const gapsMap: Record<string, string[]> = {
    portability: [
      "Machine-readable format export not fully standardized",
      "Direct transfer to other controllers not implemented",
    ],
    automated_decisions: [
      "Explainability for all AI decisions not complete",
      "Human review workflow needs enhancement",
    ],
    dpia: [
      "DPIA templates need updating for new features",
      "Automated DPIA triggers not fully implemented",
    ],
    human_oversight: [
      "Some AI features lack explicit override mechanisms",
      "Oversight dashboards need enhancement",
    ],
    transparency: [
      "AI interaction disclosure not in all user interfaces",
      "Model documentation incomplete",
    ],
    risk_management: [
      "AI risk classification framework needs formalization",
      "Continuous monitoring capabilities need expansion",
    ],
  };
  return gapsMap[obligationId];
}

function generateRecommendations(findings: Finding[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const findingsByCategory = groupBy(findings, "category");

  // High-risk processing recommendations
  if (findingsByCategory["high_risk_processing"]?.length) {
    recommendations.push({
      priority: 1,
      title: "Conduct Comprehensive DPIA",
      description:
        "Perform Data Protection Impact Assessments for all high-risk processing operations identified",
      effort: "high",
      impact: "high",
      relatedFindings: findingsByCategory["high_risk_processing"].map((f) => f.id),
    });
  }

  // Special category data recommendations
  if (findingsByCategory["special_category_data"]?.length) {
    recommendations.push({
      priority: 1,
      title: "Review Special Category Data Handling",
      description:
        "Verify explicit consent or legal basis for all special category data processing",
      effort: "medium",
      impact: "high",
      relatedFindings: findingsByCategory["special_category_data"].map((f) => f.id),
    });
  }

  // Automated decisions recommendations
  if (findingsByCategory["automated_decisions"]?.length) {
    recommendations.push({
      priority: 2,
      title: "Enhance Automated Decision Safeguards",
      description:
        "Implement human oversight, explainability, and contestability for automated decisions",
      effort: "high",
      impact: "high",
      relatedFindings: findingsByCategory["automated_decisions"].map((f) => f.id),
    });
  }

  // General recommendations
  recommendations.push(
    {
      priority: 3,
      title: "Maintain Compliance Documentation",
      description:
        "Keep records of processing activities, DPIAs, and compliance evidence up to date",
      effort: "medium",
      impact: "medium",
      relatedFindings: [],
    },
    {
      priority: 4,
      title: "Regular Compliance Reviews",
      description: "Schedule quarterly reviews of regulatory stance and update controls as needed",
      effort: "low",
      impact: "medium",
      relatedFindings: [],
    }
  );

  return recommendations.sort((a, b) => a.priority - b.priority);
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

function calculateComplianceScore(
  findings: Finding[],
  checklist: ObligationChecklistItem[]
): number {
  const findingSeverityScores: Record<string, number> = {
    critical: 0,
    high: 0.25,
    medium: 0.5,
    low: 0.75,
    informational: 1,
  };

  const checklistStatusScores: Record<string, number> = {
    implemented: 1,
    partial: 0.5,
    not_implemented: 0,
    not_applicable: 1,
  };

  // Calculate finding score (inverse - fewer/less severe = higher score)
  const avgFindingSeverity =
    findings.length > 0
      ? findings.reduce((sum, f) => sum + (findingSeverityScores[f.severity] || 0), 0) /
        findings.length
      : 1;

  // Calculate checklist score
  const avgChecklistStatus =
    checklist.length > 0
      ? checklist.reduce((sum, c) => sum + (checklistStatusScores[c.status] || 0), 0) /
        checklist.length
      : 0;

  // Weighted average
  const score = avgFindingSeverity * 0.4 + avgChecklistStatus * 0.6;
  return Math.round(score * 100) / 100;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(config: LensConfiguration, lens: RegulatoryLens): StanceReport {
  const findings = analyzeServiceMappings(config, lens);
  const dataFlowAnalysis = analyzeDataFlows(config, lens);
  const obligationChecklist = generateObligationChecklist(config, lens);
  const recommendations = generateRecommendations(findings);
  const overallScore = calculateComplianceScore(findings, obligationChecklist);

  const findingCounts = findings.reduce(
    (counts, f) => {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );

  return {
    metadata: {
      lensId: lens.id,
      lensName: lens.name,
      generatedAt: new Date().toISOString(),
      platformVersion: "1.0.0",
      disclaimer:
        "This is a simulation/aid tool, NOT legal advice. Consult qualified legal counsel for compliance matters.",
    },
    summary: {
      overallScore,
      passingThreshold: config.analysisConfig?.complianceScoring?.passingThreshold || 0.7,
      status:
        overallScore >= 0.7 ? "compliant" : overallScore >= 0.5 ? "needs_review" : "non_compliant",
      findingCounts,
    },
    findings,
    obligationChecklist,
    recommendations,
    dataFlowAnalysis,
  };
}

function formatReportAsMarkdown(report: StanceReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Regulatory Stance Report: ${report.metadata.lensName}`);
  lines.push("");
  lines.push(`> **Generated**: ${report.metadata.generatedAt}`);
  lines.push(`> **Platform Version**: ${report.metadata.platformVersion}`);
  lines.push("");
  lines.push(`> **DISCLAIMER**: ${report.metadata.disclaimer}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Executive Summary
  lines.push("## Executive Summary");
  lines.push("");
  const statusEmoji =
    report.summary.status === "compliant"
      ? "PASS"
      : report.summary.status === "needs_review"
        ? "REVIEW"
        : "FAIL";
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Overall Score** | ${(report.summary.overallScore * 100).toFixed(1)}% |`);
  lines.push(`| **Passing Threshold** | ${(report.summary.passingThreshold * 100).toFixed(1)}% |`);
  lines.push(`| **Status** | ${statusEmoji} |`);
  lines.push(`| **Critical Findings** | ${report.summary.findingCounts["critical"] || 0} |`);
  lines.push(`| **High Findings** | ${report.summary.findingCounts["high"] || 0} |`);
  lines.push(`| **Medium Findings** | ${report.summary.findingCounts["medium"] || 0} |`);
  lines.push("");

  // Findings
  lines.push("## Findings");
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("No significant findings identified.");
  } else {
    for (const finding of report.findings) {
      const severityBadge = `[${finding.severity.toUpperCase()}]`;
      lines.push(`### ${severityBadge} ${finding.title}`);
      lines.push("");
      lines.push(`**ID**: ${finding.id}`);
      lines.push(`**Category**: ${finding.category}`);
      if (finding.service) {
        lines.push(`**Service**: ${finding.service}`);
      }
      lines.push("");
      lines.push(finding.description);
      lines.push("");

      if (finding.dataTypes?.length) {
        lines.push(`**Data Types**: ${finding.dataTypes.join(", ")}`);
      }
      if (finding.features?.length) {
        lines.push(`**Features**: ${finding.features.join(", ")}`);
      }
      if (finding.articles?.length) {
        lines.push(`**Relevant Articles**: ${finding.articles.join(", ")}`);
      }
      lines.push("");

      if (finding.obligations.length) {
        lines.push("**Obligations**:");
        for (const obligation of finding.obligations) {
          lines.push(`- ${obligation}`);
        }
        lines.push("");
      }

      if (finding.remediation?.length) {
        lines.push("**Remediation**:");
        for (const step of finding.remediation) {
          lines.push(`- ${step}`);
        }
        lines.push("");
      }
    }
  }

  // Obligation Checklist
  lines.push("## Obligation Checklist");
  lines.push("");
  lines.push("| Status | Obligation | Category | Evidence/Gaps |");
  lines.push("|--------|------------|----------|---------------|");

  for (const item of report.obligationChecklist) {
    const statusIcon =
      item.status === "implemented"
        ? "[x]"
        : item.status === "partial"
          ? "[~]"
          : item.status === "not_applicable"
            ? "N/A"
            : "[ ]";
    const evidenceOrGaps = item.evidence
      ? item.evidence
      : item.gaps?.length
        ? `Gaps: ${item.gaps.join("; ")}`
        : "-";
    lines.push(`| ${statusIcon} | ${item.obligation} | ${item.category} | ${evidenceOrGaps} |`);
  }
  lines.push("");

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");

  for (const rec of report.recommendations) {
    lines.push(`### ${rec.priority}. ${rec.title}`);
    lines.push("");
    lines.push(rec.description);
    lines.push("");
    lines.push(`- **Effort**: ${rec.effort}`);
    lines.push(`- **Impact**: ${rec.impact}`);
    if (rec.relatedFindings.length) {
      lines.push(`- **Related Findings**: ${rec.relatedFindings.join(", ")}`);
    }
    lines.push("");
  }

  // Data Flow Analysis
  lines.push("## Data Flow Analysis");
  lines.push("");

  lines.push("### Entry Points");
  lines.push("");
  lines.push("| Name | Data Types | Risk Level | Regulatory Flags |");
  lines.push("|------|------------|------------|------------------|");
  for (const ep of report.dataFlowAnalysis.entryPoints) {
    lines.push(
      `| ${ep.name} | ${ep.dataTypes.join(", ")} | ${ep.riskLevel} | ${ep.regulatoryFlags.join(", ")} |`
    );
  }
  lines.push("");

  lines.push("### Processing Services");
  lines.push("");
  lines.push("| Service | Data Types | Risk Level | Features |");
  lines.push("|---------|------------|------------|----------|");
  for (const ps of report.dataFlowAnalysis.processingServices) {
    lines.push(
      `| ${ps.name} | ${ps.dataTypes.join(", ")} | ${ps.riskLevel} | ${ps.regulatoryFlags.join(", ")} |`
    );
  }
  lines.push("");

  lines.push("### Cross-Border Transfers");
  lines.push("");
  lines.push("| Source | Destination | Mechanism | TIA Required |");
  lines.push("|--------|-------------|-----------|--------------|");
  for (const transfer of report.dataFlowAnalysis.crossBorderTransfers) {
    lines.push(
      `| ${transfer.source} | ${transfer.destination} | ${transfer.mechanism} | ${transfer.requiresTIA ? "Yes" : "No"} |`
    );
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("*Report generated by Summit/IntelGraph Regulatory Stance Analyzer*");

  return lines.join("\n");
}

function writeReport(report: StanceReport, outputPath: string): void {
  const markdown = formatReportAsMarkdown(report);

  // Ensure reports directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`Report written to: ${outputPath}`);
}

// ============================================================================
// CLI Interface
// ============================================================================

function parseArgs(): { lensIds: string[]; all: boolean } {
  const args = process.argv.slice(2);
  const result = { lensIds: [] as string[], all: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lens" && args[i + 1]) {
      result.lensIds.push(args[i + 1]);
      i++;
    } else if (args[i] === "--all") {
      result.all = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Regulatory Stance Analyzer for Summit/IntelGraph
=================================================

Usage:
  pnpm tsx scripts/compliance/analyze-regulatory-stance.ts [options]

Options:
  --lens <id>    Analyze stance for a specific regulatory lens (gdpr, ccpa, eu_ai_act)
  --all          Analyze stance for all configured lenses
  --help, -h     Show this help message

Examples:
  pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --lens gdpr
  pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --lens eu_ai_act
  pnpm tsx scripts/compliance/analyze-regulatory-stance.ts --all

Output:
  Reports are written to reports/regulatory-stance-<lens>.md

DISCLAIMER: This is a simulation/aid tool, NOT legal advice.
`);
      process.exit(0);
    }
  }

  return result;
}

async function main(): Promise<void> {
  console.log("");
  console.log("=".repeat(60));
  console.log("  Regulatory Stance Analyzer - Summit/IntelGraph");
  console.log("=".repeat(60));
  console.log("");

  try {
    const config = loadLensConfiguration();
    const { lensIds, all } = parseArgs();

    let targetLensIds: string[];

    if (all) {
      targetLensIds = config.lenses.map((l) => l.id);
    } else if (lensIds.length > 0) {
      targetLensIds = lensIds;
    } else {
      // Default to GDPR
      targetLensIds = [config.analysisConfig?.defaultLens || "gdpr"];
    }

    console.log(`Analyzing regulatory stance for: ${targetLensIds.join(", ")}`);
    console.log("");

    for (const lensId of targetLensIds) {
      console.log(`Processing lens: ${lensId}...`);

      const lens = getLens(config, lensId);
      const report = generateReport(config, lens);
      const outputPath = path.join(REPORTS_DIR, `regulatory-stance-${lensId}.md`);

      writeReport(report, outputPath);

      // Print summary
      console.log(`  Status: ${report.summary.status.toUpperCase()}`);
      console.log(`  Score: ${(report.summary.overallScore * 100).toFixed(1)}%`);
      console.log(`  Findings: ${report.findings.length}`);
      console.log("");
    }

    console.log("Analysis complete.");
    console.log("");
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
