/**
 * NIST Cybersecurity Framework (CSF) 2.0 Controls
 *
 * Implementation of NIST CSF 2.0 with 6 core functions,
 * 22 categories, and implementation tiers.
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC5.1 (Control Environment)
 *
 * @module compliance/frameworks/NISTCSFControls
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createDataEnvelope, GovernanceResult, DataClassification } from '../../types/data-envelope.js';
import type { DataEnvelope, GovernanceVerdict } from '../../types/data-envelope.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * NIST CSF 2.0 Core Functions (6 functions)
 */
export type CSFFunction =
  | 'GOVERN'   // GV - New in CSF 2.0
  | 'IDENTIFY'
  | 'PROTECT'
  | 'DETECT'
  | 'RESPOND'
  | 'RECOVER';

/**
 * NIST CSF Categories (22 categories across 6 functions)
 */
export type CSFCategory =
  // GOVERN (GV) - 6 categories
  | 'GV.OC'  // Organizational Context
  | 'GV.RM'  // Risk Management Strategy
  | 'GV.RR'  // Roles, Responsibilities, and Authorities
  | 'GV.PO'  // Policy
  | 'GV.OV'  // Oversight
  | 'GV.SC'  // Cybersecurity Supply Chain Risk Management
  // IDENTIFY (ID) - 3 categories
  | 'ID.AM'  // Asset Management
  | 'ID.RA'  // Risk Assessment
  | 'ID.IM'  // Improvement
  // PROTECT (PR) - 5 categories
  | 'PR.AA'  // Identity Management, Authentication, and Access Control
  | 'PR.AT'  // Awareness and Training
  | 'PR.DS'  // Data Security
  | 'PR.PS'  // Platform Security
  | 'PR.IR'  // Technology Infrastructure Resilience
  // DETECT (DE) - 2 categories
  | 'DE.CM'  // Continuous Monitoring
  | 'DE.AE'  // Adverse Event Analysis
  // RESPOND (RS) - 4 categories
  | 'RS.MA'  // Incident Management
  | 'RS.AN'  // Incident Analysis
  | 'RS.CO'  // Incident Response Reporting and Communication
  | 'RS.MI'  // Incident Mitigation
  // RECOVER (RC) - 2 categories
  | 'RC.RP'  // Incident Recovery Plan Execution
  | 'RC.CO'; // Incident Recovery Communication

/**
 * Implementation Tiers (1-4)
 */
export type ImplementationTier = 1 | 2 | 3 | 4;

export const TIER_DESCRIPTIONS: Record<ImplementationTier, {
  name: string;
  riskManagement: string;
  integratedProgram: string;
  externalParticipation: string;
}> = {
  1: {
    name: 'Partial',
    riskManagement: 'Risk management practices are not formalized or are ad hoc',
    integratedProgram: 'Limited awareness of cybersecurity risk at organizational level',
    externalParticipation: 'Organization does not understand its role in the ecosystem',
  },
  2: {
    name: 'Risk Informed',
    riskManagement: 'Risk management practices are approved but may not be organization-wide',
    integratedProgram: 'Awareness exists but organization-wide approach not established',
    externalParticipation: 'Organization understands its role but has not formalized capabilities',
  },
  3: {
    name: 'Repeatable',
    riskManagement: 'Risk management practices are formally approved and expressed as policy',
    integratedProgram: 'Organization-wide approach to managing cybersecurity risk',
    externalParticipation: 'Organization understands its dependencies and dependents',
  },
  4: {
    name: 'Adaptive',
    riskManagement: 'Organization adapts its practices based on lessons learned and predictive indicators',
    integratedProgram: 'Risk-informed decisions are part of organizational culture',
    externalParticipation: 'Organization actively shares information with ecosystem partners',
  },
};

/**
 * Profile types
 */
export type ProfileType = 'current' | 'target' | 'community';

/**
 * NIST CSF Subcategory (individual control)
 */
export interface CSFSubcategory {
  id: string;
  function: CSFFunction;
  category: CSFCategory;
  subcategoryId: string;
  title: string;
  description: string;
  implementationExamples: string[];
  informativeReferences: InformativeReference[];
  isNewInV2: boolean;
}

/**
 * Informative reference to other standards
 */
export interface InformativeReference {
  framework: string;
  controlId: string;
  description?: string;
}

/**
 * CSF Profile
 */
export interface CSFProfile {
  id: string;
  tenantId: string;
  name: string;
  type: ProfileType;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  priorities: ProfilePriority[];
  subcategoryStatuses: SubcategoryStatus[];
  targetTier: ImplementationTier;
  currentTier?: ImplementationTier;
}

/**
 * Priority within profile
 */
export interface ProfilePriority {
  function: CSFFunction;
  priority: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
}

/**
 * Subcategory status in profile
 */
export interface SubcategoryStatus {
  subcategoryId: string;
  currentState: ImplementationState;
  targetState: ImplementationState;
  gap: number; // 0-100
  priority: number; // 1-5
  notes: string;
}

export type ImplementationState =
  | 'not_implemented'
  | 'partially_implemented'
  | 'largely_implemented'
  | 'fully_implemented'
  | 'not_applicable';

/**
 * Gap analysis result
 */
export interface GapAnalysis {
  id: string;
  tenantId: string;
  currentProfileId: string;
  targetProfileId: string;
  analyzedAt: Date;
  overallGap: number;
  functionGaps: FunctionGap[];
  prioritizedActions: PrioritizedAction[];
}

/**
 * Gap by function
 */
export interface FunctionGap {
  function: CSFFunction;
  currentScore: number;
  targetScore: number;
  gap: number;
  categoryGaps: CategoryGap[];
}

/**
 * Gap by category
 */
export interface CategoryGap {
  category: CSFCategory;
  currentScore: number;
  targetScore: number;
  gap: number;
  subcategoryGaps: {
    subcategoryId: string;
    currentState: ImplementationState;
    targetState: ImplementationState;
    gap: number;
  }[];
}

/**
 * Prioritized remediation action
 */
export interface PrioritizedAction {
  id: string;
  subcategoryId: string;
  action: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  estimatedCost?: string;
  dependencies: string[];
}

/**
 * Maturity assessment
 */
export interface MaturityAssessment {
  id: string;
  tenantId: string;
  assessedAt: Date;
  overallTier: ImplementationTier;
  functionTiers: Record<CSFFunction, ImplementationTier>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * Service configuration
 */
export interface NISTCSFConfig {
  enableCommunityProfiles: boolean;
  defaultTargetTier: ImplementationTier;
  enableCrossFrameworkMapping: boolean;
}

/**
 * Service statistics
 */
export interface NISTCSFStats {
  totalSubcategories: number;
  profileCount: number;
  averageTier: number;
  gapAnalysesPerformed: number;
  functionCoverage: Record<CSFFunction, number>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'nist-csf-compliance-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'NISTCSFControls',
  };
}

// ============================================================================
// NIST CSF Data
// ============================================================================

/**
 * Function metadata
 */
export const FUNCTION_METADATA: Record<CSFFunction, {
  name: string;
  description: string;
  categories: CSFCategory[];
}> = {
  GOVERN: {
    name: 'Govern',
    description: 'Establish and monitor the organization\'s cybersecurity risk management strategy, expectations, and policy.',
    categories: ['GV.OC', 'GV.RM', 'GV.RR', 'GV.PO', 'GV.OV', 'GV.SC'],
  },
  IDENTIFY: {
    name: 'Identify',
    description: 'Understand the organization\'s current cybersecurity risks.',
    categories: ['ID.AM', 'ID.RA', 'ID.IM'],
  },
  PROTECT: {
    name: 'Protect',
    description: 'Use safeguards to prevent or reduce cybersecurity risk.',
    categories: ['PR.AA', 'PR.AT', 'PR.DS', 'PR.PS', 'PR.IR'],
  },
  DETECT: {
    name: 'Detect',
    description: 'Find and analyze possible cybersecurity attacks and compromises.',
    categories: ['DE.CM', 'DE.AE'],
  },
  RESPOND: {
    name: 'Respond',
    description: 'Take action regarding a detected cybersecurity incident.',
    categories: ['RS.MA', 'RS.AN', 'RS.CO', 'RS.MI'],
  },
  RECOVER: {
    name: 'Recover',
    description: 'Restore assets and operations that were impacted by a cybersecurity incident.',
    categories: ['RC.RP', 'RC.CO'],
  },
};

/**
 * Category metadata
 */
export const CATEGORY_METADATA: Record<CSFCategory, {
  name: string;
  description: string;
  function: CSFFunction;
}> = {
  // GOVERN
  'GV.OC': {
    name: 'Organizational Context',
    description: 'The circumstances — mission, stakeholder expectations, dependencies, and legal, regulatory, and contractual requirements — surrounding the organization\'s cybersecurity risk management decisions are understood.',
    function: 'GOVERN',
  },
  'GV.RM': {
    name: 'Risk Management Strategy',
    description: 'The organization\'s priorities, constraints, risk tolerance and appetite statements, and assumptions are established, communicated, and used to support operational risk decisions.',
    function: 'GOVERN',
  },
  'GV.RR': {
    name: 'Roles, Responsibilities, and Authorities',
    description: 'Cybersecurity roles, responsibilities, and authorities to foster accountability, performance assessment, and continuous improvement are established and communicated.',
    function: 'GOVERN',
  },
  'GV.PO': {
    name: 'Policy',
    description: 'Organizational cybersecurity policy is established, communicated, and enforced.',
    function: 'GOVERN',
  },
  'GV.OV': {
    name: 'Oversight',
    description: 'Results of organization-wide cybersecurity risk management activities and performance are used to inform, improve, and adjust the risk management strategy.',
    function: 'GOVERN',
  },
  'GV.SC': {
    name: 'Cybersecurity Supply Chain Risk Management',
    description: 'Cyber supply chain risk management processes are identified, established, managed, monitored, and improved by organizational stakeholders.',
    function: 'GOVERN',
  },
  // IDENTIFY
  'ID.AM': {
    name: 'Asset Management',
    description: 'Assets (e.g., data, hardware, software, systems, facilities, services, people) that enable the organization to achieve business purposes are identified and managed consistent with their relative importance to organizational objectives and the organization\'s risk strategy.',
    function: 'IDENTIFY',
  },
  'ID.RA': {
    name: 'Risk Assessment',
    description: 'The cybersecurity risk to the organization, assets, and individuals is understood.',
    function: 'IDENTIFY',
  },
  'ID.IM': {
    name: 'Improvement',
    description: 'Improvements to organizational cybersecurity risk management processes, procedures, and activities are identified across all CSF Functions.',
    function: 'IDENTIFY',
  },
  // PROTECT
  'PR.AA': {
    name: 'Identity Management, Authentication, and Access Control',
    description: 'Access to physical and logical assets is limited to authorized users, processes, and devices, and is managed consistent with the assessed risk of unauthorized access.',
    function: 'PROTECT',
  },
  'PR.AT': {
    name: 'Awareness and Training',
    description: 'The organization\'s personnel are provided with cybersecurity awareness and training so that they can perform their cybersecurity-related tasks.',
    function: 'PROTECT',
  },
  'PR.DS': {
    name: 'Data Security',
    description: 'Data are managed consistent with the organization\'s risk strategy to protect the confidentiality, integrity, and availability of information.',
    function: 'PROTECT',
  },
  'PR.PS': {
    name: 'Platform Security',
    description: 'The hardware, software (e.g., firmware, operating systems, applications), and services of physical and virtual platforms are managed consistent with the organization\'s risk strategy to protect their confidentiality, integrity, and availability.',
    function: 'PROTECT',
  },
  'PR.IR': {
    name: 'Technology Infrastructure Resilience',
    description: 'Security architectures are managed with the organization\'s risk strategy to protect asset confidentiality, integrity, and availability, and organizational resilience.',
    function: 'PROTECT',
  },
  // DETECT
  'DE.CM': {
    name: 'Continuous Monitoring',
    description: 'Assets are monitored to find anomalies, indicators of compromise, and other potentially adverse events.',
    function: 'DETECT',
  },
  'DE.AE': {
    name: 'Adverse Event Analysis',
    description: 'Anomalies, indicators of compromise, and other potentially adverse events are analyzed to characterize the events and detect cybersecurity incidents.',
    function: 'DETECT',
  },
  // RESPOND
  'RS.MA': {
    name: 'Incident Management',
    description: 'Responses to detected cybersecurity incidents are managed.',
    function: 'RESPOND',
  },
  'RS.AN': {
    name: 'Incident Analysis',
    description: 'Investigations are conducted to ensure effective response and support forensics and recovery activities.',
    function: 'RESPOND',
  },
  'RS.CO': {
    name: 'Incident Response Reporting and Communication',
    description: 'Response activities are coordinated with internal and external stakeholders as required by laws, regulations, or policies.',
    function: 'RESPOND',
  },
  'RS.MI': {
    name: 'Incident Mitigation',
    description: 'Activities are performed to prevent expansion of an event and mitigate its effects.',
    function: 'RESPOND',
  },
  // RECOVER
  'RC.RP': {
    name: 'Incident Recovery Plan Execution',
    description: 'Restoration activities are performed to ensure operational availability of systems and services affected by cybersecurity incidents.',
    function: 'RECOVER',
  },
  'RC.CO': {
    name: 'Incident Recovery Communication',
    description: 'Restoration activities are coordinated with internal and external parties.',
    function: 'RECOVER',
  },
};

/**
 * Representative NIST CSF 2.0 Subcategories (subset for implementation)
 */
const CSF_SUBCATEGORIES: CSFSubcategory[] = [
  // GOVERN - Organizational Context
  {
    id: 'csf-gv-oc-01',
    function: 'GOVERN',
    category: 'GV.OC',
    subcategoryId: 'GV.OC-01',
    title: 'Mission Understanding',
    description: 'The organizational mission is understood and informs cybersecurity risk management.',
    implementationExamples: [
      'Document how cybersecurity supports the mission',
      'Include cybersecurity in strategic planning',
      'Align security investments with business objectives',
    ],
    informativeReferences: [
      { framework: 'ISO 27001', controlId: 'A.5.1' },
      { framework: 'NIST SP 800-53', controlId: 'PM-1' },
    ],
    isNewInV2: true,
  },
  {
    id: 'csf-gv-oc-02',
    function: 'GOVERN',
    category: 'GV.OC',
    subcategoryId: 'GV.OC-02',
    title: 'Internal Stakeholder Expectations',
    description: 'Internal stakeholders provide input regarding cybersecurity expectations.',
    implementationExamples: [
      'Regular stakeholder engagement sessions',
      'Executive briefings on security posture',
      'Cross-functional security committees',
    ],
    informativeReferences: [
      { framework: 'ISO 27001', controlId: 'A.5.2' },
      { framework: 'NIST SP 800-53', controlId: 'PM-9' },
    ],
    isNewInV2: true,
  },

  // GOVERN - Risk Management Strategy
  {
    id: 'csf-gv-rm-01',
    function: 'GOVERN',
    category: 'GV.RM',
    subcategoryId: 'GV.RM-01',
    title: 'Risk Management Objectives',
    description: 'Risk management objectives are established and agreed to by organizational stakeholders.',
    implementationExamples: [
      'Documented risk appetite statement',
      'Board-approved risk tolerance levels',
      'Risk management policy aligned with objectives',
    ],
    informativeReferences: [
      { framework: 'ISO 27001', controlId: 'A.6.1' },
      { framework: 'NIST SP 800-53', controlId: 'PM-9' },
    ],
    isNewInV2: true,
  },

  // GOVERN - Supply Chain Risk Management
  {
    id: 'csf-gv-sc-01',
    function: 'GOVERN',
    category: 'GV.SC',
    subcategoryId: 'GV.SC-01',
    title: 'Supply Chain Risk Program',
    description: 'A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders.',
    implementationExamples: [
      'Third-party risk management program',
      'Vendor security assessment procedures',
      'Supply chain security requirements in contracts',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'SR-1' },
      { framework: 'ISO 27001', controlId: 'A.15.1' },
    ],
    isNewInV2: true,
  },

  // IDENTIFY - Asset Management
  {
    id: 'csf-id-am-01',
    function: 'IDENTIFY',
    category: 'ID.AM',
    subcategoryId: 'ID.AM-01',
    title: 'Hardware Inventory',
    description: 'Inventories of hardware managed by the organization are maintained.',
    implementationExamples: [
      'Automated asset discovery tools',
      'Configuration management database (CMDB)',
      'Regular asset inventory audits',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'CM-8' },
      { framework: 'ISO 27001', controlId: 'A.8.1' },
      { framework: 'CIS Controls', controlId: '1.1' },
    ],
    isNewInV2: false,
  },
  {
    id: 'csf-id-am-02',
    function: 'IDENTIFY',
    category: 'ID.AM',
    subcategoryId: 'ID.AM-02',
    title: 'Software Inventory',
    description: 'Inventories of software, services, and systems managed by the organization are maintained.',
    implementationExamples: [
      'Software asset management (SAM) tools',
      'Application portfolio management',
      'SaaS inventory and management',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'CM-8' },
      { framework: 'ISO 27001', controlId: 'A.8.1' },
      { framework: 'CIS Controls', controlId: '2.1' },
    ],
    isNewInV2: false,
  },

  // IDENTIFY - Risk Assessment
  {
    id: 'csf-id-ra-01',
    function: 'IDENTIFY',
    category: 'ID.RA',
    subcategoryId: 'ID.RA-01',
    title: 'Vulnerability Identification',
    description: 'Vulnerabilities in assets are identified, validated, and recorded.',
    implementationExamples: [
      'Regular vulnerability scanning',
      'Penetration testing program',
      'Vulnerability disclosure program',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'RA-5' },
      { framework: 'ISO 27001', controlId: 'A.12.6' },
      { framework: 'CIS Controls', controlId: '7.1' },
    ],
    isNewInV2: false,
  },
  {
    id: 'csf-id-ra-02',
    function: 'IDENTIFY',
    category: 'ID.RA',
    subcategoryId: 'ID.RA-02',
    title: 'Threat Intelligence',
    description: 'Cyber threat intelligence is received from information sharing forums and sources.',
    implementationExamples: [
      'Threat intelligence feeds',
      'ISAC/ISAO membership',
      'Threat intelligence platform integration',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'PM-16' },
      { framework: 'ISO 27001', controlId: 'A.6.1.4' },
    ],
    isNewInV2: false,
  },

  // PROTECT - Identity Management
  {
    id: 'csf-pr-aa-01',
    function: 'PROTECT',
    category: 'PR.AA',
    subcategoryId: 'PR.AA-01',
    title: 'Identity Management',
    description: 'Identities and credentials for authorized users, services, and hardware are managed by the organization.',
    implementationExamples: [
      'Centralized identity management system',
      'Credential lifecycle management',
      'Service account management',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'IA-1' },
      { framework: 'ISO 27001', controlId: 'A.9.2' },
      { framework: 'CIS Controls', controlId: '5.1' },
    ],
    isNewInV2: false,
  },
  {
    id: 'csf-pr-aa-03',
    function: 'PROTECT',
    category: 'PR.AA',
    subcategoryId: 'PR.AA-03',
    title: 'Multi-Factor Authentication',
    description: 'Users, services, and hardware are authenticated.',
    implementationExamples: [
      'MFA for all remote access',
      'Certificate-based authentication',
      'Hardware security keys',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'IA-2' },
      { framework: 'ISO 27001', controlId: 'A.9.4' },
      { framework: 'CIS Controls', controlId: '6.3' },
    ],
    isNewInV2: false,
  },

  // PROTECT - Data Security
  {
    id: 'csf-pr-ds-01',
    function: 'PROTECT',
    category: 'PR.DS',
    subcategoryId: 'PR.DS-01',
    title: 'Data-at-Rest Protection',
    description: 'The confidentiality, integrity, and availability of data-at-rest are protected.',
    implementationExamples: [
      'Full disk encryption',
      'Database encryption',
      'Encrypted backups',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'SC-28' },
      { framework: 'ISO 27001', controlId: 'A.8.24' },
      { framework: 'CIS Controls', controlId: '3.11' },
    ],
    isNewInV2: false,
  },
  {
    id: 'csf-pr-ds-02',
    function: 'PROTECT',
    category: 'PR.DS',
    subcategoryId: 'PR.DS-02',
    title: 'Data-in-Transit Protection',
    description: 'The confidentiality, integrity, and availability of data-in-transit are protected.',
    implementationExamples: [
      'TLS 1.3 for all communications',
      'VPN for remote access',
      'End-to-end encryption for sensitive data',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'SC-8' },
      { framework: 'ISO 27001', controlId: 'A.13.2' },
      { framework: 'CIS Controls', controlId: '3.10' },
    ],
    isNewInV2: false,
  },

  // PROTECT - Platform Security
  {
    id: 'csf-pr-ps-01',
    function: 'PROTECT',
    category: 'PR.PS',
    subcategoryId: 'PR.PS-01',
    title: 'Secure Configuration',
    description: 'Configuration management practices are established and applied.',
    implementationExamples: [
      'Hardening baselines (CIS Benchmarks)',
      'Infrastructure as Code',
      'Configuration drift detection',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'CM-2' },
      { framework: 'ISO 27001', controlId: 'A.8.9' },
      { framework: 'CIS Controls', controlId: '4.1' },
    ],
    isNewInV2: false,
  },

  // DETECT - Continuous Monitoring
  {
    id: 'csf-de-cm-01',
    function: 'DETECT',
    category: 'DE.CM',
    subcategoryId: 'DE.CM-01',
    title: 'Network Monitoring',
    description: 'Networks and network services are monitored to find potentially adverse events.',
    implementationExamples: [
      'Network intrusion detection (NIDS)',
      'NetFlow analysis',
      'DNS monitoring',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'SI-4' },
      { framework: 'ISO 27001', controlId: 'A.12.4' },
      { framework: 'CIS Controls', controlId: '13.1' },
    ],
    isNewInV2: false,
  },
  {
    id: 'csf-de-cm-03',
    function: 'DETECT',
    category: 'DE.CM',
    subcategoryId: 'DE.CM-03',
    title: 'Personnel Activity Monitoring',
    description: 'Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events.',
    implementationExamples: [
      'User behavior analytics (UBA)',
      'Endpoint detection and response (EDR)',
      'SIEM implementation',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'AU-6' },
      { framework: 'ISO 27001', controlId: 'A.12.4' },
      { framework: 'CIS Controls', controlId: '8.11' },
    ],
    isNewInV2: false,
  },

  // DETECT - Adverse Event Analysis
  {
    id: 'csf-de-ae-02',
    function: 'DETECT',
    category: 'DE.AE',
    subcategoryId: 'DE.AE-02',
    title: 'Event Correlation',
    description: 'Potentially adverse events are analyzed to understand the attack targets and methods.',
    implementationExamples: [
      'SIEM correlation rules',
      'Machine learning-based detection',
      'Threat hunting program',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'SI-4' },
      { framework: 'ISO 27001', controlId: 'A.12.4' },
    ],
    isNewInV2: false,
  },

  // RESPOND - Incident Management
  {
    id: 'csf-rs-ma-01',
    function: 'RESPOND',
    category: 'RS.MA',
    subcategoryId: 'RS.MA-01',
    title: 'Incident Response Plan',
    description: 'The incident response plan is executed in coordination with relevant third parties once an incident is declared.',
    implementationExamples: [
      'Documented incident response procedures',
      'Incident response team (IRT)',
      'Third-party coordination protocols',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'IR-4' },
      { framework: 'ISO 27001', controlId: 'A.16.1' },
      { framework: 'CIS Controls', controlId: '17.1' },
    ],
    isNewInV2: false,
  },
  {
    id: 'csf-rs-ma-02',
    function: 'RESPOND',
    category: 'RS.MA',
    subcategoryId: 'RS.MA-02',
    title: 'Incident Triage',
    description: 'Incidents are triaged and escalated or downgraded based on their severity.',
    implementationExamples: [
      'Severity classification matrix',
      'Escalation procedures',
      'Automated triage tools',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'IR-5' },
      { framework: 'ISO 27001', controlId: 'A.16.1.4' },
    ],
    isNewInV2: true,
  },

  // RESPOND - Incident Mitigation
  {
    id: 'csf-rs-mi-01',
    function: 'RESPOND',
    category: 'RS.MI',
    subcategoryId: 'RS.MI-01',
    title: 'Incident Containment',
    description: 'Incidents are contained.',
    implementationExamples: [
      'Network isolation procedures',
      'Account lockout capabilities',
      'Endpoint quarantine',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'IR-4' },
      { framework: 'ISO 27001', controlId: 'A.16.1.5' },
    ],
    isNewInV2: false,
  },

  // RECOVER - Recovery Plan Execution
  {
    id: 'csf-rc-rp-01',
    function: 'RECOVER',
    category: 'RC.RP',
    subcategoryId: 'RC.RP-01',
    title: 'Recovery Plan Execution',
    description: 'The recovery portion of the incident response plan is executed once initiated from the incident response process.',
    implementationExamples: [
      'Documented recovery procedures',
      'Recovery time objectives (RTO)',
      'Recovery point objectives (RPO)',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'CP-10' },
      { framework: 'ISO 27001', controlId: 'A.17.1' },
      { framework: 'CIS Controls', controlId: '11.1' },
    ],
    isNewInV2: false,
  },

  // RECOVER - Communication
  {
    id: 'csf-rc-co-01',
    function: 'RECOVER',
    category: 'RC.CO',
    subcategoryId: 'RC.CO-01',
    title: 'Recovery Communication',
    description: 'Public relations are managed.',
    implementationExamples: [
      'Crisis communication plan',
      'Stakeholder notification procedures',
      'Media response protocols',
    ],
    informativeReferences: [
      { framework: 'NIST SP 800-53', controlId: 'IR-4' },
      { framework: 'ISO 27001', controlId: 'A.16.1.6' },
    ],
    isNewInV2: false,
  },
];

// ============================================================================
// NIST CSF Controls Service
// ============================================================================

export class NISTCSFControlsService extends EventEmitter {
  private static instance: NISTCSFControlsService | null = null;
  private subcategories: Map<string, CSFSubcategory>;
  private profiles: Map<string, CSFProfile[]>;
  private gapAnalyses: Map<string, GapAnalysis[]>;
  private maturityAssessments: Map<string, MaturityAssessment[]>;
  private config: NISTCSFConfig;

  private constructor(config?: Partial<NISTCSFConfig>) {
    super();
    this.subcategories = new Map();
    this.profiles = new Map();
    this.gapAnalyses = new Map();
    this.maturityAssessments = new Map();
    this.config = {
      enableCommunityProfiles: true,
      defaultTargetTier: 3,
      enableCrossFrameworkMapping: true,
      ...config,
    };
    this.loadSubcategories();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<NISTCSFConfig>): NISTCSFControlsService {
    if (!NISTCSFControlsService.instance) {
      NISTCSFControlsService.instance = new NISTCSFControlsService(config);
    }
    return NISTCSFControlsService.instance;
  }

  /**
   * Load subcategories into memory
   */
  private loadSubcategories(): void {
    for (const sub of CSF_SUBCATEGORIES) {
      this.subcategories.set(sub.id, sub);
    }
  }

  /**
   * Get all subcategories
   */
  public getAllSubcategories(): DataEnvelope<CSFSubcategory[]> {
    const subcategories = Array.from(this.subcategories.values());

    return createDataEnvelope(subcategories, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${subcategories.length} NIST CSF subcategories`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get subcategories by function
   */
  public getSubcategoriesByFunction(func: CSFFunction): DataEnvelope<CSFSubcategory[]> {
    const subcategories = Array.from(this.subcategories.values())
      .filter((s) => s.function === func);

    return createDataEnvelope(subcategories, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${subcategories.length} subcategories for ${func}`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get subcategories by category
   */
  public getSubcategoriesByCategory(category: CSFCategory): DataEnvelope<CSFSubcategory[]> {
    const subcategories = Array.from(this.subcategories.values())
      .filter((s) => s.category === category);

    return createDataEnvelope(subcategories, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${subcategories.length} subcategories for ${category}`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get new v2.0 subcategories
   */
  public getNewV2Subcategories(): DataEnvelope<CSFSubcategory[]> {
    const subcategories = Array.from(this.subcategories.values())
      .filter((s) => s.isNewInV2);

    return createDataEnvelope(subcategories, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${subcategories.length} new v2.0 subcategories`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Create a CSF profile
   */
  public createProfile(
    tenantId: string,
    profile: Omit<CSFProfile, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): DataEnvelope<CSFProfile> {
    const newProfile: CSFProfile = {
      ...profile,
      id: `profile-${Date.now()}`,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tenantProfiles = this.profiles.get(tenantId) || [];
    tenantProfiles.push(newProfile);
    this.profiles.set(tenantId, tenantProfiles);

    this.emit('profileCreated', { tenantId, profile: newProfile });

    return createDataEnvelope(newProfile, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Profile "${newProfile.name}" created successfully`),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get profiles for tenant
   */
  public getProfiles(tenantId: string): DataEnvelope<CSFProfile[]> {
    const profiles = this.profiles.get(tenantId) || [];

    return createDataEnvelope(profiles, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${profiles.length} profile(s)`),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Update subcategory status in profile
   */
  public updateSubcategoryStatus(
    tenantId: string,
    profileId: string,
    subcategoryId: string,
    status: Partial<SubcategoryStatus>
  ): DataEnvelope<CSFProfile | null> {
    const tenantProfiles = this.profiles.get(tenantId) || [];
    const profileIndex = tenantProfiles.findIndex((p) => p.id === profileId);

    if (profileIndex < 0) {
      return createDataEnvelope(null, {
        source: 'NISTCSFControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, `Profile ${profileId} not found`),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    const profile = tenantProfiles[profileIndex];
    const statusIndex = profile.subcategoryStatuses.findIndex(
      (s) => s.subcategoryId === subcategoryId
    );

    if (statusIndex >= 0) {
      profile.subcategoryStatuses[statusIndex] = {
        ...profile.subcategoryStatuses[statusIndex],
        ...status,
      };
    } else {
      profile.subcategoryStatuses.push({
        subcategoryId,
        currentState: 'not_implemented',
        targetState: 'fully_implemented',
        gap: 100,
        priority: 3,
        notes: '',
        ...status,
      });
    }

    profile.updatedAt = new Date();
    tenantProfiles[profileIndex] = profile;
    this.profiles.set(tenantId, tenantProfiles);

    this.emit('profileUpdated', { tenantId, profile });

    return createDataEnvelope(profile, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Subcategory status updated'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Perform gap analysis between current and target profiles
   */
  public performGapAnalysis(
    tenantId: string,
    currentProfileId: string,
    targetProfileId: string
  ): DataEnvelope<GapAnalysis> {
    const tenantProfiles = this.profiles.get(tenantId) || [];
    const currentProfile = tenantProfiles.find((p) => p.id === currentProfileId);
    const targetProfile = tenantProfiles.find((p) => p.id === targetProfileId);

    if (!currentProfile || !targetProfile) {
      return createDataEnvelope(null as unknown as GapAnalysis, {
        source: 'NISTCSFControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'One or both profiles not found'),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    // Calculate gaps by function
    const functionGaps: FunctionGap[] = [];
    const functions: CSFFunction[] = ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'];

    for (const func of functions) {
      const funcSubcategories = Array.from(this.subcategories.values())
        .filter((s) => s.function === func);

      const categoryGaps: CategoryGap[] = [];
      const categories = FUNCTION_METADATA[func].categories;

      for (const cat of categories) {
        const catSubcategories = funcSubcategories.filter((s) => s.category === cat);
        const subcategoryGaps = catSubcategories.map((sub) => {
          const currentStatus = currentProfile.subcategoryStatuses.find(
            (s) => s.subcategoryId === sub.subcategoryId
          );
          const targetStatus = targetProfile.subcategoryStatuses.find(
            (s) => s.subcategoryId === sub.subcategoryId
          );

          return {
            subcategoryId: sub.subcategoryId,
            currentState: currentStatus?.currentState || 'not_implemented',
            targetState: targetStatus?.targetState || 'fully_implemented',
            gap: this.calculateStateGap(
              currentStatus?.currentState || 'not_implemented',
              targetStatus?.targetState || 'fully_implemented'
            ),
          };
        });

        const avgGap = subcategoryGaps.length > 0
          ? subcategoryGaps.reduce((sum, g) => sum + g.gap, 0) / subcategoryGaps.length
          : 0;

        categoryGaps.push({
          category: cat,
          currentScore: 100 - avgGap,
          targetScore: 100,
          gap: avgGap,
          subcategoryGaps,
        });
      }

      const funcAvgGap = categoryGaps.length > 0
        ? categoryGaps.reduce((sum, g) => sum + g.gap, 0) / categoryGaps.length
        : 0;

      functionGaps.push({
        function: func,
        currentScore: 100 - funcAvgGap,
        targetScore: 100,
        gap: funcAvgGap,
        categoryGaps,
      });
    }

    const overallGap = functionGaps.reduce((sum, g) => sum + g.gap, 0) / functionGaps.length;

    // Generate prioritized actions
    const prioritizedActions: PrioritizedAction[] = functionGaps
      .flatMap((fg) => fg.categoryGaps)
      .flatMap((cg) => cg.subcategoryGaps)
      .filter((sg) => sg.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 20)
      .map((sg, idx) => ({
        id: `action-${idx}`,
        subcategoryId: sg.subcategoryId,
        action: `Implement ${sg.subcategoryId} to reach target state`,
        priority: idx + 1,
        effort: sg.gap > 75 ? 'high' : sg.gap > 50 ? 'medium' : 'low' as 'low' | 'medium' | 'high',
        impact: 'high' as const,
        dependencies: [],
      }));

    const gapAnalysis: GapAnalysis = {
      id: `gap-${Date.now()}`,
      tenantId,
      currentProfileId,
      targetProfileId,
      analyzedAt: new Date(),
      overallGap,
      functionGaps,
      prioritizedActions,
    };

    const tenantAnalyses = this.gapAnalyses.get(tenantId) || [];
    tenantAnalyses.push(gapAnalysis);
    this.gapAnalyses.set(tenantId, tenantAnalyses);

    this.emit('gapAnalysisCompleted', { tenantId, gapAnalysis });

    return createDataEnvelope(gapAnalysis, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Gap analysis completed: ${overallGap.toFixed(1)}% overall gap`),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Calculate gap between implementation states
   */
  private calculateStateGap(current: ImplementationState, target: ImplementationState): number {
    const stateValues: Record<ImplementationState, number> = {
      not_implemented: 0,
      partially_implemented: 33,
      largely_implemented: 66,
      fully_implemented: 100,
      not_applicable: 100,
    };

    const currentValue = stateValues[current];
    const targetValue = stateValues[target];

    return Math.max(0, targetValue - currentValue);
  }

  /**
   * Assess maturity tier
   */
  public assessMaturity(tenantId: string): DataEnvelope<MaturityAssessment> {
    const tenantProfiles = this.profiles.get(tenantId) || [];
    const currentProfile = tenantProfiles.find((p) => p.type === 'current');

    if (!currentProfile) {
      return createDataEnvelope(null as unknown as MaturityAssessment, {
        source: 'NISTCSFControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'No current profile found for maturity assessment'),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    // Calculate tier for each function
    const functionTiers: Record<CSFFunction, ImplementationTier> = {
      GOVERN: 1,
      IDENTIFY: 1,
      PROTECT: 1,
      DETECT: 1,
      RESPOND: 1,
      RECOVER: 1,
    };

    const functions: CSFFunction[] = ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'];

    for (const func of functions) {
      const funcSubcategories = Array.from(this.subcategories.values())
        .filter((s) => s.function === func);

      const statuses = funcSubcategories.map((sub) =>
        currentProfile.subcategoryStatuses.find((s) => s.subcategoryId === sub.subcategoryId)
      );

      const implementedCount = statuses.filter(
        (s) => s?.currentState === 'fully_implemented' || s?.currentState === 'largely_implemented'
      ).length;

      const implementationRatio = funcSubcategories.length > 0
        ? implementedCount / funcSubcategories.length
        : 0;

      if (implementationRatio >= 0.9) {
        functionTiers[func] = 4;
      } else if (implementationRatio >= 0.7) {
        functionTiers[func] = 3;
      } else if (implementationRatio >= 0.4) {
        functionTiers[func] = 2;
      } else {
        functionTiers[func] = 1;
      }
    }

    // Overall tier is the minimum across functions
    const overallTier = Math.min(...Object.values(functionTiers)) as ImplementationTier;

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    for (const func of functions) {
      if (functionTiers[func] >= 3) {
        strengths.push(`Strong ${FUNCTION_METADATA[func].name} capabilities (Tier ${functionTiers[func]})`);
      } else if (functionTiers[func] === 1) {
        weaknesses.push(`${FUNCTION_METADATA[func].name} function needs significant improvement`);
        recommendations.push(`Prioritize ${FUNCTION_METADATA[func].name} function improvements`);
      }
    }

    if (overallTier < this.config.defaultTargetTier) {
      recommendations.push(`Work toward Tier ${this.config.defaultTargetTier} implementation across all functions`);
    }

    const assessment: MaturityAssessment = {
      id: `maturity-${Date.now()}`,
      tenantId,
      assessedAt: new Date(),
      overallTier,
      functionTiers,
      strengths,
      weaknesses,
      recommendations,
    };

    const tenantAssessments = this.maturityAssessments.get(tenantId) || [];
    tenantAssessments.push(assessment);
    this.maturityAssessments.set(tenantId, tenantAssessments);

    this.emit('maturityAssessed', { tenantId, assessment });

    return createDataEnvelope(assessment, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Maturity assessment completed: Tier ${overallTier} (${TIER_DESCRIPTIONS[overallTier].name})`),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get function metadata
   */
  public getFunctionMetadata(func: CSFFunction): DataEnvelope<typeof FUNCTION_METADATA[CSFFunction]> {
    const metadata = FUNCTION_METADATA[func];

    return createDataEnvelope(metadata, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Function metadata retrieved'),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get category metadata
   */
  public getCategoryMetadata(category: CSFCategory): DataEnvelope<typeof CATEGORY_METADATA[CSFCategory]> {
    const metadata = CATEGORY_METADATA[category];

    return createDataEnvelope(metadata, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Category metadata retrieved'),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get tier description
   */
  public getTierDescription(tier: ImplementationTier): DataEnvelope<typeof TIER_DESCRIPTIONS[ImplementationTier]> {
    const description = TIER_DESCRIPTIONS[tier];

    return createDataEnvelope(description, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Tier description retrieved'),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get cross-framework references for a subcategory
   */
  public getCrossFrameworkReferences(subcategoryId: string): DataEnvelope<InformativeReference[]> {
    const subcategory = Array.from(this.subcategories.values())
      .find((s) => s.subcategoryId === subcategoryId);

    if (!subcategory) {
      return createDataEnvelope([], {
        source: 'NISTCSFControlsService',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, `Subcategory ${subcategoryId} not found`),
        classification: DataClassification.PUBLIC,
      });
    }

    return createDataEnvelope(subcategory.informativeReferences, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${subcategory.informativeReferences.length} cross-framework references`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get service statistics
   */
  public getStats(tenantId: string): DataEnvelope<NISTCSFStats> {
    const tenantProfiles = this.profiles.get(tenantId) || [];
    const tenantAnalyses = this.gapAnalyses.get(tenantId) || [];
    const tenantAssessments = this.maturityAssessments.get(tenantId) || [];

    const latestAssessment = tenantAssessments.length > 0
      ? tenantAssessments[tenantAssessments.length - 1]
      : null;

    const functionCoverage: Record<CSFFunction, number> = {
      GOVERN: 0,
      IDENTIFY: 0,
      PROTECT: 0,
      DETECT: 0,
      RESPOND: 0,
      RECOVER: 0,
    };

    // Calculate coverage from current profile
    const currentProfile = tenantProfiles.find((p) => p.type === 'current');
    if (currentProfile) {
      const functions: CSFFunction[] = ['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER'];
      for (const func of functions) {
        const funcSubs = Array.from(this.subcategories.values()).filter((s) => s.function === func);
        const implemented = currentProfile.subcategoryStatuses.filter(
          (s) => funcSubs.some((fs) => fs.subcategoryId === s.subcategoryId) &&
            (s.currentState === 'fully_implemented' || s.currentState === 'largely_implemented')
        ).length;
        functionCoverage[func] = funcSubs.length > 0 ? (implemented / funcSubs.length) * 100 : 0;
      }
    }

    const averageTier = latestAssessment
      ? Object.values(latestAssessment.functionTiers).reduce((a, b) => a + b, 0) / 6
      : 0;

    const stats: NISTCSFStats = {
      totalSubcategories: this.subcategories.size,
      profileCount: tenantProfiles.length,
      averageTier,
      gapAnalysesPerformed: tenantAnalyses.length,
      functionCoverage,
    };

    return createDataEnvelope(stats, {
      source: 'NISTCSFControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'NIST CSF statistics retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let serviceInstance: NISTCSFControlsService | null = null;

export function getNISTCSFControlsService(
  config?: Partial<NISTCSFConfig>
): NISTCSFControlsService {
  if (!serviceInstance) {
    serviceInstance = NISTCSFControlsService.getInstance(config);
  }
  return serviceInstance;
}
