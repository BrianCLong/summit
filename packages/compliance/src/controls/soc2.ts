/**
 * SOC 2 Type II Trust Service Criteria
 * AICPA Trust Services Criteria for Security, Availability, Processing Integrity,
 * Confidentiality, and Privacy
 */

import { ControlStatus } from '../types.js';

export enum SOC2TrustServiceCategory {
  SECURITY = 'CC', // Common Criteria (Security)
  AVAILABILITY = 'A',
  PROCESSING_INTEGRITY = 'PI',
  CONFIDENTIALITY = 'C',
  PRIVACY = 'P',
}

export interface SOC2Control {
  id: string;
  category: SOC2TrustServiceCategory;
  number: string;
  title: string;
  criteria: string;
  illustrativeControls: string[];
  status: ControlStatus;
  testingProcedures?: string[];
}

export const SOC2_CONTROLS: SOC2Control[] = [
  // Common Criteria - Security
  {
    id: 'cc-1.1',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC1.1',
    title: 'Control Environment - COSO Principle 1',
    criteria: 'The entity demonstrates a commitment to integrity and ethical values',
    illustrativeControls: [
      'Code of conduct communicated to all personnel',
      'Disciplinary actions for violations',
      'Tone at the top reinforces ethical behavior',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
    testingProcedures: [
      'Review code of conduct',
      'Interview personnel about ethical standards',
      'Review disciplinary action records',
    ],
  },
  {
    id: 'cc-6.1',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC6.1',
    title: 'Logical and Physical Access Controls',
    criteria: 'The entity implements logical access security software, infrastructure, and architectures over protected information assets',
    illustrativeControls: [
      'Multi-factor authentication for privileged access',
      'Role-based access control (RBAC)',
      'Least privilege principle enforced',
      'Access reviews performed quarterly',
      'Segregation of duties matrix',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
    testingProcedures: [
      'Test MFA implementation',
      'Review access provisioning process',
      'Inspect access review logs',
      'Verify segregation of duties',
    ],
  },
  {
    id: 'cc-6.6',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC6.6',
    title: 'Logical and Physical Access - Removal',
    criteria: 'The entity implements logical access security measures to protect against unauthorized access',
    illustrativeControls: [
      'Automated deprovisioning upon termination',
      'Access revocation within 24 hours of separation',
      'Periodic review of terminated user access',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'cc-6.7',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC6.7',
    title: 'System Operations - Data Backup',
    criteria: 'The entity restricts the transmission, movement, and removal of information',
    illustrativeControls: [
      'Data loss prevention (DLP) tools',
      'Encryption of data in transit (TLS 1.3)',
      'Monitoring of data transfers',
      'USB/removable media controls',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'cc-7.1',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC7.1',
    title: 'System Operations - Detection',
    criteria: 'To meet its objectives, the entity uses detection and monitoring procedures to identify anomalies',
    illustrativeControls: [
      'SIEM system for security event correlation',
      'Intrusion detection/prevention systems (IDS/IPS)',
      'Log monitoring and alerting',
      'Anomaly detection for user behavior',
      '24/7 security operations center (SOC)',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'cc-7.2',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC7.2',
    title: 'System Operations - Monitoring',
    criteria: 'The entity monitors system components and the operation of those components for anomalies',
    illustrativeControls: [
      'Infrastructure monitoring (CPU, memory, disk)',
      'Application performance monitoring (APM)',
      'Network traffic analysis',
      'Database activity monitoring',
      'Automated alerting for threshold violations',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'cc-7.3',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC7.3',
    title: 'System Operations - Incident Response',
    criteria: 'The entity evaluates security events to determine whether they could or have resulted in a failure of controls',
    illustrativeControls: [
      'Incident response plan documented and tested',
      'Incident classification and prioritization',
      'Root cause analysis procedures',
      'Post-incident review process',
      'Communication plan for stakeholders',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'cc-7.4',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC7.4',
    title: 'System Operations - Incident Mitigation',
    criteria: 'The entity responds to identified security incidents by executing a defined incident response program',
    illustrativeControls: [
      'Automated containment procedures',
      'Evidence preservation protocols',
      'Communication templates',
      'Escalation procedures',
      'Recovery and restoration procedures',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'cc-8.1',
    category: SOC2TrustServiceCategory.SECURITY,
    number: 'CC8.1',
    title: 'Change Management',
    criteria: 'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures',
    illustrativeControls: [
      'Change management policy and procedures',
      'Change approval board (CAB)',
      'Testing in non-production environments',
      'Rollback procedures documented',
      'Change success criteria defined',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // Availability Criteria
  {
    id: 'a-1.1',
    category: SOC2TrustServiceCategory.AVAILABILITY,
    number: 'A1.1',
    title: 'Availability Monitoring',
    criteria: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components',
    illustrativeControls: [
      'Capacity planning process',
      'Performance baselines established',
      'Capacity thresholds and alerts',
      'Regular capacity reviews',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'a-1.2',
    category: SOC2TrustServiceCategory.AVAILABILITY,
    number: 'A1.2',
    title: 'Business Continuity and Disaster Recovery',
    criteria: 'The entity authorizes, designs, develops, implements, operates, approves, maintains, and monitors environmental protections, software, data backup processes, and recovery infrastructure',
    illustrativeControls: [
      'Disaster recovery plan (DRP)',
      'Business continuity plan (BCP)',
      'Regular backup testing',
      'Recovery time objective (RTO) defined',
      'Recovery point objective (RPO) defined',
      'Annual DR testing',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'a-1.3',
    category: SOC2TrustServiceCategory.AVAILABILITY,
    number: 'A1.3',
    title: 'Recovery and Failover',
    criteria: 'The entity provides for the recovery and continuity of operations in the event of a disaster or other disruption',
    illustrativeControls: [
      'Redundant systems and infrastructure',
      'Geographic redundancy',
      'Automated failover procedures',
      'Failover testing quarterly',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // Processing Integrity Criteria
  {
    id: 'pi-1.1',
    category: SOC2TrustServiceCategory.PROCESSING_INTEGRITY,
    number: 'PI1.1',
    title: 'Processing Integrity - Data Validation',
    criteria: 'The entity obtains or generates, uses, and communicates relevant, quality information to support the functioning of internal control',
    illustrativeControls: [
      'Input validation on all user inputs',
      'Data integrity checks',
      'Checksum verification',
      'Error handling and logging',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'pi-1.4',
    category: SOC2TrustServiceCategory.PROCESSING_INTEGRITY,
    number: 'PI1.4',
    title: 'Processing Integrity - Completeness and Accuracy',
    criteria: 'The entity implements policies and procedures to make available or deliver output completely, accurately, and timely',
    illustrativeControls: [
      'Transaction completeness verification',
      'Reconciliation procedures',
      'Data quality monitoring',
      'Output validation',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // Confidentiality Criteria
  {
    id: 'c-1.1',
    category: SOC2TrustServiceCategory.CONFIDENTIALITY,
    number: 'C1.1',
    title: 'Confidentiality - Data Classification',
    criteria: 'The entity identifies and maintains confidential information to meet the entity objectives',
    illustrativeControls: [
      'Data classification policy',
      'Confidential data inventory',
      'Data handling procedures by classification',
      'Regular classification reviews',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'c-1.2',
    category: SOC2TrustServiceCategory.CONFIDENTIALITY,
    number: 'C1.2',
    title: 'Confidentiality - Encryption',
    criteria: 'The entity disposes of confidential information to meet the entity objectives',
    illustrativeControls: [
      'Encryption at rest (AES-256)',
      'Encryption in transit (TLS 1.3)',
      'Key management procedures',
      'Cryptographic standards compliance (FIPS 140-2)',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // Privacy Criteria
  {
    id: 'p-1.1',
    category: SOC2TrustServiceCategory.PRIVACY,
    number: 'P1.1',
    title: 'Privacy - Notice and Consent',
    criteria: 'The entity provides notice to data subjects about its privacy practices',
    illustrativeControls: [
      'Privacy policy published and accessible',
      'Consent mechanisms for data collection',
      'Privacy notice updates communicated',
      'Cookie consent management',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'p-4.1',
    category: SOC2TrustServiceCategory.PRIVACY,
    number: 'P4.1',
    title: 'Privacy - Access and Correction',
    criteria: 'The entity grants identified and authenticated data subjects the ability to access their stored personal information',
    illustrativeControls: [
      'Data subject access request (DSAR) procedures',
      'Self-service data access portal',
      'Data correction mechanisms',
      'Response within 30 days',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'p-4.3',
    category: SOC2TrustServiceCategory.PRIVACY,
    number: 'P4.3',
    title: 'Privacy - Deletion and Retention',
    criteria: 'The entity retains personal information consistent with its objectives',
    illustrativeControls: [
      'Data retention policies',
      'Automated data deletion',
      'Legal hold procedures',
      'Secure deletion methods',
    ],
    status: ControlStatus.NOT_IMPLEMENTED,
  },
];

/**
 * Get controls by category
 */
export function getControlsByCategory(category: SOC2TrustServiceCategory): SOC2Control[] {
  return SOC2_CONTROLS.filter(control => control.category === category);
}

/**
 * Calculate SOC 2 compliance readiness
 */
export interface SOC2ComplianceReadiness {
  category: SOC2TrustServiceCategory;
  totalControls: number;
  implemented: number;
  partiallyImplemented: number;
  notImplemented: number;
  readinessPercentage: number;
}

export function calculateSOC2Readiness(
  implementedControls: Map<string, ControlStatus>
): {
  overall: SOC2ComplianceReadiness;
  byCategory: Map<SOC2TrustServiceCategory, SOC2ComplianceReadiness>;
} {
  const byCategory = new Map<SOC2TrustServiceCategory, SOC2ComplianceReadiness>();

  // Initialize categories
  for (const category of Object.values(SOC2TrustServiceCategory)) {
    byCategory.set(category, {
      category,
      totalControls: 0,
      implemented: 0,
      partiallyImplemented: 0,
      notImplemented: 0,
      readinessPercentage: 0,
    });
  }

  // Calculate per category
  for (const control of SOC2_CONTROLS) {
    const categoryStats = byCategory.get(control.category)!;
    categoryStats.totalControls++;

    const status = implementedControls.get(control.id);

    if (status === ControlStatus.IMPLEMENTED) {
      categoryStats.implemented++;
    } else if (status === ControlStatus.PARTIALLY_IMPLEMENTED) {
      categoryStats.partiallyImplemented++;
    } else {
      categoryStats.notImplemented++;
    }
  }

  // Calculate percentages
  let totalImplemented = 0;
  let totalPartiallyImplemented = 0;
  let totalNotImplemented = 0;

  for (const stats of byCategory.values()) {
    stats.readinessPercentage =
      ((stats.implemented + stats.partiallyImplemented * 0.5) / stats.totalControls) * 100;

    totalImplemented += stats.implemented;
    totalPartiallyImplemented += stats.partiallyImplemented;
    totalNotImplemented += stats.notImplemented;
  }

  const totalControls = SOC2_CONTROLS.length;
  const overall: SOC2ComplianceReadiness = {
    category: SOC2TrustServiceCategory.SECURITY,
    totalControls,
    implemented: totalImplemented,
    partiallyImplemented: totalPartiallyImplemented,
    notImplemented: totalNotImplemented,
    readinessPercentage:
      ((totalImplemented + totalPartiallyImplemented * 0.5) / totalControls) * 100,
  };

  return { overall, byCategory };
}

/**
 * SOC 2 Type II testing requirements
 */
export interface SOC2TestingRequirement {
  controlId: string;
  testingProcedure: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  sampleSize: string;
  evidenceRequired: string[];
}

export const SOC2_TESTING_REQUIREMENTS: SOC2TestingRequirement[] = [
  {
    controlId: 'cc-6.1',
    testingProcedure: 'Review user access provisioning and deprovisioning',
    frequency: 'quarterly',
    sampleSize: '25 samples per quarter',
    evidenceRequired: [
      'Access request tickets',
      'Approval records',
      'Access grant logs',
      'User access matrix',
    ],
  },
  {
    controlId: 'cc-7.1',
    testingProcedure: 'Review security alerts and incident tickets',
    frequency: 'monthly',
    sampleSize: '10 incidents per month',
    evidenceRequired: [
      'SIEM alert logs',
      'Incident tickets',
      'Investigation records',
      'Resolution documentation',
    ],
  },
  {
    controlId: 'cc-8.1',
    testingProcedure: 'Review change tickets for proper approval and testing',
    frequency: 'monthly',
    sampleSize: '25 changes per month',
    evidenceRequired: [
      'Change tickets',
      'CAB approval records',
      'Test results',
      'Deployment confirmation',
    ],
  },
  {
    controlId: 'a-1.2',
    testingProcedure: 'Verify backup and disaster recovery testing',
    frequency: 'annually',
    sampleSize: 'Annual DR test',
    evidenceRequired: [
      'DR test plan',
      'Test results',
      'Recovery time measurements',
      'Lessons learned',
    ],
  },
];
