/**
 * PCI-DSS v4.0 Compliance Controls
 *
 * Payment Card Industry Data Security Standard controls and requirements.
 * Covers all 12 principal requirements with sub-requirements.
 *
 * SOC 2 Controls: CC6.1 (Logical Access), CC6.6 (Encryption), CC6.7 (Financial Processing)
 *
 * @module compliance/frameworks/PCIDSSControls
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createDataEnvelope, GovernanceResult, DataClassification } from '../../types/data-envelope.js';
import type { DataEnvelope, GovernanceVerdict } from '../../types/data-envelope.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * PCI-DSS requirement category (12 principal requirements)
 */
export type PCIDSSRequirement =
  | 'Requirement1'   // Install and maintain network security controls
  | 'Requirement2'   // Apply secure configurations
  | 'Requirement3'   // Protect stored account data
  | 'Requirement4'   // Protect cardholder data with strong cryptography during transmission
  | 'Requirement5'   // Protect all systems and networks from malicious software
  | 'Requirement6'   // Develop and maintain secure systems and software
  | 'Requirement7'   // Restrict access to system components and cardholder data
  | 'Requirement8'   // Identify users and authenticate access to system components
  | 'Requirement9'   // Restrict physical access to cardholder data
  | 'Requirement10'  // Log and monitor all access to system components and cardholder data
  | 'Requirement11'  // Test security of systems and networks regularly
  | 'Requirement12'; // Support information security with organizational policies and programs

/**
 * PCI-DSS goal categories
 */
export type PCIDSSGoal =
  | 'BuildSecureNetwork'
  | 'ProtectCardholderData'
  | 'VulnerabilityManagement'
  | 'AccessControl'
  | 'MonitorAndTest'
  | 'InformationSecurityPolicy';

/**
 * Applicability based on SAQ type
 */
export type SAQType = 'SAQ-A' | 'SAQ-A-EP' | 'SAQ-B' | 'SAQ-B-IP' | 'SAQ-C' | 'SAQ-C-VT' | 'SAQ-D' | 'SAQ-P2PE';

/**
 * Control applicability
 */
export type ControlApplicability = 'required' | 'conditional' | 'not_applicable';

/**
 * Testing procedure types
 */
export type TestingMethod = 'examine' | 'interview' | 'observe' | 'test';

/**
 * PCI-DSS control definition
 */
export interface PCIDSSControl {
  id: string;
  requirementNumber: PCIDSSRequirement;
  subRequirement: string;
  goal: PCIDSSGoal;
  title: string;
  description: string;
  guidanceNotes: string[];
  testingProcedures: TestingProcedure[];
  definedApproach: DefinedApproach;
  customizedApproach: CustomizedApproach | null;
  applicability: SAQApplicability[];
  relatedRequirements: string[];
  effectiveDate: Date;
  isNewInV4: boolean;
}

/**
 * Testing procedure for control validation
 */
export interface TestingProcedure {
  id: string;
  method: TestingMethod;
  description: string;
  expectedEvidence: string[];
}

/**
 * Defined approach (prescriptive method)
 */
export interface DefinedApproach {
  requirements: string[];
  implementationGuidance: string[];
}

/**
 * Customized approach (outcome-based)
 */
export interface CustomizedApproach {
  objective: string;
  acceptanceCriteria: string[];
  documentationRequirements: string[];
}

/**
 * SAQ applicability mapping
 */
export interface SAQApplicability {
  saqType: SAQType;
  applicability: ControlApplicability;
  notes?: string;
}

/**
 * Control implementation record
 */
export interface ControlImplementation {
  controlId: string;
  tenantId: string;
  status: ImplementationStatus;
  approachUsed: 'defined' | 'customized';
  evidence: ImplementationEvidence[];
  compensatingControls?: CompensatingControl[];
  lastAssessedAt: Date;
  nextAssessmentDue: Date;
  assessorNotes: string;
}

export type ImplementationStatus = 'in_place' | 'in_place_with_ccw' | 'not_applicable' | 'not_in_place' | 'not_tested';

/**
 * Implementation evidence
 */
export interface ImplementationEvidence {
  id: string;
  type: 'document' | 'screenshot' | 'log' | 'configuration' | 'interview_notes';
  title: string;
  description: string;
  collectedAt: Date;
  expiresAt?: Date;
}

/**
 * Compensating control worksheet
 */
export interface CompensatingControl {
  id: string;
  originalRequirement: string;
  constraintsAndLimitations: string;
  objectiveOfOriginal: string;
  compensatingControlDescription: string;
  validationProcedure: string;
  maintenanceRequirements: string;
  riskAnalysis: string;
  approvedBy?: string;
  approvedAt?: Date;
}

/**
 * Cardholder data environment scope
 */
export interface CDEScope {
  id: string;
  tenantId: string;
  systems: CDESystem[];
  dataFlows: CardholderDataFlow[];
  networkSegments: NetworkSegment[];
  thirdParties: ThirdPartyConnection[];
  lastScopeReview: Date;
  nextScopeReview: Date;
}

/**
 * System in CDE scope
 */
export interface CDESystem {
  id: string;
  name: string;
  category: 'cde' | 'connected' | 'security_impacting' | 'out_of_scope';
  systemType: string;
  ipAddresses: string[];
  dataStored: CardholderDataElement[];
  securityControls: string[];
}

/**
 * Cardholder data elements
 */
export type CardholderDataElement =
  | 'PAN'           // Primary Account Number
  | 'cardholder_name'
  | 'expiration_date'
  | 'service_code'
  | 'full_track_data'
  | 'CAV2_CVC2_CVV2_CID'
  | 'PIN_PIN_block';

/**
 * Cardholder data flow
 */
export interface CardholderDataFlow {
  id: string;
  name: string;
  sourceSystem: string;
  destinationSystem: string;
  dataElements: CardholderDataElement[];
  transmissionMethod: string;
  encryptionMethod: string;
  protocol: string;
}

/**
 * Network segment definition
 */
export interface NetworkSegment {
  id: string;
  name: string;
  vlan?: string;
  cidrRange: string;
  segmentationType: 'physical' | 'logical' | 'virtual';
  accessControls: string[];
}

/**
 * Third-party connection
 */
export interface ThirdPartyConnection {
  id: string;
  vendorName: string;
  connectionType: string;
  dataShared: CardholderDataElement[];
  pciComplianceLevel: 1 | 2 | 3 | 4;
  aocOnFile: boolean;
  aocExpirationDate?: Date;
}

/**
 * PCI-DSS assessment report
 */
export interface PCIDSSAssessment {
  id: string;
  tenantId: string;
  assessmentType: 'self' | 'qsa' | 'isa';
  saqType: SAQType;
  assessmentPeriod: {
    start: Date;
    end: Date;
  };
  overallCompliance: ComplianceStatus;
  requirementResults: RequirementResult[];
  cdeScope: CDEScope;
  compensatingControlsUsed: number;
  exceptionsNoted: AssessmentException[];
  remediationPlan?: RemediationPlan;
  attestationDate?: Date;
}

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'partially_compliant';

/**
 * Requirement-level result
 */
export interface RequirementResult {
  requirement: PCIDSSRequirement;
  status: ComplianceStatus;
  controlsAssessed: number;
  controlsCompliant: number;
  controlsNonCompliant: number;
  controlsNotApplicable: number;
  findings: AssessmentFinding[];
}

/**
 * Assessment finding
 */
export interface AssessmentFinding {
  id: string;
  controlId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedSystems: string[];
  recommendedRemediation: string;
  targetRemediationDate: Date;
}

/**
 * Assessment exception
 */
export interface AssessmentException {
  id: string;
  controlId: string;
  reason: string;
  compensatingControlId?: string;
  approvedBy: string;
  approvedAt: Date;
  expiresAt: Date;
}

/**
 * Remediation plan
 */
export interface RemediationPlan {
  id: string;
  findings: RemediationItem[];
  targetCompletionDate: Date;
  responsibleParty: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
}

/**
 * Remediation item
 */
export interface RemediationItem {
  findingId: string;
  action: string;
  priority: number;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  completedAt?: Date;
}

/**
 * Service configuration
 */
export interface PCIDSSConfig {
  enableAutomatedEvidence: boolean;
  scopeReviewIntervalDays: number;
  assessmentReminderDays: number;
  requireQSAForLevel1: boolean;
}

/**
 * Service statistics
 */
export interface PCIDSSStats {
  totalControls: number;
  implementedControls: number;
  pendingControls: number;
  compensatingControls: number;
  lastAssessmentDate: Date | null;
  nextAssessmentDue: Date | null;
  cdeSystemCount: number;
  dataFlowCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'pci-dss-compliance-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'PCIDSSControls',
  };
}

// ============================================================================
// PCI-DSS Controls Data
// ============================================================================

/**
 * Requirement metadata
 */
export const REQUIREMENT_METADATA: Record<PCIDSSRequirement, {
  number: number;
  title: string;
  goal: PCIDSSGoal;
  description: string;
}> = {
  Requirement1: {
    number: 1,
    title: 'Install and Maintain Network Security Controls',
    goal: 'BuildSecureNetwork',
    description: 'Network security controls (NSCs), such as firewalls and other network security technologies, are network policy enforcement points that typically control network traffic between two or more logical or physical network segments.',
  },
  Requirement2: {
    number: 2,
    title: 'Apply Secure Configurations to All System Components',
    goal: 'BuildSecureNetwork',
    description: 'Malicious individuals exploit vendor default settings and credentials to access systems. These defaults are often publicly known and can allow attackers to gain unauthorized access.',
  },
  Requirement3: {
    number: 3,
    title: 'Protect Stored Account Data',
    goal: 'ProtectCardholderData',
    description: 'Protection methods such as encryption, truncation, masking, and hashing are critical components of cardholder data protection.',
  },
  Requirement4: {
    number: 4,
    title: 'Protect Cardholder Data with Strong Cryptography During Transmission',
    goal: 'ProtectCardholderData',
    description: 'Sensitive information must be encrypted during transmission over networks that are easily accessed by malicious individuals.',
  },
  Requirement5: {
    number: 5,
    title: 'Protect All Systems and Networks from Malicious Software',
    goal: 'VulnerabilityManagement',
    description: 'Malicious software, commonly referred to as "malware", including viruses, worms, and Trojans, is introduced through various business activities.',
  },
  Requirement6: {
    number: 6,
    title: 'Develop and Maintain Secure Systems and Software',
    goal: 'VulnerabilityManagement',
    description: 'Security vulnerabilities in systems and software may allow criminals to access PAN and other cardholder data.',
  },
  Requirement7: {
    number: 7,
    title: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
    goal: 'AccessControl',
    description: 'Unauthorized individuals may gain access to critical data or systems due to ineffective access control rules and definitions.',
  },
  Requirement8: {
    number: 8,
    title: 'Identify Users and Authenticate Access to System Components',
    goal: 'AccessControl',
    description: 'Two fundamental principles of identifying and authenticating users are to establish the identity of an individual or process on a computer system and to prove or verify that the user is who they claim to be.',
  },
  Requirement9: {
    number: 9,
    title: 'Restrict Physical Access to Cardholder Data',
    goal: 'AccessControl',
    description: 'Any physical access to cardholder data or systems that store, process, or transmit cardholder data provides the opportunity for individuals to access and/or remove devices, data, systems, or hardcopies.',
  },
  Requirement10: {
    number: 10,
    title: 'Log and Monitor All Access to System Components and Cardholder Data',
    goal: 'MonitorAndTest',
    description: 'Logging mechanisms and the ability to track user activities are critical in preventing, detecting, and minimizing the impact of a data compromise.',
  },
  Requirement11: {
    number: 11,
    title: 'Test Security of Systems and Networks Regularly',
    goal: 'MonitorAndTest',
    description: 'Vulnerabilities are being discovered continually by malicious individuals and researchers. System components, processes, and bespoke and custom software should be tested frequently.',
  },
  Requirement12: {
    number: 12,
    title: 'Support Information Security with Organizational Policies and Programs',
    goal: 'InformationSecurityPolicy',
    description: 'A strong security policy sets the security tone for the whole entity and informs personnel what is expected of them.',
  },
};

/**
 * Goal descriptions
 */
export const GOAL_DESCRIPTIONS: Record<PCIDSSGoal, string> = {
  BuildSecureNetwork: 'Build and Maintain a Secure Network and Systems',
  ProtectCardholderData: 'Protect Cardholder Data',
  VulnerabilityManagement: 'Maintain a Vulnerability Management Program',
  AccessControl: 'Implement Strong Access Control Measures',
  MonitorAndTest: 'Regularly Monitor and Test Networks',
  InformationSecurityPolicy: 'Maintain an Information Security Policy',
};

/**
 * Representative PCI-DSS v4.0 controls (subset for implementation)
 * Full implementation would include all ~250 sub-requirements
 */
const PCI_DSS_CONTROLS: PCIDSSControl[] = [
  // Requirement 1: Network Security Controls
  {
    id: 'pci-1.1.1',
    requirementNumber: 'Requirement1',
    subRequirement: '1.1.1',
    goal: 'BuildSecureNetwork',
    title: 'Roles and Responsibilities Defined',
    description: 'All security policies and operational procedures that are identified in Requirement 1 are documented, kept up to date, in use, and known to all affected parties.',
    guidanceNotes: [
      'Document roles and responsibilities for network security control management',
      'Ensure personnel understand their responsibilities',
    ],
    testingProcedures: [
      {
        id: '1.1.1.a',
        method: 'examine',
        description: 'Examine documentation to verify that descriptions of roles and responsibilities are documented and assigned.',
        expectedEvidence: ['Security policy documents', 'Role assignment records'],
      },
      {
        id: '1.1.1.b',
        method: 'interview',
        description: 'Interview personnel to verify that roles and responsibilities are understood.',
        expectedEvidence: ['Interview notes', 'Training records'],
      },
    ],
    definedApproach: {
      requirements: [
        'Document roles and responsibilities for Requirement 1 activities',
        'Assign specific personnel to each role',
        'Communicate responsibilities to all affected parties',
      ],
      implementationGuidance: [
        'Use RACI matrices for clarity',
        'Include in security awareness training',
      ],
    },
    customizedApproach: {
      objective: 'Entities have clearly defined roles, responsibilities, and accountability for network security control management.',
      acceptanceCriteria: [
        'Accountability is clear and demonstrable',
        'Personnel can articulate their responsibilities',
      ],
      documentationRequirements: [
        'Role definitions',
        'Accountability structure',
        'Evidence of communication',
      ],
    },
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-A', applicability: 'not_applicable' },
    ],
    relatedRequirements: ['12.5.2'],
    effectiveDate: new Date('2024-03-31'),
    isNewInV4: true,
  },
  {
    id: 'pci-1.2.1',
    requirementNumber: 'Requirement1',
    subRequirement: '1.2.1',
    goal: 'BuildSecureNetwork',
    title: 'Configuration Standards for NSCs',
    description: 'Configuration standards for network security controls (NSCs) are defined, implemented, and maintained.',
    guidanceNotes: [
      'Include all types of NSCs: firewalls, routers, cloud security groups',
      'Standards should address both inbound and outbound traffic',
    ],
    testingProcedures: [
      {
        id: '1.2.1.a',
        method: 'examine',
        description: 'Examine configuration standards to verify they are defined.',
        expectedEvidence: ['Configuration standard documents', 'Baseline configurations'],
      },
      {
        id: '1.2.1.b',
        method: 'examine',
        description: 'Examine NSC configurations to verify they match standards.',
        expectedEvidence: ['Firewall configs', 'Router configs', 'Cloud security group configs'],
      },
    ],
    definedApproach: {
      requirements: [
        'Define configuration standards for all NSC types',
        'Implement configurations according to standards',
        'Review and update standards when environment changes',
      ],
      implementationGuidance: [
        'Use vendor hardening guides as starting point',
        'Implement change management for configuration changes',
      ],
    },
    customizedApproach: null,
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
    ],
    relatedRequirements: ['2.2.1'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 3: Protect Stored Account Data
  {
    id: 'pci-3.4.1',
    requirementNumber: 'Requirement3',
    subRequirement: '3.4.1',
    goal: 'ProtectCardholderData',
    title: 'PAN Rendered Unreadable',
    description: 'PAN is rendered unreadable anywhere it is stored using any of the following approaches: one-way hashes, truncation, index tokens, or strong cryptography.',
    guidanceNotes: [
      'Strong cryptography means minimum 128-bit key strength',
      'Truncation removes segments of PAN to limit exposure',
      'Index tokens and pads require secure storage of mapping tables',
    ],
    testingProcedures: [
      {
        id: '3.4.1.a',
        method: 'examine',
        description: 'Examine documentation about the system used to render PAN unreadable.',
        expectedEvidence: ['Encryption documentation', 'Key management procedures'],
      },
      {
        id: '3.4.1.b',
        method: 'examine',
        description: 'Examine data repositories to verify PAN is rendered unreadable.',
        expectedEvidence: ['Database samples', 'File storage samples'],
      },
      {
        id: '3.4.1.c',
        method: 'examine',
        description: 'Examine audit logs to verify that audit log data containing PAN is rendered unreadable.',
        expectedEvidence: ['Audit log samples'],
      },
    ],
    definedApproach: {
      requirements: [
        'Use approved method to render PAN unreadable',
        'Apply to all storage locations',
        'Include any audit logs that may contain PAN',
      ],
      implementationGuidance: [
        'AES-256 is recommended for encryption',
        'SHA-256 or stronger for hashing',
        'Truncation: max first 6 and last 4 digits',
      ],
    },
    customizedApproach: {
      objective: 'Cleartext PAN cannot be read from any storage medium.',
      acceptanceCriteria: [
        'PAN is unreadable to unauthorized personnel',
        'Controls prevent reconstruction of full PAN',
      ],
      documentationRequirements: [
        'Encryption/tokenization architecture',
        'Key management documentation',
      ],
    },
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
      { saqType: 'SAQ-A', applicability: 'not_applicable' },
    ],
    relatedRequirements: ['3.5.1', '3.6.1', '3.7.1'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 4: Protect CHD During Transmission
  {
    id: 'pci-4.2.1',
    requirementNumber: 'Requirement4',
    subRequirement: '4.2.1',
    goal: 'ProtectCardholderData',
    title: 'Strong Cryptography for Transmission',
    description: 'Strong cryptography and security protocols are implemented to safeguard PAN during transmission over open, public networks.',
    guidanceNotes: [
      'TLS 1.2 or higher is required',
      'Only trusted keys and certificates are accepted',
      'Certificate validity is verified',
    ],
    testingProcedures: [
      {
        id: '4.2.1.a',
        method: 'examine',
        description: 'Examine documented policies and procedures to verify processes are defined.',
        expectedEvidence: ['Encryption policy', 'Certificate management procedures'],
      },
      {
        id: '4.2.1.b',
        method: 'examine',
        description: 'Examine system configurations to verify strong cryptography is implemented.',
        expectedEvidence: ['TLS configurations', 'Certificate configurations'],
      },
      {
        id: '4.2.1.c',
        method: 'observe',
        description: 'Observe transmissions to verify PAN is encrypted.',
        expectedEvidence: ['Network traffic captures'],
      },
    ],
    definedApproach: {
      requirements: [
        'Use TLS 1.2 or higher for all transmissions',
        'Verify certificates before transmission',
        'Use only trusted keys and certificates',
      ],
      implementationGuidance: [
        'Disable SSL, TLS 1.0, and TLS 1.1',
        'Implement certificate pinning where possible',
        'Use strong cipher suites only',
      ],
    },
    customizedApproach: {
      objective: 'Cleartext PAN cannot be read or intercepted during transmission.',
      acceptanceCriteria: [
        'Transmission encryption is verifiable',
        'Man-in-the-middle attacks are prevented',
      ],
      documentationRequirements: [
        'Cryptographic architecture',
        'Key and certificate management',
      ],
    },
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-A-EP', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
    ],
    relatedRequirements: ['2.2.7', '4.2.2'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 5: Malware Protection
  {
    id: 'pci-5.2.1',
    requirementNumber: 'Requirement5',
    subRequirement: '5.2.1',
    goal: 'VulnerabilityManagement',
    title: 'Anti-Malware Solution Deployed',
    description: 'An anti-malware solution(s) is deployed on all system components, except for those system components identified as not commonly affected by malicious software.',
    guidanceNotes: [
      'Commonly affected systems include Windows workstations, servers',
      'Periodic evaluations required for systems claimed not at risk',
    ],
    testingProcedures: [
      {
        id: '5.2.1.a',
        method: 'examine',
        description: 'Examine anti-malware solution vendor documentation and configurations.',
        expectedEvidence: ['Vendor documentation', 'Deployment configurations'],
      },
      {
        id: '5.2.1.b',
        method: 'examine',
        description: 'Examine system components to verify anti-malware is deployed.',
        expectedEvidence: ['System inventory', 'Deployment status reports'],
      },
    ],
    definedApproach: {
      requirements: [
        'Deploy anti-malware on all commonly affected systems',
        'Document exceptions with risk evaluation',
        'Periodically re-evaluate exception decisions',
      ],
      implementationGuidance: [
        'Use enterprise-grade anti-malware solutions',
        'Ensure central management capability',
      ],
    },
    customizedApproach: null,
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
    ],
    relatedRequirements: ['5.2.2', '5.2.3'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 6: Secure Development
  {
    id: 'pci-6.2.4',
    requirementNumber: 'Requirement6',
    subRequirement: '6.2.4',
    goal: 'VulnerabilityManagement',
    title: 'Software Engineering Techniques',
    description: 'Software engineering techniques or other methods are defined and in use by software development personnel to prevent or mitigate common software attacks and related vulnerabilities.',
    guidanceNotes: [
      'Address OWASP Top 10 and similar',
      'Include injection attacks, XSS, authentication flaws',
      'Apply to bespoke and custom software',
    ],
    testingProcedures: [
      {
        id: '6.2.4.a',
        method: 'examine',
        description: 'Examine software development procedures to verify techniques are defined.',
        expectedEvidence: ['Secure coding standards', 'Development procedures'],
      },
      {
        id: '6.2.4.b',
        method: 'examine',
        description: 'Examine software to verify techniques are in use.',
        expectedEvidence: ['Code review reports', 'Static analysis results'],
      },
      {
        id: '6.2.4.c',
        method: 'interview',
        description: 'Interview developers to verify training and awareness.',
        expectedEvidence: ['Interview notes', 'Training records'],
      },
    ],
    definedApproach: {
      requirements: [
        'Define secure coding techniques',
        'Train developers on secure coding',
        'Review code for security vulnerabilities',
      ],
      implementationGuidance: [
        'Use OWASP guidelines as foundation',
        'Implement peer code reviews',
        'Use SAST/DAST tools',
      ],
    },
    customizedApproach: {
      objective: 'Software is designed and developed to prevent common attacks.',
      acceptanceCriteria: [
        'Common vulnerabilities are prevented by design',
        'Developers demonstrate security awareness',
      ],
      documentationRequirements: [
        'Secure coding standards',
        'Training records',
        'Code review evidence',
      ],
    },
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required', notes: 'If custom software is developed' },
    ],
    relatedRequirements: ['6.3.1', '6.3.2'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 7: Access Control
  {
    id: 'pci-7.2.1',
    requirementNumber: 'Requirement7',
    subRequirement: '7.2.1',
    goal: 'AccessControl',
    title: 'Access Control Model Defined',
    description: 'An access control model is defined and includes: coverage for all system components, assignment based on job classification and function, and least privileges required.',
    guidanceNotes: [
      'Model should cover all CDE systems',
      'Include role definitions and access rights',
      'Base access on business need-to-know',
    ],
    testingProcedures: [
      {
        id: '7.2.1.a',
        method: 'examine',
        description: 'Examine documented access control model.',
        expectedEvidence: ['Access control policy', 'Role definitions', 'Access matrices'],
      },
      {
        id: '7.2.1.b',
        method: 'examine',
        description: 'Examine access control settings to verify alignment with model.',
        expectedEvidence: ['System access configurations', 'User role assignments'],
      },
    ],
    definedApproach: {
      requirements: [
        'Define access control model for all CDE systems',
        'Base access on job function and classification',
        'Implement least privileges principle',
      ],
      implementationGuidance: [
        'Use RBAC or ABAC models',
        'Document access justification',
        'Regular access reviews',
      ],
    },
    customizedApproach: {
      objective: 'Access to system components is restricted to required individuals.',
      acceptanceCriteria: [
        'Unauthorized access is prevented',
        'Access is traceable to business need',
      ],
      documentationRequirements: [
        'Access control model documentation',
        'Access justification records',
      ],
    },
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
    ],
    relatedRequirements: ['7.2.2', '8.2.1'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 8: Authentication
  {
    id: 'pci-8.3.6',
    requirementNumber: 'Requirement8',
    subRequirement: '8.3.6',
    goal: 'AccessControl',
    title: 'Password Complexity',
    description: 'If passwords/passphrases are used as authentication factors, they meet minimum complexity: minimum length of 12 characters (or 8 if system doesn\'t support 12), contain both numeric and alphabetic characters.',
    guidanceNotes: [
      '12 characters is new requirement in v4.0',
      'Applies to all authentication passwords',
      'Complexity may be reduced if MFA is used',
    ],
    testingProcedures: [
      {
        id: '8.3.6.a',
        method: 'examine',
        description: 'Examine system configuration settings to verify password parameters.',
        expectedEvidence: ['Password policy configurations', 'System settings'],
      },
      {
        id: '8.3.6.b',
        method: 'examine',
        description: 'Examine vendor documentation if 12 characters not supported.',
        expectedEvidence: ['Vendor documentation', 'System limitations'],
      },
    ],
    definedApproach: {
      requirements: [
        'Minimum 12 characters (or 8 if not supported)',
        'Contain both numeric and alphabetic characters',
        'Enforce through system configuration',
      ],
      implementationGuidance: [
        'Configure password policies at system level',
        'Document any system limitations',
        'Consider passphrases for easier compliance',
      ],
    },
    customizedApproach: {
      objective: 'Authentication factors cannot be easily guessed or brute-forced.',
      acceptanceCriteria: [
        'Password entropy meets security requirements',
        'Brute force attacks are impractical',
      ],
      documentationRequirements: [
        'Password policy documentation',
        'Entropy calculations if using customized approach',
      ],
    },
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
      { saqType: 'SAQ-B', applicability: 'required' },
    ],
    relatedRequirements: ['8.3.1', '8.3.7', '8.3.9'],
    effectiveDate: new Date('2025-03-31'),
    isNewInV4: true,
  },

  // Requirement 10: Logging and Monitoring
  {
    id: 'pci-10.2.1',
    requirementNumber: 'Requirement10',
    subRequirement: '10.2.1',
    goal: 'MonitorAndTest',
    title: 'Audit Logs Capture Events',
    description: 'Audit logs are enabled and active for all system components and cardholder data.',
    guidanceNotes: [
      'Logs must capture all access to cardholder data',
      'Include all actions taken by individuals with root/admin privileges',
      'Capture all access to audit trails',
    ],
    testingProcedures: [
      {
        id: '10.2.1.a',
        method: 'examine',
        description: 'Examine audit log configurations.',
        expectedEvidence: ['Logging configurations', 'Audit policy settings'],
      },
      {
        id: '10.2.1.b',
        method: 'examine',
        description: 'Examine audit logs to verify events are captured.',
        expectedEvidence: ['Sample audit logs', 'Event samples'],
      },
      {
        id: '10.2.1.c',
        method: 'interview',
        description: 'Interview personnel about log management.',
        expectedEvidence: ['Interview notes'],
      },
    ],
    definedApproach: {
      requirements: [
        'Enable audit logging on all CDE systems',
        'Capture required event types',
        'Ensure logs are active and generating',
      ],
      implementationGuidance: [
        'Centralize log collection',
        'Implement log rotation without loss',
        'Protect log integrity',
      ],
    },
    customizedApproach: null,
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
    ],
    relatedRequirements: ['10.2.2', '10.3.1', '10.4.1'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 11: Security Testing
  {
    id: 'pci-11.3.1',
    requirementNumber: 'Requirement11',
    subRequirement: '11.3.1',
    goal: 'MonitorAndTest',
    title: 'Internal Vulnerability Scans',
    description: 'Internal vulnerability scans are performed at least once every three months, and after any significant change.',
    guidanceNotes: [
      'Address high-risk and critical vulnerabilities per entity risk assessment',
      'Rescans required after remediation',
      'Authenticated scanning recommended',
    ],
    testingProcedures: [
      {
        id: '11.3.1.a',
        method: 'examine',
        description: 'Examine scan reports from last 12 months.',
        expectedEvidence: ['Quarterly scan reports', 'Rescan reports'],
      },
      {
        id: '11.3.1.b',
        method: 'examine',
        description: 'Examine scan documentation for process.',
        expectedEvidence: ['Scanning procedures', 'Scope documentation'],
      },
      {
        id: '11.3.1.c',
        method: 'interview',
        description: 'Interview personnel about scanning process.',
        expectedEvidence: ['Interview notes'],
      },
    ],
    definedApproach: {
      requirements: [
        'Quarterly internal vulnerability scans',
        'Scans after significant changes',
        'Remediate high/critical findings',
        'Perform rescans to confirm remediation',
      ],
      implementationGuidance: [
        'Use authenticated scanning for comprehensive coverage',
        'Integrate with change management',
        'Automate scanning where possible',
      ],
    },
    customizedApproach: null,
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
    ],
    relatedRequirements: ['6.3.3', '11.3.2'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },

  // Requirement 12: Security Policy
  {
    id: 'pci-12.1.1',
    requirementNumber: 'Requirement12',
    subRequirement: '12.1.1',
    goal: 'InformationSecurityPolicy',
    title: 'Information Security Policy',
    description: 'An overall information security policy is established, published, maintained, and disseminated to all relevant personnel, as well as to relevant vendors and business partners.',
    guidanceNotes: [
      'Policy should address all PCI DSS requirements',
      'Include incident response procedures',
      'Annual review required',
    ],
    testingProcedures: [
      {
        id: '12.1.1.a',
        method: 'examine',
        description: 'Examine the information security policy.',
        expectedEvidence: ['Security policy document', 'Version history'],
      },
      {
        id: '12.1.1.b',
        method: 'examine',
        description: 'Examine evidence of policy dissemination.',
        expectedEvidence: ['Distribution records', 'Acknowledgment forms'],
      },
      {
        id: '12.1.1.c',
        method: 'interview',
        description: 'Interview personnel about policy awareness.',
        expectedEvidence: ['Interview notes'],
      },
    ],
    definedApproach: {
      requirements: [
        'Establish comprehensive security policy',
        'Publish and disseminate to all personnel',
        'Include vendors and business partners',
        'Review at least annually',
      ],
      implementationGuidance: [
        'Use policy management tools',
        'Track acknowledgments',
        'Include in onboarding process',
      ],
    },
    customizedApproach: null,
    applicability: [
      { saqType: 'SAQ-D', applicability: 'required' },
      { saqType: 'SAQ-C', applicability: 'required' },
      { saqType: 'SAQ-A', applicability: 'required' },
    ],
    relatedRequirements: ['12.1.2', '12.1.3'],
    effectiveDate: new Date('2022-03-31'),
    isNewInV4: false,
  },
];

// ============================================================================
// PCI-DSS Controls Service
// ============================================================================

export class PCIDSSControlsService extends EventEmitter {
  private static instance: PCIDSSControlsService | null = null;
  private controls: Map<string, PCIDSSControl>;
  private implementations: Map<string, ControlImplementation[]>;
  private cdeScopes: Map<string, CDEScope>;
  private assessments: Map<string, PCIDSSAssessment[]>;
  private config: PCIDSSConfig;

  private constructor(config?: Partial<PCIDSSConfig>) {
    super();
    this.controls = new Map();
    this.implementations = new Map();
    this.cdeScopes = new Map();
    this.assessments = new Map();
    this.config = {
      enableAutomatedEvidence: true,
      scopeReviewIntervalDays: 365,
      assessmentReminderDays: 30,
      requireQSAForLevel1: true,
      ...config,
    };
    this.loadControls();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<PCIDSSConfig>): PCIDSSControlsService {
    if (!PCIDSSControlsService.instance) {
      PCIDSSControlsService.instance = new PCIDSSControlsService(config);
    }
    return PCIDSSControlsService.instance;
  }

  /**
   * Load PCI-DSS controls into memory
   */
  private loadControls(): void {
    for (const control of PCI_DSS_CONTROLS) {
      this.controls.set(control.id, control);
    }
  }

  /**
   * Get all controls
   */
  public getAllControls(): DataEnvelope<PCIDSSControl[]> {
    const controls = Array.from(this.controls.values());

    return createDataEnvelope(controls, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'PCI-DSS controls retrieved successfully'),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get controls by requirement
   */
  public getControlsByRequirement(requirement: PCIDSSRequirement): DataEnvelope<PCIDSSControl[]> {
    const controls = Array.from(this.controls.values())
      .filter((c) => c.requirementNumber === requirement);

    return createDataEnvelope(controls, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${controls.length} controls for ${requirement}`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get controls by goal
   */
  public getControlsByGoal(goal: PCIDSSGoal): DataEnvelope<PCIDSSControl[]> {
    const controls = Array.from(this.controls.values())
      .filter((c) => c.goal === goal);

    return createDataEnvelope(controls, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${controls.length} controls for goal: ${goal}`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get controls by SAQ type
   */
  public getControlsBySAQType(saqType: SAQType): DataEnvelope<PCIDSSControl[]> {
    const controls = Array.from(this.controls.values())
      .filter((c) => c.applicability.some(
        (a) => a.saqType === saqType && a.applicability === 'required'
      ));

    return createDataEnvelope(controls, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${controls.length} required controls for ${saqType}`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get new v4.0 controls
   */
  public getNewV4Controls(): DataEnvelope<PCIDSSControl[]> {
    const controls = Array.from(this.controls.values())
      .filter((c) => c.isNewInV4);

    return createDataEnvelope(controls, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${controls.length} new v4.0 controls`),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Record control implementation
   */
  public recordImplementation(
    tenantId: string,
    implementation: Omit<ControlImplementation, 'tenantId'>
  ): DataEnvelope<ControlImplementation> {
    const control = this.controls.get(implementation.controlId);
    if (!control) {
      return createDataEnvelope(null as unknown as ControlImplementation, {
        source: 'PCIDSSControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, `Control ${implementation.controlId} not found`),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    const impl: ControlImplementation = {
      ...implementation,
      tenantId,
    };

    const tenantImpls = this.implementations.get(tenantId) || [];
    const existingIndex = tenantImpls.findIndex(
      (i) => i.controlId === impl.controlId
    );

    if (existingIndex >= 0) {
      tenantImpls[existingIndex] = impl;
    } else {
      tenantImpls.push(impl);
    }

    this.implementations.set(tenantId, tenantImpls);

    this.emit('implementationRecorded', { tenantId, implementation: impl });

    return createDataEnvelope(impl, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Control implementation recorded successfully'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Define CDE scope for tenant
   */
  public defineCDEScope(
    tenantId: string,
    scope: Omit<CDEScope, 'id' | 'tenantId'>
  ): DataEnvelope<CDEScope> {
    const cdeScope: CDEScope = {
      ...scope,
      id: `cde-${Date.now()}`,
      tenantId,
    };

    this.cdeScopes.set(tenantId, cdeScope);

    this.emit('cdeScopeDefined', { tenantId, scope: cdeScope });

    return createDataEnvelope(cdeScope, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'CDE scope defined successfully'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get CDE scope for tenant
   */
  public getCDEScope(tenantId: string): DataEnvelope<CDEScope | null> {
    const scope = this.cdeScopes.get(tenantId) || null;

    return createDataEnvelope(scope, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(
        scope ? GovernanceResult.ALLOW : GovernanceResult.FLAG,
        scope ? 'CDE scope retrieved' : 'No CDE scope defined for tenant'
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Analyze cardholder data flow
   */
  public analyzeDataFlow(
    tenantId: string,
    flowId: string
  ): DataEnvelope<{
    flow: CardholderDataFlow | null;
    risks: string[];
    recommendations: string[];
  }> {
    const scope = this.cdeScopes.get(tenantId);
    if (!scope) {
      return createDataEnvelope({ flow: null, risks: [], recommendations: [] }, {
        source: 'PCIDSSControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'No CDE scope defined for tenant'),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    const flow = scope.dataFlows.find((f) => f.id === flowId);
    if (!flow) {
      return createDataEnvelope({ flow: null, risks: [], recommendations: [] }, {
        source: 'PCIDSSControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, `Data flow ${flowId} not found`),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    const risks: string[] = [];
    const recommendations: string[] = [];

    // Analyze encryption
    if (!flow.encryptionMethod || flow.encryptionMethod === 'none') {
      risks.push('Data transmitted without encryption');
      recommendations.push('Implement TLS 1.2 or higher for transmission');
    }

    // Analyze protocol
    if (flow.protocol && ['HTTP', 'FTP', 'Telnet'].includes(flow.protocol.toUpperCase())) {
      risks.push(`Insecure protocol ${flow.protocol} detected`);
      recommendations.push('Use HTTPS, SFTP, or SSH instead');
    }

    // Check for sensitive data elements
    const sensitiveElements: CardholderDataElement[] = ['full_track_data', 'CAV2_CVC2_CVV2_CID', 'PIN_PIN_block'];
    const hasSensitive = flow.dataElements.some((e) => sensitiveElements.includes(e));
    if (hasSensitive) {
      risks.push('Sensitive authentication data in flow');
      recommendations.push('Ensure SAD is not stored after authorization');
    }

    return createDataEnvelope({ flow, risks, recommendations }, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(
        risks.length > 0 ? GovernanceResult.FLAG : GovernanceResult.ALLOW,
        risks.length > 0
          ? `Data flow analysis found ${risks.length} risk(s)`
          : 'Data flow analysis complete - no issues found'
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Conduct PCI-DSS assessment
   */
  public conductAssessment(
    tenantId: string,
    assessmentType: 'self' | 'qsa' | 'isa',
    saqType: SAQType
  ): DataEnvelope<PCIDSSAssessment> {
    const scope = this.cdeScopes.get(tenantId);
    if (!scope) {
      return createDataEnvelope(null as unknown as PCIDSSAssessment, {
        source: 'PCIDSSControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'CDE scope must be defined before assessment'),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    const tenantImpls = this.implementations.get(tenantId) || [];
    const applicableControls = Array.from(this.controls.values())
      .filter((c) => c.applicability.some(
        (a) => a.saqType === saqType && a.applicability === 'required'
      ));

    // Assess each requirement
    const requirementResults: RequirementResult[] = [];
    const requirements = Object.keys(REQUIREMENT_METADATA) as PCIDSSRequirement[];

    for (const req of requirements) {
      const reqControls = applicableControls.filter((c) => c.requirementNumber === req);
      const reqImpls = tenantImpls.filter((i) =>
        reqControls.some((c) => c.id === i.controlId)
      );

      const compliant = reqImpls.filter((i) =>
        i.status === 'in_place' || i.status === 'in_place_with_ccw'
      ).length;
      const nonCompliant = reqControls.length - compliant -
        reqImpls.filter((i) => i.status === 'not_applicable').length;
      const notApplicable = reqImpls.filter((i) =>
        i.status === 'not_applicable'
      ).length;

      const findings: AssessmentFinding[] = reqControls
        .filter((c) => {
          const impl = tenantImpls.find((i) => i.controlId === c.id);
          return !impl || impl.status === 'not_in_place' || impl.status === 'not_tested';
        })
        .map((c) => ({
          id: `finding-${c.id}-${Date.now()}`,
          controlId: c.id,
          severity: 'high' as const,
          description: `Control ${c.subRequirement} - ${c.title} not implemented`,
          affectedSystems: scope.systems.filter((s) => s.category === 'cde').map((s) => s.name),
          recommendedRemediation: c.definedApproach.implementationGuidance.join('; '),
          targetRemediationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }));

      let status: ComplianceStatus = 'compliant';
      if (nonCompliant > 0) {
        status = compliant > 0 ? 'partially_compliant' : 'non_compliant';
      }

      requirementResults.push({
        requirement: req,
        status,
        controlsAssessed: reqControls.length,
        controlsCompliant: compliant,
        controlsNonCompliant: nonCompliant,
        controlsNotApplicable: notApplicable,
        findings,
      });
    }

    // Determine overall compliance
    const allCompliant = requirementResults.every((r: any) => r.status === 'compliant');
    const anyNonCompliant = requirementResults.some((r: any) => r.status === 'non_compliant');
    const overallCompliance: ComplianceStatus = allCompliant
      ? 'compliant'
      : anyNonCompliant
        ? 'non_compliant'
        : 'partially_compliant';

    const compensatingControlsUsed = tenantImpls.filter(
      (i) => i.status === 'in_place_with_ccw'
    ).length;

    const assessment: PCIDSSAssessment = {
      id: `pci-assessment-${Date.now()}`,
      tenantId,
      assessmentType,
      saqType,
      assessmentPeriod: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      overallCompliance,
      requirementResults,
      cdeScope: scope,
      compensatingControlsUsed,
      exceptionsNoted: [],
      attestationDate: overallCompliance === 'compliant' ? new Date() : undefined,
    };

    const tenantAssessments = this.assessments.get(tenantId) || [];
    tenantAssessments.push(assessment);
    this.assessments.set(tenantId, tenantAssessments);

    this.emit('assessmentCompleted', { tenantId, assessment });

    return createDataEnvelope(assessment, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(
        overallCompliance === 'compliant' ? GovernanceResult.ALLOW : GovernanceResult.FLAG,
        `PCI-DSS assessment completed: ${overallCompliance}`
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get assessment history
   */
  public getAssessmentHistory(tenantId: string): DataEnvelope<PCIDSSAssessment[]> {
    const assessments = this.assessments.get(tenantId) || [];

    return createDataEnvelope(assessments, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Retrieved ${assessments.length} assessment(s)`),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Create compensating control worksheet
   */
  public createCompensatingControl(
    tenantId: string,
    ccw: Omit<CompensatingControl, 'id'>
  ): DataEnvelope<CompensatingControl> {
    const control = Array.from(this.controls.values())
      .find((c) => c.subRequirement === ccw.originalRequirement);

    if (!control) {
      return createDataEnvelope(null as unknown as CompensatingControl, {
        source: 'PCIDSSControlsService',
        governanceVerdict: createVerdict(GovernanceResult.DENY, `Original requirement ${ccw.originalRequirement} not found`),
        classification: DataClassification.CONFIDENTIAL,
      });
    }

    const compensatingControl: CompensatingControl = {
      ...ccw,
      id: `ccw-${Date.now()}`,
    };

    this.emit('compensatingControlCreated', { tenantId, ccw: compensatingControl });

    return createDataEnvelope(compensatingControl, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Compensating control worksheet created'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get requirement metadata
   */
  public getRequirementMetadata(
    requirement: PCIDSSRequirement
  ): DataEnvelope<typeof REQUIREMENT_METADATA[PCIDSSRequirement]> {
    const metadata = REQUIREMENT_METADATA[requirement];

    return createDataEnvelope(metadata, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Requirement metadata retrieved'),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get goal description
   */
  public getGoalDescription(goal: PCIDSSGoal): DataEnvelope<string> {
    const description = GOAL_DESCRIPTIONS[goal];

    return createDataEnvelope(description, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Goal description retrieved'),
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Get service statistics
   */
  public getStats(tenantId: string): DataEnvelope<PCIDSSStats> {
    const tenantImpls = this.implementations.get(tenantId) || [];
    const tenantAssessments = this.assessments.get(tenantId) || [];
    const scope = this.cdeScopes.get(tenantId);

    const lastAssessment = tenantAssessments.length > 0
      ? tenantAssessments[tenantAssessments.length - 1]
      : null;

    const stats: PCIDSSStats = {
      totalControls: this.controls.size,
      implementedControls: tenantImpls.filter(
        (i) => i.status === 'in_place' || i.status === 'in_place_with_ccw'
      ).length,
      pendingControls: this.controls.size - tenantImpls.length,
      compensatingControls: tenantImpls.filter(
        (i) => i.status === 'in_place_with_ccw'
      ).length,
      lastAssessmentDate: lastAssessment?.attestationDate || null,
      nextAssessmentDue: lastAssessment
        ? new Date(lastAssessment.assessmentPeriod.end.getTime() + 365 * 24 * 60 * 60 * 1000)
        : null,
      cdeSystemCount: scope?.systems.length || 0,
      dataFlowCount: scope?.dataFlows.length || 0,
    };

    return createDataEnvelope(stats, {
      source: 'PCIDSSControlsService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'PCI-DSS statistics retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let serviceInstance: PCIDSSControlsService | null = null;

export function getPCIDSSControlsService(
  config?: Partial<PCIDSSConfig>
): PCIDSSControlsService {
  if (!serviceInstance) {
    serviceInstance = PCIDSSControlsService.getInstance(config);
  }
  return serviceInstance;
}
