/**
 * HIPAA Compliance Controls
 *
 * Complete mapping of HIPAA Privacy, Security, and Breach Notification Rules
 * to Summit governance controls.
 *
 * @module compliance/frameworks/HIPAAControls
 * @version 4.0.0-alpha
 */

// Local type definitions for HIPAA compliance controls
// Using string types for flexibility in prototype phase

export type ControlCategory =
  | 'Administrative Safeguards'
  | 'Physical Safeguards'
  | 'Technical Safeguards'
  | 'Privacy Rule'
  | 'Breach Notification Rule';

export type ControlFrequency =
  | 'continuous'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'as_needed';

export interface SummitMapping {
  governanceControls: string[];
  provenanceRequirements: string[];
  dataClassifications: string[];
}

export interface ComplianceControl {
  id: string;
  framework: string;
  category: ControlCategory;
  subcategory: string;
  name: string;
  description: string;
  requirement: string;
  automatable: boolean;
  frequency: ControlFrequency;
  evidenceTypes: string[];
  implementationGuidance: string;
  summitMapping: SummitMapping;
}

// =============================================================================
// HIPAA Framework Overview
// =============================================================================

export const HIPAA_FRAMEWORK = {
  id: 'HIPAA',
  name: 'Health Insurance Portability and Accountability Act',
  version: '2024',
  description: 'US federal law protecting sensitive patient health information',
  effectiveDate: '2003-04-14',
  lastUpdated: '2024-01-01',
  jurisdiction: 'United States',
  regulatoryBody: 'HHS Office for Civil Rights',
  categories: [
    'Administrative Safeguards',
    'Physical Safeguards',
    'Technical Safeguards',
    'Privacy Rule',
    'Breach Notification Rule',
  ],
};

// =============================================================================
// PHI (Protected Health Information) Identifiers
// =============================================================================

export const PHI_IDENTIFIERS = [
  { id: 'name', description: 'Names', regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/ },
  { id: 'address', description: 'Geographic data smaller than state', regex: /\b\d{5}(-\d{4})?\b/ },
  { id: 'dates', description: 'Dates related to individual (DOB, admission, discharge, death)', regex: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/ },
  { id: 'phone', description: 'Telephone numbers', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ },
  { id: 'fax', description: 'Fax numbers', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ },
  { id: 'email', description: 'Email addresses', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { id: 'ssn', description: 'Social Security numbers', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
  { id: 'mrn', description: 'Medical record numbers', regex: /\bMRN[:\s]?\d{6,}\b/i },
  { id: 'beneficiary', description: 'Health plan beneficiary numbers', regex: /\b[A-Z]{3}\d{9}\b/ },
  { id: 'account', description: 'Account numbers', regex: /\bACCT[:\s]?\d{6,}\b/i },
  { id: 'certificate', description: 'Certificate/license numbers', regex: /\bLIC[:\s]?[A-Z0-9]{6,}\b/i },
  { id: 'vehicle', description: 'Vehicle identifiers and serial numbers', regex: /\bVIN[:\s]?[A-Z0-9]{17}\b/i },
  { id: 'device', description: 'Device identifiers and serial numbers', regex: /\bDEVICE[:\s]?[A-Z0-9]{8,}\b/i },
  { id: 'url', description: 'Web URLs', regex: /https?:\/\/[^\s]+/ },
  { id: 'ip', description: 'IP addresses', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  { id: 'biometric', description: 'Biometric identifiers (fingerprints, voice)', regex: null },
  { id: 'photo', description: 'Full-face photographs and comparable images', regex: null },
  { id: 'unique', description: 'Any other unique identifying number or code', regex: null },
];

// =============================================================================
// Administrative Safeguards (45 CFR § 164.308)
// =============================================================================

export const ADMINISTRATIVE_SAFEGUARDS: ComplianceControl[] = [
  // Security Management Process
  {
    id: 'HIPAA-AS-001',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Management Process',
    name: 'Risk Analysis',
    description: 'Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of electronic protected health information.',
    requirement: '45 CFR § 164.308(a)(1)(ii)(A)',
    automatable: true,
    frequency: 'annual',
    evidenceTypes: ['risk_assessment', 'vulnerability_scan', 'audit_report'],
    implementationGuidance: 'Perform comprehensive risk analysis including asset inventory, threat identification, vulnerability assessment, and risk determination.',
    summitMapping: {
      governanceControls: ['risk-assessment-policy'],
      provenanceRequirements: ['risk-analysis-chain'],
      dataClassifications: ['PHI', 'ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-002',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Management Process',
    name: 'Risk Management',
    description: 'Implement security measures sufficient to reduce risks and vulnerabilities to a reasonable and appropriate level.',
    requirement: '45 CFR § 164.308(a)(1)(ii)(B)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['policy_document', 'system_config', 'attestation'],
    implementationGuidance: 'Implement and document security measures based on risk analysis findings.',
    summitMapping: {
      governanceControls: ['risk-mitigation-policy'],
      provenanceRequirements: ['mitigation-evidence-chain'],
      dataClassifications: ['PHI', 'ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-003',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Management Process',
    name: 'Sanction Policy',
    description: 'Apply appropriate sanctions against workforce members who fail to comply with security policies.',
    requirement: '45 CFR § 164.308(a)(1)(ii)(C)',
    automatable: false,
    frequency: 'as_needed',
    evidenceTypes: ['policy_document', 'hr_record'],
    implementationGuidance: 'Document and enforce sanctions for security policy violations.',
    summitMapping: {
      governanceControls: ['sanctions-policy'],
      provenanceRequirements: ['hr-action-chain'],
      dataClassifications: ['internal'],
    },
  },
  {
    id: 'HIPAA-AS-004',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Management Process',
    name: 'Information System Activity Review',
    description: 'Implement procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports.',
    requirement: '45 CFR § 164.308(a)(1)(ii)(D)',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['audit_log', 'access_report', 'security_incident_report'],
    implementationGuidance: 'Establish automated log review and alerting procedures.',
    summitMapping: {
      governanceControls: ['audit-review-policy'],
      provenanceRequirements: ['audit-chain'],
      dataClassifications: ['ePHI', 'audit'],
    },
  },

  // Assigned Security Responsibility
  {
    id: 'HIPAA-AS-005',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Assigned Security Responsibility',
    name: 'Security Official',
    description: 'Identify the security official who is responsible for the development and implementation of the policies and procedures.',
    requirement: '45 CFR § 164.308(a)(2)',
    automatable: false,
    frequency: 'annual',
    evidenceTypes: ['policy_document', 'org_chart', 'attestation'],
    implementationGuidance: 'Designate and document security officer role and responsibilities.',
    summitMapping: {
      governanceControls: ['security-officer-policy'],
      provenanceRequirements: ['designation-chain'],
      dataClassifications: ['internal'],
    },
  },

  // Workforce Security
  {
    id: 'HIPAA-AS-006',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Workforce Security',
    name: 'Authorization and/or Supervision',
    description: 'Implement procedures for the authorization and/or supervision of workforce members who work with ePHI.',
    requirement: '45 CFR § 164.308(a)(3)(ii)(A)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['access_control_log', 'authorization_record'],
    implementationGuidance: 'Implement role-based access control with approval workflows.',
    summitMapping: {
      governanceControls: ['rbac-policy', 'authorization-workflow'],
      provenanceRequirements: ['authorization-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-007',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Workforce Security',
    name: 'Workforce Clearance Procedure',
    description: 'Implement procedures to determine that the access of a workforce member to ePHI is appropriate.',
    requirement: '45 CFR § 164.308(a)(3)(ii)(B)',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['background_check', 'access_approval'],
    implementationGuidance: 'Establish clearance procedures including background checks where appropriate.',
    summitMapping: {
      governanceControls: ['clearance-policy'],
      provenanceRequirements: ['clearance-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-008',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Workforce Security',
    name: 'Termination Procedures',
    description: 'Implement procedures for terminating access to ePHI when employment ends.',
    requirement: '45 CFR § 164.308(a)(3)(ii)(C)',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['access_revocation_log', 'termination_checklist'],
    implementationGuidance: 'Automate access revocation upon termination triggers.',
    summitMapping: {
      governanceControls: ['termination-policy'],
      provenanceRequirements: ['deprovisioning-chain'],
      dataClassifications: ['ePHI'],
    },
  },

  // Information Access Management
  {
    id: 'HIPAA-AS-009',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Information Access Management',
    name: 'Access Authorization',
    description: 'Implement policies and procedures for granting access to ePHI.',
    requirement: '45 CFR § 164.308(a)(4)(ii)(B)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['access_policy', 'approval_workflow'],
    implementationGuidance: 'Implement formal access request and approval process.',
    summitMapping: {
      governanceControls: ['access-authorization-policy'],
      provenanceRequirements: ['access-grant-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-010',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Information Access Management',
    name: 'Access Establishment and Modification',
    description: 'Implement policies and procedures for establishing, documenting, reviewing, and modifying access.',
    requirement: '45 CFR § 164.308(a)(4)(ii)(C)',
    automatable: true,
    frequency: 'quarterly',
    evidenceTypes: ['access_review', 'modification_log'],
    implementationGuidance: 'Conduct quarterly access reviews and document all modifications.',
    summitMapping: {
      governanceControls: ['access-review-policy'],
      provenanceRequirements: ['access-modification-chain'],
      dataClassifications: ['ePHI'],
    },
  },

  // Security Awareness and Training
  {
    id: 'HIPAA-AS-011',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Awareness and Training',
    name: 'Security Reminders',
    description: 'Implement periodic security updates.',
    requirement: '45 CFR § 164.308(a)(5)(ii)(A)',
    automatable: true,
    frequency: 'monthly',
    evidenceTypes: ['training_record', 'communication_log'],
    implementationGuidance: 'Send regular security awareness reminders to workforce.',
    summitMapping: {
      governanceControls: ['security-awareness-policy'],
      provenanceRequirements: ['training-chain'],
      dataClassifications: ['internal'],
    },
  },
  {
    id: 'HIPAA-AS-012',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Awareness and Training',
    name: 'Protection from Malicious Software',
    description: 'Implement procedures for guarding against, detecting, and reporting malicious software.',
    requirement: '45 CFR § 164.308(a)(5)(ii)(B)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['antivirus_log', 'malware_scan'],
    implementationGuidance: 'Deploy and monitor anti-malware solutions.',
    summitMapping: {
      governanceControls: ['malware-protection-policy'],
      provenanceRequirements: ['security-scan-chain'],
      dataClassifications: ['ePHI', 'system'],
    },
  },
  {
    id: 'HIPAA-AS-013',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Awareness and Training',
    name: 'Log-in Monitoring',
    description: 'Implement procedures for monitoring log-in attempts and reporting discrepancies.',
    requirement: '45 CFR § 164.308(a)(5)(ii)(C)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['login_log', 'alert_record'],
    implementationGuidance: 'Implement failed login monitoring and alerting.',
    summitMapping: {
      governanceControls: ['login-monitoring-policy'],
      provenanceRequirements: ['authentication-chain'],
      dataClassifications: ['ePHI', 'audit'],
    },
  },
  {
    id: 'HIPAA-AS-014',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Awareness and Training',
    name: 'Password Management',
    description: 'Implement procedures for creating, changing, and safeguarding passwords.',
    requirement: '45 CFR § 164.308(a)(5)(ii)(D)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['password_policy', 'compliance_report'],
    implementationGuidance: 'Enforce password complexity, rotation, and secure storage.',
    summitMapping: {
      governanceControls: ['password-policy'],
      provenanceRequirements: ['credential-chain'],
      dataClassifications: ['ePHI', 'credentials'],
    },
  },

  // Security Incident Procedures
  {
    id: 'HIPAA-AS-015',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Security Incident Procedures',
    name: 'Response and Reporting',
    description: 'Identify and respond to suspected or known security incidents; mitigate harmful effects; document incidents.',
    requirement: '45 CFR § 164.308(a)(6)(ii)',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['incident_report', 'response_log', 'mitigation_record'],
    implementationGuidance: 'Implement incident response procedures with documentation.',
    summitMapping: {
      governanceControls: ['incident-response-policy'],
      provenanceRequirements: ['incident-chain'],
      dataClassifications: ['ePHI', 'security'],
    },
  },

  // Contingency Plan
  {
    id: 'HIPAA-AS-016',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Contingency Plan',
    name: 'Data Backup Plan',
    description: 'Establish and implement procedures to create and maintain retrievable exact copies of ePHI.',
    requirement: '45 CFR § 164.308(a)(7)(ii)(A)',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['backup_log', 'restoration_test'],
    implementationGuidance: 'Implement automated backup with integrity verification.',
    summitMapping: {
      governanceControls: ['backup-policy'],
      provenanceRequirements: ['backup-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-017',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Contingency Plan',
    name: 'Disaster Recovery Plan',
    description: 'Establish procedures to restore any loss of data.',
    requirement: '45 CFR § 164.308(a)(7)(ii)(B)',
    automatable: false,
    frequency: 'annual',
    evidenceTypes: ['dr_plan', 'dr_test_report'],
    implementationGuidance: 'Develop and test disaster recovery procedures.',
    summitMapping: {
      governanceControls: ['dr-policy'],
      provenanceRequirements: ['recovery-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-018',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Contingency Plan',
    name: 'Emergency Mode Operation Plan',
    description: 'Establish procedures to enable continuation of critical business processes.',
    requirement: '45 CFR § 164.308(a)(7)(ii)(C)',
    automatable: false,
    frequency: 'annual',
    evidenceTypes: ['emergency_plan', 'test_report'],
    implementationGuidance: 'Define emergency operating procedures for critical systems.',
    summitMapping: {
      governanceControls: ['emergency-operations-policy'],
      provenanceRequirements: ['emergency-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-AS-019',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Contingency Plan',
    name: 'Testing and Revision Procedures',
    description: 'Implement procedures for periodic testing and revision of contingency plans.',
    requirement: '45 CFR § 164.308(a)(7)(ii)(D)',
    automatable: true,
    frequency: 'annual',
    evidenceTypes: ['test_plan', 'test_results', 'revision_log'],
    implementationGuidance: 'Conduct annual contingency plan testing.',
    summitMapping: {
      governanceControls: ['contingency-testing-policy'],
      provenanceRequirements: ['test-chain'],
      dataClassifications: ['ePHI'],
    },
  },

  // Business Associate Contracts
  {
    id: 'HIPAA-AS-020',
    framework: 'HIPAA',
    category: 'Administrative Safeguards',
    subcategory: 'Business Associate Contracts',
    name: 'Written Contract or Arrangement',
    description: 'Document satisfactory assurances that business associates will appropriately safeguard ePHI.',
    requirement: '45 CFR § 164.308(b)(1)',
    automatable: false,
    frequency: 'as_needed',
    evidenceTypes: ['baa_contract', 'compliance_attestation'],
    implementationGuidance: 'Execute BAAs with all business associates before sharing ePHI.',
    summitMapping: {
      governanceControls: ['baa-policy'],
      provenanceRequirements: ['contract-chain'],
      dataClassifications: ['ePHI', 'legal'],
    },
  },
];

// =============================================================================
// Technical Safeguards (45 CFR § 164.312)
// =============================================================================

export const TECHNICAL_SAFEGUARDS: ComplianceControl[] = [
  // Access Control
  {
    id: 'HIPAA-TS-001',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Access Control',
    name: 'Unique User Identification',
    description: 'Assign a unique name and/or number for identifying and tracking user identity.',
    requirement: '45 CFR § 164.312(a)(2)(i)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['user_directory', 'identity_log'],
    implementationGuidance: 'Implement unique user IDs for all system access.',
    summitMapping: {
      governanceControls: ['unique-id-policy'],
      provenanceRequirements: ['identity-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-TS-002',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Access Control',
    name: 'Emergency Access Procedure',
    description: 'Establish procedures for obtaining necessary ePHI during an emergency.',
    requirement: '45 CFR § 164.312(a)(2)(ii)',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['break_glass_log', 'emergency_access_policy'],
    implementationGuidance: 'Implement break-glass procedures with full audit trail.',
    summitMapping: {
      governanceControls: ['break-glass-policy'],
      provenanceRequirements: ['emergency-access-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-TS-003',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Access Control',
    name: 'Automatic Logoff',
    description: 'Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity.',
    requirement: '45 CFR § 164.312(a)(2)(iii)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['session_config', 'timeout_log'],
    implementationGuidance: 'Configure session timeout (15 minutes recommended).',
    summitMapping: {
      governanceControls: ['session-timeout-policy'],
      provenanceRequirements: ['session-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-TS-004',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Access Control',
    name: 'Encryption and Decryption',
    description: 'Implement a mechanism to encrypt and decrypt ePHI.',
    requirement: '45 CFR § 164.312(a)(2)(iv)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['encryption_config', 'key_management_log'],
    implementationGuidance: 'Implement AES-256 encryption for ePHI at rest and in transit.',
    summitMapping: {
      governanceControls: ['encryption-policy'],
      provenanceRequirements: ['encryption-chain'],
      dataClassifications: ['ePHI'],
    },
  },

  // Audit Controls
  {
    id: 'HIPAA-TS-005',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Audit Controls',
    name: 'Audit Controls',
    description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI.',
    requirement: '45 CFR § 164.312(b)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['audit_log', 'log_review'],
    implementationGuidance: 'Implement comprehensive audit logging with tamper-evident storage.',
    summitMapping: {
      governanceControls: ['audit-controls-policy'],
      provenanceRequirements: ['complete-audit-chain'],
      dataClassifications: ['ePHI', 'audit'],
    },
  },

  // Integrity
  {
    id: 'HIPAA-TS-006',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Integrity',
    name: 'Mechanism to Authenticate ePHI',
    description: 'Implement electronic mechanisms to corroborate that ePHI has not been altered or destroyed in an unauthorized manner.',
    requirement: '45 CFR § 164.312(c)(2)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['integrity_check', 'hash_verification'],
    implementationGuidance: 'Implement cryptographic integrity verification (SHA-256).',
    summitMapping: {
      governanceControls: ['integrity-policy'],
      provenanceRequirements: ['integrity-chain'],
      dataClassifications: ['ePHI'],
    },
  },

  // Person or Entity Authentication
  {
    id: 'HIPAA-TS-007',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Person or Entity Authentication',
    name: 'Person or Entity Authentication',
    description: 'Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.',
    requirement: '45 CFR § 164.312(d)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['auth_log', 'mfa_config'],
    implementationGuidance: 'Implement multi-factor authentication for ePHI access.',
    summitMapping: {
      governanceControls: ['authentication-policy'],
      provenanceRequirements: ['auth-chain'],
      dataClassifications: ['ePHI'],
    },
  },

  // Transmission Security
  {
    id: 'HIPAA-TS-008',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Transmission Security',
    name: 'Integrity Controls',
    description: 'Implement security measures to ensure that electronically transmitted ePHI is not improperly modified without detection.',
    requirement: '45 CFR § 164.312(e)(2)(i)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['tls_config', 'integrity_log'],
    implementationGuidance: 'Implement TLS 1.3 with message authentication.',
    summitMapping: {
      governanceControls: ['transmission-integrity-policy'],
      provenanceRequirements: ['transmission-chain'],
      dataClassifications: ['ePHI'],
    },
  },
  {
    id: 'HIPAA-TS-009',
    framework: 'HIPAA',
    category: 'Technical Safeguards',
    subcategory: 'Transmission Security',
    name: 'Encryption',
    description: 'Implement a mechanism to encrypt ePHI whenever deemed appropriate.',
    requirement: '45 CFR § 164.312(e)(2)(ii)',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['encryption_config', 'certificate_log'],
    implementationGuidance: 'Encrypt all ePHI transmissions using TLS 1.3.',
    summitMapping: {
      governanceControls: ['transmission-encryption-policy'],
      provenanceRequirements: ['encryption-chain'],
      dataClassifications: ['ePHI'],
    },
  },
];

// =============================================================================
// Breach Notification Rule (45 CFR §§ 164.400-414)
// =============================================================================

export const BREACH_NOTIFICATION_CONTROLS: ComplianceControl[] = [
  {
    id: 'HIPAA-BN-001',
    framework: 'HIPAA',
    category: 'Breach Notification Rule',
    subcategory: 'Individual Notification',
    name: 'Notification to Individuals',
    description: 'Notify affected individuals within 60 days of breach discovery.',
    requirement: '45 CFR § 164.404',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['notification_log', 'breach_report'],
    implementationGuidance: 'Implement breach detection and notification workflow.',
    summitMapping: {
      governanceControls: ['breach-notification-policy'],
      provenanceRequirements: ['notification-chain'],
      dataClassifications: ['ePHI', 'breach'],
    },
  },
  {
    id: 'HIPAA-BN-002',
    framework: 'HIPAA',
    category: 'Breach Notification Rule',
    subcategory: 'Media Notification',
    name: 'Notification to Media',
    description: 'Notify prominent media outlets if breach affects more than 500 residents of a state.',
    requirement: '45 CFR § 164.406',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['media_notification', 'breach_assessment'],
    implementationGuidance: 'Establish media notification procedures for large breaches.',
    summitMapping: {
      governanceControls: ['media-notification-policy'],
      provenanceRequirements: ['media-chain'],
      dataClassifications: ['ePHI', 'breach'],
    },
  },
  {
    id: 'HIPAA-BN-003',
    framework: 'HIPAA',
    category: 'Breach Notification Rule',
    subcategory: 'HHS Notification',
    name: 'Notification to Secretary',
    description: 'Notify HHS of breaches. Breaches affecting 500+ individuals must be reported within 60 days.',
    requirement: '45 CFR § 164.408',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['hhs_report', 'breach_log'],
    implementationGuidance: 'Implement automated HHS breach reporting.',
    summitMapping: {
      governanceControls: ['hhs-notification-policy'],
      provenanceRequirements: ['hhs-chain'],
      dataClassifications: ['ePHI', 'breach'],
    },
  },
];

// =============================================================================
// Export All Controls
// =============================================================================

export const ALL_HIPAA_CONTROLS: ComplianceControl[] = [
  ...ADMINISTRATIVE_SAFEGUARDS,
  ...TECHNICAL_SAFEGUARDS,
  ...BREACH_NOTIFICATION_CONTROLS,
];

export const HIPAA_CONTROL_COUNT = {
  administrative: ADMINISTRATIVE_SAFEGUARDS.length,
  technical: TECHNICAL_SAFEGUARDS.length,
  breachNotification: BREACH_NOTIFICATION_CONTROLS.length,
  total: ALL_HIPAA_CONTROLS.length,
};

// =============================================================================
// HIPAA Compliance Service
// =============================================================================

export interface HIPAAAssessmentResult {
  controlId: string;
  controlName: string;
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable';
  findings: string[];
  evidenceCollected: string[];
  remediationRequired: boolean;
  remediationSteps?: string[];
  assessedAt: string;
  assessedBy: string;
}

export interface HIPAAComplianceReport {
  assessmentId: string;
  tenantId: string;
  assessedAt: string;
  overallStatus: 'compliant' | 'non_compliant' | 'partially_compliant';
  controlResults: HIPAAAssessmentResult[];
  summary: {
    totalControls: number;
    compliant: number;
    nonCompliant: number;
    partiallyCompliant: number;
    notApplicable: number;
  };
  phiCategories: string[];
  remediationPlan?: {
    priority: 'high' | 'medium' | 'low';
    items: Array<{
      controlId: string;
      action: string;
      deadline?: string;
    }>;
  };
}

export class HIPAAComplianceService {
  private assessmentHistory: Map<string, HIPAAComplianceReport> = new Map();

  /**
   * Get all HIPAA controls
   */
  getControls(): ComplianceControl[] {
    return ALL_HIPAA_CONTROLS;
  }

  /**
   * Get a specific control by ID
   */
  getControl(controlId: string): ComplianceControl | undefined {
    return ALL_HIPAA_CONTROLS.find((c) => c.id === controlId);
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(category: ControlCategory): ComplianceControl[] {
    return ALL_HIPAA_CONTROLS.filter((c) => c.category === category);
  }

  /**
   * Get all PHI identifiers
   */
  getPHIIdentifiers(): typeof PHI_IDENTIFIERS {
    return PHI_IDENTIFIERS;
  }

  /**
   * Assess a specific control
   */
  async assessControl(
    controlId: string,
    tenantId: string,
    evidence: Record<string, unknown>
  ): Promise<HIPAAAssessmentResult> {
    const control = this.getControl(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    // Perform assessment based on control requirements
    const findings: string[] = [];
    const evidenceCollected: string[] = Object.keys(evidence);
    let status: HIPAAAssessmentResult['status'] = 'compliant';

    // Check if required evidence types are present
    const missingEvidence = control.evidenceTypes.filter(
      (et) => !evidenceCollected.some((ec) => ec.includes(et))
    );

    if (missingEvidence.length > 0) {
      findings.push(`Missing required evidence: ${missingEvidence.join(', ')}`);
      status = missingEvidence.length === control.evidenceTypes.length
        ? 'non_compliant'
        : 'partially_compliant';
    }

    // Additional control-specific checks
    const controlChecks = this.performControlSpecificChecks(control, evidence);
    findings.push(...controlChecks.findings);
    if (controlChecks.issues > 0) {
      status = controlChecks.issues >= 3 ? 'non_compliant' : 'partially_compliant';
    }

    const remediationRequired = status !== 'compliant';
    const remediationSteps = remediationRequired
      ? this.generateRemediationSteps(control, findings)
      : undefined;

    return {
      controlId,
      controlName: control.name,
      status,
      findings,
      evidenceCollected,
      remediationRequired,
      remediationSteps,
      assessedAt: new Date().toISOString(),
      assessedBy: `system:hipaa-compliance-service`,
    };
  }

  /**
   * Perform full HIPAA compliance assessment
   */
  async performAssessment(
    tenantId: string,
    options: {
      categories?: ControlCategory[];
      excludeControls?: string[];
    } = {}
  ): Promise<HIPAAComplianceReport> {
    const assessmentId = `hipaa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let controls = ALL_HIPAA_CONTROLS;

    if (options.categories) {
      controls = controls.filter((c) => options.categories!.includes(c.category));
    }
    if (options.excludeControls) {
      controls = controls.filter((c) => !options.excludeControls!.includes(c.id));
    }

    const controlResults: HIPAAAssessmentResult[] = [];
    for (const control of controls) {
      // In production, this would collect real evidence
      const result = await this.assessControl(control.id, tenantId, {});
      controlResults.push(result);
    }

    const summary = {
      totalControls: controlResults.length,
      compliant: controlResults.filter((r: any) => r.status === 'compliant').length,
      nonCompliant: controlResults.filter((r: any) => r.status === 'non_compliant').length,
      partiallyCompliant: controlResults.filter((r: any) => r.status === 'partially_compliant').length,
      notApplicable: controlResults.filter((r: any) => r.status === 'not_applicable').length,
    };

    let overallStatus: HIPAAComplianceReport['overallStatus'];
    if (summary.nonCompliant > 0) {
      overallStatus = 'non_compliant';
    } else if (summary.partiallyCompliant > 0) {
      overallStatus = 'partially_compliant';
    } else {
      overallStatus = 'compliant';
    }

    const report: HIPAAComplianceReport = {
      assessmentId,
      tenantId,
      assessedAt: new Date().toISOString(),
      overallStatus,
      controlResults,
      summary,
      phiCategories: PHI_IDENTIFIERS.map((p) => p.id),
      remediationPlan: overallStatus !== 'compliant'
        ? this.generateRemediationPlan(controlResults)
        : undefined,
    };

    this.assessmentHistory.set(assessmentId, report);
    return report;
  }

  /**
   * Get assessment history for a tenant
   */
  getAssessmentHistory(tenantId: string): HIPAAComplianceReport[] {
    return Array.from(this.assessmentHistory.values()).filter(
      (r: any) => r.tenantId === tenantId
    );
  }

  /**
   * Get a specific assessment by ID
   */
  getAssessment(assessmentId: string): HIPAAComplianceReport | undefined {
    return this.assessmentHistory.get(assessmentId);
  }

  /**
   * Record evidence for a control
   */
  async recordEvidence(
    tenantId: string,
    controlId: string,
    evidence: {
      type: string;
      description: string;
      data: Record<string, unknown>;
      collectedBy: string;
    }
  ): Promise<{ evidenceId: string; recordedAt: string }> {
    const evidenceId = `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would store in a database
    return {
      evidenceId,
      recordedAt: new Date().toISOString(),
    };
  }

  private performControlSpecificChecks(
    control: ComplianceControl,
    evidence: Record<string, unknown>
  ): { findings: string[]; issues: number } {
    const findings: string[] = [];
    let issues = 0;

    // Control-specific validation logic
    switch (control.id) {
      case 'HIPAA-TS-004': // Encryption
        if (!evidence.encryptionEnabled) {
          findings.push('Encryption is not enabled for ePHI at rest');
          issues++;
        }
        if (!evidence.tlsVersion || (evidence.tlsVersion as string) < '1.2') {
          findings.push('TLS 1.2 or higher is required for ePHI in transit');
          issues++;
        }
        break;

      case 'HIPAA-TS-005': // Audit Controls
        if (!evidence.auditLoggingEnabled) {
          findings.push('Audit logging is not enabled');
          issues++;
        }
        break;

      case 'HIPAA-AS-001': // Risk Analysis
        if (!evidence.lastRiskAssessment) {
          findings.push('No risk assessment on record');
          issues++;
        }
        break;
    }

    return { findings, issues };
  }

  private generateRemediationSteps(
    control: ComplianceControl,
    findings: string[]
  ): string[] {
    const steps: string[] = [];

    steps.push(`Review ${control.name} requirements (${control.requirement})`);
    steps.push(`Address the following findings: ${findings.join('; ')}`);
    steps.push(control.implementationGuidance);

    if (control.automatable) {
      steps.push('Consider implementing automated controls to ensure ongoing compliance');
    }

    return steps;
  }

  private generateRemediationPlan(
    results: HIPAAAssessmentResult[]
  ): HIPAAComplianceReport['remediationPlan'] {
    const nonCompliant = results.filter((r: any) => r.status === 'non_compliant');
    const partiallyCompliant = results.filter((r: any) => r.status === 'partially_compliant');

    const items: Array<{ controlId: string; action: string; deadline?: string }> = [];

    for (const result of nonCompliant) {
      items.push({
        controlId: result.controlId,
        action: `Remediate ${result.controlName}: ${result.findings.join('; ')}`,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });
    }

    for (const result of partiallyCompliant) {
      items.push({
        controlId: result.controlId,
        action: `Complete ${result.controlName} implementation: ${result.findings.join('; ')}`,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      });
    }

    return {
      priority: nonCompliant.length > 0 ? 'high' : 'medium',
      items,
    };
  }
}

// Factory function
export function createHIPAAComplianceService(): HIPAAComplianceService {
  return new HIPAAComplianceService();
}

export default {
  framework: HIPAA_FRAMEWORK,
  identifiers: PHI_IDENTIFIERS,
  controls: ALL_HIPAA_CONTROLS,
  counts: HIPAA_CONTROL_COUNT,
};
