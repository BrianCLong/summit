/**
 * NIST 800-53 Rev 5 Security Controls
 * Comprehensive implementation of NIST security controls for federal systems
 */

import { ComplianceControl, ComplianceFramework, ControlFamily, ControlStatus } from '../types.js';

export const NIST_800_53_CONTROLS: ComplianceControl[] = [
  // Access Control (AC) Family
  {
    id: 'ac-1',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.ACCESS_CONTROL,
    number: 'AC-1',
    title: 'Policy and Procedures',
    description: 'Develop, document, and disseminate access control policy and procedures',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Establish documented access control policies covering purpose, scope, roles, responsibilities, management commitment, coordination, and compliance',
    evidence: [],
    responsibleParty: 'CISO',
  },
  {
    id: 'ac-2',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.ACCESS_CONTROL,
    number: 'AC-2',
    title: 'Account Management',
    description: 'Manage system accounts including identification, selection, and specification of account types',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Implement automated account management with approval workflows, periodic reviews, and privilege management',
    evidence: [],
    responsibleParty: 'IT Security',
  },
  {
    id: 'ac-3',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.ACCESS_CONTROL,
    number: 'AC-3',
    title: 'Access Enforcement',
    description: 'Enforce approved authorizations for logical access',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Implement role-based access control (RBAC) with mandatory access control (MAC) for classified systems',
    evidence: [],
    responsibleParty: 'Application Security',
  },
  {
    id: 'ac-17',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.ACCESS_CONTROL,
    number: 'AC-17',
    title: 'Remote Access',
    description: 'Establish usage restrictions and implementation guidance for remote access',
    baseline: 'moderate',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Implement VPN with MFA for all remote access, monitor remote sessions, and enforce encryption',
    evidence: [],
    responsibleParty: 'Network Security',
  },

  // Audit and Accountability (AU) Family
  {
    id: 'au-1',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.AUDIT_ACCOUNTABILITY,
    number: 'AU-1',
    title: 'Policy and Procedures',
    description: 'Develop, document, and disseminate audit and accountability policy',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Establish audit policies defining events to audit, retention periods, and review procedures',
    evidence: [],
    responsibleParty: 'CISO',
  },
  {
    id: 'au-2',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.AUDIT_ACCOUNTABILITY,
    number: 'AU-2',
    title: 'Event Logging',
    description: 'Identify and log specific events for audit purposes',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Log all authentication events, privileged operations, data access, and security events with immutable storage',
    evidence: [],
    responsibleParty: 'Security Operations',
  },
  {
    id: 'au-3',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.AUDIT_ACCOUNTABILITY,
    number: 'AU-3',
    title: 'Content of Audit Records',
    description: 'Ensure audit records contain information establishing event type, time, location, source, outcome, and identity',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Include timestamp, user ID, event type, outcome, IP address, and affected resources in all audit logs',
    evidence: [],
    responsibleParty: 'Security Operations',
  },
  {
    id: 'au-9',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.AUDIT_ACCOUNTABILITY,
    number: 'AU-9',
    title: 'Protection of Audit Information',
    description: 'Protect audit information and audit logging tools from unauthorized access, modification, and deletion',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Implement write-once storage, cryptographic hashing, and separation of duties for audit log management',
    evidence: [],
    responsibleParty: 'Security Operations',
  },
  {
    id: 'au-11',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.AUDIT_ACCOUNTABILITY,
    number: 'AU-11',
    title: 'Audit Record Retention',
    description: 'Retain audit records for defined period to support after-the-fact investigations',
    baseline: 'moderate',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Retain audit logs for minimum 1 year with secure archival for 7 years',
    evidence: [],
    responsibleParty: 'Security Operations',
  },

  // Identification and Authentication (IA) Family
  {
    id: 'ia-2',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.IDENTIFICATION_AUTH,
    number: 'IA-2',
    title: 'Identification and Authentication',
    description: 'Uniquely identify and authenticate organizational users',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Implement multi-factor authentication (MFA) for all user access, including PKI for privileged users',
    evidence: [],
    responsibleParty: 'Identity Management',
  },
  {
    id: 'ia-5',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.IDENTIFICATION_AUTH,
    number: 'IA-5',
    title: 'Authenticator Management',
    description: 'Manage system authenticators by verifying identity before issuance',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Enforce password complexity, rotation policies, and secure storage of credentials using industry-standard hashing',
    evidence: [],
    responsibleParty: 'Identity Management',
  },

  // Incident Response (IR) Family
  {
    id: 'ir-1',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.INCIDENT_RESPONSE,
    number: 'IR-1',
    title: 'Policy and Procedures',
    description: 'Develop, document, and disseminate incident response policy',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Establish incident response procedures with defined roles, detection, containment, and recovery processes',
    evidence: [],
    responsibleParty: 'Security Incident Response Team',
  },
  {
    id: 'ir-4',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.INCIDENT_RESPONSE,
    number: 'IR-4',
    title: 'Incident Handling',
    description: 'Implement incident handling capability for security incidents',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Deploy incident tracking system with automated correlation, prioritization, and notification',
    evidence: [],
    responsibleParty: 'Security Incident Response Team',
  },
  {
    id: 'ir-5',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.INCIDENT_RESPONSE,
    number: 'IR-5',
    title: 'Incident Monitoring',
    description: 'Track and document incidents',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Maintain audit trail of all incidents with timestamps, involved systems, and response actions',
    evidence: [],
    responsibleParty: 'Security Operations',
  },

  // System and Communications Protection (SC) Family
  {
    id: 'sc-7',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.SYSTEM_COMMUNICATIONS_PROTECTION,
    number: 'SC-7',
    title: 'Boundary Protection',
    description: 'Monitor and control communications at external system boundaries',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Deploy firewalls, DMZ architecture, and intrusion detection/prevention systems at all network boundaries',
    evidence: [],
    responsibleParty: 'Network Security',
  },
  {
    id: 'sc-8',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.SYSTEM_COMMUNICATIONS_PROTECTION,
    number: 'SC-8',
    title: 'Transmission Confidentiality and Integrity',
    description: 'Protect confidentiality and integrity of transmitted information',
    baseline: 'moderate',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Enforce TLS 1.3+ for all data in transit with certificate validation and perfect forward secrecy',
    evidence: [],
    responsibleParty: 'Application Security',
  },
  {
    id: 'sc-13',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.SYSTEM_COMMUNICATIONS_PROTECTION,
    number: 'SC-13',
    title: 'Cryptographic Protection',
    description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure and modification',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Use FIPS 140-2/140-3 validated cryptographic modules for all encryption operations',
    evidence: [],
    responsibleParty: 'Cryptography Team',
  },
  {
    id: 'sc-28',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.SYSTEM_COMMUNICATIONS_PROTECTION,
    number: 'SC-28',
    title: 'Protection of Information at Rest',
    description: 'Protect confidentiality and integrity of information at rest',
    baseline: 'moderate',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Implement AES-256 encryption for all data at rest with secure key management (HSM/KMS)',
    evidence: [],
    responsibleParty: 'Data Security',
  },

  // System and Information Integrity (SI) Family
  {
    id: 'si-2',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.SYSTEM_INFORMATION_INTEGRITY,
    number: 'SI-2',
    title: 'Flaw Remediation',
    description: 'Identify, report, and correct system flaws',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Establish vulnerability management program with automated scanning, patch management, and remediation tracking',
    evidence: [],
    responsibleParty: 'Vulnerability Management',
  },
  {
    id: 'si-4',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.SYSTEM_INFORMATION_INTEGRITY,
    number: 'SI-4',
    title: 'System Monitoring',
    description: 'Monitor system to detect attacks and unauthorized activities',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Deploy SIEM with real-time alerting, anomaly detection, and integration with threat intelligence feeds',
    evidence: [],
    responsibleParty: 'Security Operations',
  },

  // Risk Assessment (RA) Family
  {
    id: 'ra-3',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.RISK_ASSESSMENT,
    number: 'RA-3',
    title: 'Risk Assessment',
    description: 'Conduct risk assessments at defined intervals',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Perform annual risk assessments using NIST Risk Management Framework with documented threat modeling',
    evidence: [],
    responsibleParty: 'Risk Management',
  },
  {
    id: 'ra-5',
    framework: ComplianceFramework.NIST_800_53_REV5,
    family: ControlFamily.RISK_ASSESSMENT,
    number: 'RA-5',
    title: 'Vulnerability Monitoring and Scanning',
    description: 'Monitor and scan for vulnerabilities in the system',
    baseline: 'low',
    status: ControlStatus.NOT_IMPLEMENTED,
    implementation: 'Conduct monthly vulnerability scans and annual penetration testing with remediation tracking',
    evidence: [],
    responsibleParty: 'Vulnerability Management',
  },
];

/**
 * Get controls by baseline level
 */
export function getControlsByBaseline(baseline: 'low' | 'moderate' | 'high'): ComplianceControl[] {
  const baselineLevels = { low: 1, moderate: 2, high: 3 };
  const targetLevel = baselineLevels[baseline];

  return NIST_800_53_CONTROLS.filter(
    control => baselineLevels[control.baseline] <= targetLevel
  );
}

/**
 * Get controls by family
 */
export function getControlsByFamily(family: ControlFamily): ComplianceControl[] {
  return NIST_800_53_CONTROLS.filter(control => control.family === family);
}

/**
 * Get control by ID
 */
export function getControlById(id: string): ComplianceControl | undefined {
  return NIST_800_53_CONTROLS.find(control => control.id === id);
}

/**
 * Get FedRAMP required controls
 */
export function getFedRAMPControls(level: 'low' | 'moderate' | 'high'): ComplianceControl[] {
  return getControlsByBaseline(level);
}
