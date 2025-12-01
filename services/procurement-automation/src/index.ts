/**
 * @intelgraph/procurement-automation
 *
 * Automated Government Procurement & Compliance Engine
 *
 * Streamlines government procurement, software accreditation, and compliance paperwork.
 * Features:
 * - Parse requirements and auto-detect applicable frameworks
 * - Auto-complete compliance forms with organization/system data
 * - Generate SBOMs and integrate with vulnerability scanning
 * - Surface documents for rapid Authority to Operate (ATO)
 * - Track compliance progress with dashboards and checklists
 */

// Types
export * from './types.js';

// Requirements Parser
export { RequirementsParser, type ParsedRequirements } from './requirements-parser.js';

// Form Auto-completion
export {
  FormAutoCompleteEngine,
  type OrganizationProfile,
  type SystemProfile,
  type AutoFillDataSources,
  type FormCompletionResult,
} from './form-autocomplete.js';

// ATO Document Generator
export {
  ATODocumentGenerator,
  type DocumentGenerationOptions,
  type GeneratedDocument,
} from './ato-document-generator.js';

// Compliance Tracker
export {
  ComplianceTracker,
  type ComplianceMilestone,
  type ComplianceDashboard,
  type TimelineEntry,
} from './compliance-tracker.js';

// SBOM Integration
export {
  SBOMIntegration,
  type SBOMFormat,
  type VulnerabilitySummary,
  type SBOMComponent,
  type SBOMAnalysisResult,
  type LicensePolicy,
  type VulnerabilityThreshold,
} from './sbom-integration.js';

// Main Engine
export { ProcurementAutomationEngine } from './engine.js';
