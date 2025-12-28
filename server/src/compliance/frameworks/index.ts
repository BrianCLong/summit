/**
 * Compliance Frameworks Module
 *
 * Exports all compliance framework implementations:
 * - FedRAMP (Moderate Baseline)
 * - PCI-DSS v4.0
 * - NIST CSF 2.0
 * - CMMC 2.0
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC5.1 (Control Environment)
 *
 * @module compliance/frameworks
 */

// FedRAMP Exports
export {
  FedRAMPControlsService,
  getFedRAMPControlsService,
  type FedRAMPBaseline,
  type ControlFamily,
  type FedRAMPControl,
  type ControlEnhancement,
  type ControlParameter,
  type ControlObjective,
  type AssessmentProcedure as FedRAMPAssessmentProcedure,
  type ControlImplementation as FedRAMPControlImplementation,
  type FedRAMPAssessment,
  type ControlStatus as FedRAMPControlStatus,
  type ImplementationStatus as FedRAMPImplementationStatus,
  type Finding as FedRAMPFinding,
} from './FedRAMPControls.js';

// PCI-DSS Exports
export {
  PCIDSSControlsService,
  getPCIDSSControlsService,
  REQUIREMENT_METADATA,
  GOAL_DESCRIPTIONS,
  type PCIDSSRequirement,
  type PCIDSSGoal,
  type SAQType,
  type ControlApplicability,
  type TestingMethod,
  type PCIDSSControl,
  type TestingProcedure,
  type DefinedApproach,
  type CustomizedApproach,
  type SAQApplicability,
  type ControlImplementation as PCIDSSControlImplementation,
  type ImplementationStatus as PCIDSSImplementationStatus,
  type ImplementationEvidence as PCIDSSImplementationEvidence,
  type CompensatingControl,
  type CDEScope,
  type CDESystem,
  type CardholderDataElement,
  type CardholderDataFlow,
  type NetworkSegment,
  type ThirdPartyConnection,
  type PCIDSSAssessment,
  type ComplianceStatus as PCIDSSComplianceStatus,
  type RequirementResult,
  type AssessmentFinding,
  type AssessmentException,
  type RemediationPlan as PCIDSSRemediationPlan,
  type RemediationItem,
  type PCIDSSConfig,
  type PCIDSSStats,
} from './PCIDSSControls.js';

// NIST CSF Exports
export {
  NISTCSFControlsService,
  getNISTCSFControlsService,
  FUNCTION_METADATA,
  CATEGORY_METADATA,
  TIER_DESCRIPTIONS,
  type CSFFunction,
  type CSFCategory,
  type ImplementationTier,
  type ProfileType,
  type CSFSubcategory,
  type InformativeReference,
  type CSFProfile,
  type ProfilePriority,
  type SubcategoryStatus,
  type ImplementationState,
  type GapAnalysis,
  type FunctionGap,
  type CategoryGap,
  type PrioritizedAction,
  type MaturityAssessment,
  type NISTCSFConfig,
  type NISTCSFStats,
} from './NISTCSFControls.js';

// CMMC Exports
export {
  CMMCControlsService,
  getCMMCControlsService,
  LEVEL_DESCRIPTIONS,
  DOMAIN_METADATA,
  type CMMCLevel,
  type CMMCDomain,
  type CMMCPractice,
  type AssessmentObjective,
  type PracticeImplementation,
  type ImplementationStatus as CMMCImplementationStatus,
  type ImplementationEvidence as CMMCImplementationEvidence,
  type POAM,
  type Milestone,
  type CMMCAssessment,
  type PracticeResult,
  type DomainScore,
  type CUIScope,
  type CUICategory,
  type ScopedSystem,
  type SystemBoundary,
  type CUIDataFlow,
  type ThirdPartyProvider,
  type CMMCConfig,
  type CMMCStats,
} from './CMMCControls.js';

// ============================================================================
// Convenience Types
// ============================================================================

/**
 * All supported compliance frameworks
 */
export type ComplianceFramework = 'FedRAMP' | 'PCI-DSS' | 'NIST-CSF' | 'CMMC' | 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | 'NIST';

/**
 * Framework metadata
 */
export interface FrameworkMetadata {
  id: ComplianceFramework;
  name: string;
  version: string;
  description: string;
  controlCount: number;
  applicableTo: string[];
  certificationRequired: boolean;
}

/**
 * Get metadata for all implemented frameworks
 */
export function getFrameworkMetadata(): FrameworkMetadata[] {
  return [
    {
      id: 'FedRAMP',
      name: 'Federal Risk and Authorization Management Program',
      version: 'Moderate Baseline (Rev 5)',
      description: 'Standardized approach to security assessment for cloud products and services used by federal agencies.',
      controlCount: 325,
      applicableTo: ['Federal Agencies', 'Cloud Service Providers'],
      certificationRequired: true,
    },
    {
      id: 'PCI-DSS',
      name: 'Payment Card Industry Data Security Standard',
      version: '4.0',
      description: 'Information security standard for organizations that handle branded credit cards.',
      controlCount: 250,
      applicableTo: ['Merchants', 'Payment Processors', 'Service Providers'],
      certificationRequired: true,
    },
    {
      id: 'NIST-CSF',
      name: 'NIST Cybersecurity Framework',
      version: '2.0',
      description: 'Voluntary framework for managing cybersecurity risk based on industry standards and best practices.',
      controlCount: 106,
      applicableTo: ['All Organizations', 'Critical Infrastructure'],
      certificationRequired: false,
    },
    {
      id: 'CMMC',
      name: 'Cybersecurity Maturity Model Certification',
      version: '2.0',
      description: 'DoD cybersecurity requirements for defense contractors to protect Controlled Unclassified Information.',
      controlCount: 130,
      applicableTo: ['Defense Contractors', 'DoD Supply Chain'],
      certificationRequired: true,
    },
  ];
}
