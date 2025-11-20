/**
 * FedRAMP Compliance Controls
 * Federal Risk and Authorization Management Program requirements
 */

import { ComplianceFramework, ControlStatus } from '../types.js';
import { getFedRAMPControls } from './nist-800-53.js';

export enum FedRAMPLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
}

export interface FedRAMPRequirement {
  level: FedRAMPLevel;
  controlIds: string[];
  additionalRequirements: string[];
}

/**
 * FedRAMP Low Baseline Requirements
 * For low-impact SaaS applications
 */
export const FEDRAMP_LOW_REQUIREMENTS: FedRAMPRequirement = {
  level: FedRAMPLevel.LOW,
  controlIds: [
    'ac-1', 'ac-2', 'ac-3', 'ac-7', 'ac-8', 'ac-14', 'ac-17', 'ac-18', 'ac-19', 'ac-20', 'ac-22',
    'at-1', 'at-2', 'at-3', 'at-4',
    'au-1', 'au-2', 'au-3', 'au-4', 'au-5', 'au-6', 'au-8', 'au-9', 'au-11', 'au-12',
    'ca-1', 'ca-2', 'ca-3', 'ca-5', 'ca-6', 'ca-7', 'ca-9',
    'cm-1', 'cm-2', 'cm-4', 'cm-6', 'cm-7', 'cm-8', 'cm-10', 'cm-11',
    'cp-1', 'cp-2', 'cp-3', 'cp-4', 'cp-9', 'cp-10',
    'ia-1', 'ia-2', 'ia-4', 'ia-5', 'ia-6', 'ia-7', 'ia-8',
    'ir-1', 'ir-2', 'ir-4', 'ir-5', 'ir-6', 'ir-7', 'ir-8',
    'ma-1', 'ma-2', 'ma-4', 'ma-5',
    'mp-1', 'mp-2', 'mp-6', 'mp-7',
    'pe-1', 'pe-2', 'pe-3', 'pe-6', 'pe-8', 'pe-12', 'pe-13', 'pe-14', 'pe-15', 'pe-16',
    'pl-1', 'pl-2', 'pl-4',
    'ps-1', 'ps-2', 'ps-3', 'ps-4', 'ps-5', 'ps-6', 'ps-7', 'ps-8',
    'ra-1', 'ra-2', 'ra-3', 'ra-5',
    'sa-1', 'sa-2', 'sa-3', 'sa-4', 'sa-5', 'sa-9',
    'sc-1', 'sc-5', 'sc-7', 'sc-12', 'sc-13', 'sc-15', 'sc-20', 'sc-21', 'sc-22', 'sc-39',
    'si-1', 'si-2', 'si-3', 'si-4', 'si-5', 'si-12',
  ],
  additionalRequirements: [
    'Annual security assessment required',
    'Continuous monitoring program',
    'Incident response plan',
    'FIPS 140-2 validated cryptography',
    'Multi-factor authentication for privileged users',
    'Encryption of data at rest and in transit',
  ],
};

/**
 * FedRAMP Moderate Baseline Requirements
 * For moderate-impact SaaS applications
 */
export const FEDRAMP_MODERATE_REQUIREMENTS: FedRAMPRequirement = {
  level: FedRAMPLevel.MODERATE,
  controlIds: [
    ...FEDRAMP_LOW_REQUIREMENTS.controlIds,
    'ac-4', 'ac-5', 'ac-6', 'ac-10', 'ac-11', 'ac-12', 'ac-21',
    'au-7', 'au-10',
    'ca-8',
    'cm-3', 'cm-5', 'cm-9',
    'cp-6', 'cp-7', 'cp-8',
    'ia-3',
    'ir-3',
    'ma-3', 'ma-6',
    'mp-3', 'mp-4', 'mp-5',
    'pe-4', 'pe-5', 'pe-9', 'pe-10', 'pe-11', 'pe-17', 'pe-18',
    'pl-8',
    'pm-1', 'pm-2', 'pm-3', 'pm-4', 'pm-5', 'pm-6', 'pm-7', 'pm-8', 'pm-9', 'pm-10', 'pm-11',
    'ra-6',
    'sa-6', 'sa-7', 'sa-8', 'sa-10', 'sa-11',
    'sc-2', 'sc-3', 'sc-4', 'sc-8', 'sc-10', 'sc-23', 'sc-28',
    'si-6', 'si-7', 'si-8', 'si-10', 'si-11', 'si-16',
  ],
  additionalRequirements: [
    ...FEDRAMP_LOW_REQUIREMENTS.additionalRequirements,
    'Annual penetration testing',
    'Security awareness training',
    'Configuration management database (CMDB)',
    'Disaster recovery plan with regular testing',
    'Multi-factor authentication for all users',
  ],
};

/**
 * FedRAMP High Baseline Requirements
 * For high-impact systems and classified data
 */
export const FEDRAMP_HIGH_REQUIREMENTS: FedRAMPRequirement = {
  level: FedRAMPLevel.HIGH,
  controlIds: [
    ...FEDRAMP_MODERATE_REQUIREMENTS.controlIds,
    'ac-16', 'ac-24', 'ac-25',
    'at-5',
    'au-13', 'au-14', 'au-15', 'au-16',
    'ca-10',
    'cm-12',
    'cp-11', 'cp-13',
    'ia-9', 'ia-10', 'ia-11',
    'ir-9', 'ir-10',
    'mp-8',
    'pe-19', 'pe-20',
    'pl-9',
    'pm-12', 'pm-13', 'pm-14', 'pm-15', 'pm-16',
    'ra-7', 'ra-8', 'ra-9', 'ra-10',
    'sa-12', 'sa-15', 'sa-16', 'sa-17',
    'sc-6', 'sc-11', 'sc-16', 'sc-17', 'sc-18', 'sc-19', 'sc-24', 'sc-36', 'sc-37', 'sc-40',
    'si-13', 'si-14', 'si-17', 'si-18', 'si-19', 'si-20',
  ],
  additionalRequirRequirements: [
    ...FEDRAMP_MODERATE_REQUIREMENTS.additionalRequirements,
    'FIPS 140-3 validated cryptography',
    'Personnel security clearances for admin access',
    'Continuous monitoring with automated response',
    'Red team exercises',
    'Supply chain risk management',
    'Insider threat program',
  ],
};

/**
 * Check FedRAMP compliance status
 */
export interface FedRAMPComplianceStatus {
  level: FedRAMPLevel;
  totalRequirements: number;
  metRequirements: number;
  partiallyMet: number;
  notMet: number;
  compliancePercentage: number;
  missingControls: string[];
  status: 'compliant' | 'non_compliant' | 'partially_compliant';
}

/**
 * Calculate FedRAMP compliance status
 */
export function calculateFedRAMPCompliance(
  level: FedRAMPLevel,
  implementedControls: Map<string, ControlStatus>
): FedRAMPComplianceStatus {
  const requirements =
    level === FedRAMPLevel.LOW ? FEDRAMP_LOW_REQUIREMENTS :
    level === FedRAMPLevel.MODERATE ? FEDRAMP_MODERATE_REQUIREMENTS :
    FEDRAMP_HIGH_REQUIREMENTS;

  let metRequirements = 0;
  let partiallyMet = 0;
  let notMet = 0;
  const missingControls: string[] = [];

  for (const controlId of requirements.controlIds) {
    const status = implementedControls.get(controlId);

    if (status === ControlStatus.IMPLEMENTED) {
      metRequirements++;
    } else if (status === ControlStatus.PARTIALLY_IMPLEMENTED) {
      partiallyMet++;
    } else {
      notMet++;
      missingControls.push(controlId);
    }
  }

  const totalRequirements = requirements.controlIds.length;
  const compliancePercentage = (metRequirements / totalRequirements) * 100;

  let status: 'compliant' | 'non_compliant' | 'partially_compliant';
  if (compliancePercentage === 100) {
    status = 'compliant';
  } else if (compliancePercentage >= 80) {
    status = 'partially_compliant';
  } else {
    status = 'non_compliant';
  }

  return {
    level,
    totalRequirements,
    metRequirements,
    partiallyMet,
    notMet,
    compliancePercentage,
    missingControls,
    status,
  };
}

/**
 * Get FedRAMP authorization package requirements
 */
export interface FedRAMPPackageRequirements {
  documents: string[];
  artifacts: string[];
  templates: string[];
}

export function getFedRAMPPackageRequirements(level: FedRAMPLevel): FedRAMPPackageRequirements {
  const baseDocuments = [
    'System Security Plan (SSP)',
    'Security Assessment Plan (SAP)',
    'Security Assessment Report (SAR)',
    'Plan of Action and Milestones (POA&M)',
    'Rules of Engagement (ROE)',
    'Privacy Impact Assessment (PIA)',
    'E-Authentication Risk Assessment',
    'Incident Response Plan',
    'Configuration Management Plan',
    'Continuous Monitoring Plan',
    'Contingency Plan',
    'Separation of Duties Matrix',
    'User Guide',
    'Digital Identity Worksheet',
    'FIPS 199 Categorization',
    'Laws and Regulations Matrix',
  ];

  const moderateAdditions = [
    'Penetration Test Report',
    'Disaster Recovery Plan',
    'Security Awareness Training Plan',
    'Supply Chain Risk Management Plan',
  ];

  const highAdditions = [
    'Insider Threat Program',
    'Red Team Exercise Report',
    'Personnel Security Procedures',
    'Supply Chain Security Controls',
  ];

  let documents = [...baseDocuments];
  if (level === FedRAMPLevel.MODERATE || level === FedRAMPLevel.HIGH) {
    documents = [...documents, ...moderateAdditions];
  }
  if (level === FedRAMPLevel.HIGH) {
    documents = [...documents, ...highAdditions];
  }

  return {
    documents,
    artifacts: [
      'System boundary diagrams',
      'Network diagrams',
      'Data flow diagrams',
      'Authorization documentation',
      'Scan results',
      'Vulnerability assessments',
      'Evidence of control implementation',
    ],
    templates: [
      'FedRAMP SSP Template',
      'FedRAMP SAP Template',
      'FedRAMP SAR Template',
      'FedRAMP POA&M Template',
    ],
  };
}
