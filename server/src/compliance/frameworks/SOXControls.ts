/**
 * SOX Compliance Controls
 *
 * Sarbanes-Oxley Act compliance controls focusing on IT General Controls (ITGC)
 * and their mapping to Summit governance capabilities.
 *
 * @module compliance/frameworks/SOXControls
 * @version 4.0.0-alpha
 */

// Local type definitions for SOX compliance controls
// Using string types for flexibility in prototype phase

export type ControlCategory =
  | 'Section 302 - Management Certification'
  | 'Section 404 - Internal Control Assessment'
  | 'Section 409 - Real-Time Disclosure'
  | 'IT General Controls (ITGC)';

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
// SOX Framework Overview
// =============================================================================

export const SOX_FRAMEWORK = {
  id: 'SOX',
  name: 'Sarbanes-Oxley Act',
  version: '2024',
  description: 'US federal law mandating financial reporting controls for public companies',
  effectiveDate: '2002-07-30',
  lastUpdated: '2024-01-01',
  jurisdiction: 'United States',
  regulatoryBody: 'SEC / PCAOB',
  categories: [
    'Section 302 - Management Certification',
    'Section 404 - Internal Control Assessment',
    'Section 409 - Real-Time Disclosure',
    'IT General Controls (ITGC)',
  ],
};

// =============================================================================
// Section 302 - Management Certification
// =============================================================================

export const SECTION_302_CONTROLS: ComplianceControl[] = [
  {
    id: 'SOX-302-001',
    framework: 'SOX',
    category: 'Section 302 - Management Certification',
    subcategory: 'CEO/CFO Certification',
    name: 'Quarterly Certification',
    description: 'CEO and CFO must certify quarterly and annual reports are accurate and complete.',
    requirement: 'SOX Section 302(a)',
    automatable: false,
    frequency: 'quarterly',
    evidenceTypes: ['attestation', 'certification_form', 'report'],
    implementationGuidance: 'Establish certification workflow with evidence collection.',
    summitMapping: {
      governanceControls: ['certification-workflow'],
      provenanceRequirements: ['certification-chain'],
      dataClassifications: ['financial', 'internal'],
    },
  },
  {
    id: 'SOX-302-002',
    framework: 'SOX',
    category: 'Section 302 - Management Certification',
    subcategory: 'Disclosure Controls',
    name: 'Disclosure Controls Effectiveness',
    description: 'Management must evaluate disclosure controls and procedures effectiveness.',
    requirement: 'SOX Section 302(a)(4)',
    automatable: true,
    frequency: 'quarterly',
    evidenceTypes: ['control_test', 'effectiveness_report'],
    implementationGuidance: 'Implement control testing with automated reporting.',
    summitMapping: {
      governanceControls: ['disclosure-controls-policy'],
      provenanceRequirements: ['control-test-chain'],
      dataClassifications: ['financial', 'internal'],
    },
  },
  {
    id: 'SOX-302-003',
    framework: 'SOX',
    category: 'Section 302 - Management Certification',
    subcategory: 'Internal Control Disclosure',
    name: 'Significant Control Deficiencies',
    description: 'Disclose significant deficiencies and material weaknesses to auditors and audit committee.',
    requirement: 'SOX Section 302(a)(5)',
    automatable: true,
    frequency: 'quarterly',
    evidenceTypes: ['deficiency_report', 'committee_minutes', 'auditor_communication'],
    implementationGuidance: 'Implement deficiency tracking and escalation workflow.',
    summitMapping: {
      governanceControls: ['deficiency-tracking-policy'],
      provenanceRequirements: ['deficiency-chain'],
      dataClassifications: ['financial', 'confidential'],
    },
  },
];

// =============================================================================
// Section 404 - Internal Control Assessment
// =============================================================================

export const SECTION_404_CONTROLS: ComplianceControl[] = [
  {
    id: 'SOX-404-001',
    framework: 'SOX',
    category: 'Section 404 - Internal Control Assessment',
    subcategory: 'Management Assessment',
    name: 'Internal Control Over Financial Reporting (ICFR)',
    description: 'Management must assess and report on the effectiveness of internal control over financial reporting.',
    requirement: 'SOX Section 404(a)',
    automatable: true,
    frequency: 'annual',
    evidenceTypes: ['icfr_assessment', 'control_matrix', 'test_results'],
    implementationGuidance: 'Implement ICFR assessment framework with control testing.',
    summitMapping: {
      governanceControls: ['icfr-policy'],
      provenanceRequirements: ['icfr-chain'],
      dataClassifications: ['financial', 'internal'],
    },
  },
  {
    id: 'SOX-404-002',
    framework: 'SOX',
    category: 'Section 404 - Internal Control Assessment',
    subcategory: 'Auditor Attestation',
    name: 'External Auditor Attestation',
    description: 'External auditor must attest to and report on management\'s assessment of ICFR.',
    requirement: 'SOX Section 404(b)',
    automatable: false,
    frequency: 'annual',
    evidenceTypes: ['auditor_report', 'attestation'],
    implementationGuidance: 'Provide auditor access to control evidence.',
    summitMapping: {
      governanceControls: ['auditor-access-policy'],
      provenanceRequirements: ['audit-chain'],
      dataClassifications: ['financial', 'confidential'],
    },
  },
  {
    id: 'SOX-404-003',
    framework: 'SOX',
    category: 'Section 404 - Internal Control Assessment',
    subcategory: 'Control Testing',
    name: 'Control Testing Program',
    description: 'Establish testing program to validate control design and operating effectiveness.',
    requirement: 'PCAOB AS 2201',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['test_plan', 'test_results', 'exception_log'],
    implementationGuidance: 'Implement continuous control testing with exception tracking.',
    summitMapping: {
      governanceControls: ['control-testing-policy'],
      provenanceRequirements: ['testing-chain'],
      dataClassifications: ['financial', 'internal'],
    },
  },
  {
    id: 'SOX-404-004',
    framework: 'SOX',
    category: 'Section 404 - Internal Control Assessment',
    subcategory: 'Material Weakness',
    name: 'Material Weakness Identification',
    description: 'Identify, classify, and remediate control deficiencies.',
    requirement: 'PCAOB AS 2201',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['deficiency_classification', 'remediation_plan', 'status_report'],
    implementationGuidance: 'Implement deficiency classification (Deficiency > Significant Deficiency > Material Weakness).',
    summitMapping: {
      governanceControls: ['material-weakness-policy'],
      provenanceRequirements: ['remediation-chain'],
      dataClassifications: ['financial', 'confidential'],
    },
  },
];

// =============================================================================
// IT General Controls (ITGC)
// =============================================================================

export const ITGC_ACCESS_CONTROLS: ComplianceControl[] = [
  // Logical Access
  {
    id: 'SOX-ITGC-LA-001',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Logical Access',
    name: 'User Access Provisioning',
    description: 'Formal process to grant, modify, and revoke user access based on job responsibilities.',
    requirement: 'ITGC Logical Access',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['access_request', 'approval_log', 'provisioning_log'],
    implementationGuidance: 'Implement automated provisioning with approval workflow.',
    summitMapping: {
      governanceControls: ['access-provisioning-policy'],
      provenanceRequirements: ['provisioning-chain'],
      dataClassifications: ['financial', 'system'],
    },
  },
  {
    id: 'SOX-ITGC-LA-002',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Logical Access',
    name: 'Periodic Access Reviews',
    description: 'Regular review of user access rights to ensure appropriateness.',
    requirement: 'ITGC Logical Access',
    automatable: true,
    frequency: 'quarterly',
    evidenceTypes: ['access_review', 'certification_log'],
    implementationGuidance: 'Conduct quarterly access certification campaigns.',
    summitMapping: {
      governanceControls: ['access-review-policy'],
      provenanceRequirements: ['review-chain'],
      dataClassifications: ['financial', 'system'],
    },
  },
  {
    id: 'SOX-ITGC-LA-003',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Logical Access',
    name: 'Privileged Access Management',
    description: 'Controls over privileged/administrative access to financial systems.',
    requirement: 'ITGC Logical Access',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['pam_log', 'session_recording', 'approval_workflow'],
    implementationGuidance: 'Implement PAM solution with session monitoring.',
    summitMapping: {
      governanceControls: ['pam-policy'],
      provenanceRequirements: ['pam-chain'],
      dataClassifications: ['financial', 'privileged'],
    },
  },
  {
    id: 'SOX-ITGC-LA-004',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Logical Access',
    name: 'Segregation of Duties',
    description: 'Ensure proper separation of duties to prevent fraud and errors.',
    requirement: 'ITGC Logical Access',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['sod_matrix', 'violation_log', 'exception_approval'],
    implementationGuidance: 'Implement SoD conflict detection and prevention.',
    summitMapping: {
      governanceControls: ['sod-policy'],
      provenanceRequirements: ['sod-chain'],
      dataClassifications: ['financial', 'internal'],
    },
  },
  {
    id: 'SOX-ITGC-LA-005',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Logical Access',
    name: 'Termination Processing',
    description: 'Timely removal of access upon employee termination.',
    requirement: 'ITGC Logical Access',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['termination_log', 'access_removal_log'],
    implementationGuidance: 'Automate access revocation triggered by HR systems.',
    summitMapping: {
      governanceControls: ['termination-policy'],
      provenanceRequirements: ['deprovisioning-chain'],
      dataClassifications: ['financial', 'hr'],
    },
  },
];

export const ITGC_CHANGE_MANAGEMENT: ComplianceControl[] = [
  {
    id: 'SOX-ITGC-CM-001',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Change Management',
    name: 'Change Request Process',
    description: 'Formal process for requesting, evaluating, and approving changes.',
    requirement: 'ITGC Change Management',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['change_request', 'approval_log', 'impact_assessment'],
    implementationGuidance: 'Implement change management workflow with approval gates.',
    summitMapping: {
      governanceControls: ['change-request-policy'],
      provenanceRequirements: ['change-chain'],
      dataClassifications: ['financial', 'system'],
    },
  },
  {
    id: 'SOX-ITGC-CM-002',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Change Management',
    name: 'Testing and Validation',
    description: 'Changes must be tested before promotion to production.',
    requirement: 'ITGC Change Management',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['test_results', 'validation_report', 'sign_off'],
    implementationGuidance: 'Implement automated testing in CI/CD pipeline.',
    summitMapping: {
      governanceControls: ['testing-policy'],
      provenanceRequirements: ['testing-chain'],
      dataClassifications: ['financial', 'system'],
    },
  },
  {
    id: 'SOX-ITGC-CM-003',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Change Management',
    name: 'Segregation of Development and Production',
    description: 'Developers should not have direct access to production systems.',
    requirement: 'ITGC Change Management',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['environment_config', 'access_review', 'deployment_log'],
    implementationGuidance: 'Implement environment separation with controlled deployment.',
    summitMapping: {
      governanceControls: ['environment-separation-policy'],
      provenanceRequirements: ['deployment-chain'],
      dataClassifications: ['financial', 'system'],
    },
  },
  {
    id: 'SOX-ITGC-CM-004',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Change Management',
    name: 'Emergency Change Process',
    description: 'Documented process for emergency changes with retroactive approval.',
    requirement: 'ITGC Change Management',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['emergency_change_log', 'retroactive_approval', 'root_cause'],
    implementationGuidance: 'Implement emergency change workflow with post-hoc review.',
    summitMapping: {
      governanceControls: ['emergency-change-policy'],
      provenanceRequirements: ['emergency-chain'],
      dataClassifications: ['financial', 'system'],
    },
  },
];

export const ITGC_OPERATIONS: ComplianceControl[] = [
  {
    id: 'SOX-ITGC-OP-001',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Computer Operations',
    name: 'Job Scheduling',
    description: 'Batch jobs and scheduled processes must complete successfully.',
    requirement: 'ITGC Computer Operations',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['job_log', 'completion_report', 'failure_alert'],
    implementationGuidance: 'Implement job monitoring with alerting.',
    summitMapping: {
      governanceControls: ['job-scheduling-policy'],
      provenanceRequirements: ['job-chain'],
      dataClassifications: ['financial', 'operational'],
    },
  },
  {
    id: 'SOX-ITGC-OP-002',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Computer Operations',
    name: 'Data Backup and Recovery',
    description: 'Regular backups with tested recovery procedures.',
    requirement: 'ITGC Computer Operations',
    automatable: true,
    frequency: 'daily',
    evidenceTypes: ['backup_log', 'recovery_test', 'offsite_confirmation'],
    implementationGuidance: 'Implement automated backup with quarterly recovery testing.',
    summitMapping: {
      governanceControls: ['backup-policy'],
      provenanceRequirements: ['backup-chain'],
      dataClassifications: ['financial', 'operational'],
    },
  },
  {
    id: 'SOX-ITGC-OP-003',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Computer Operations',
    name: 'Incident Management',
    description: 'Process for identifying, logging, and resolving IT incidents.',
    requirement: 'ITGC Computer Operations',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['incident_log', 'resolution_record', 'root_cause_analysis'],
    implementationGuidance: 'Implement incident management system with SLA tracking.',
    summitMapping: {
      governanceControls: ['incident-management-policy'],
      provenanceRequirements: ['incident-chain'],
      dataClassifications: ['financial', 'operational'],
    },
  },
  {
    id: 'SOX-ITGC-OP-004',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Computer Operations',
    name: 'Problem Management',
    description: 'Process for identifying root causes and preventing recurrence.',
    requirement: 'ITGC Computer Operations',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['problem_record', 'known_error_database', 'prevention_measure'],
    implementationGuidance: 'Implement problem management with trend analysis.',
    summitMapping: {
      governanceControls: ['problem-management-policy'],
      provenanceRequirements: ['problem-chain'],
      dataClassifications: ['financial', 'operational'],
    },
  },
];

export const ITGC_PROGRAM_DEVELOPMENT: ComplianceControl[] = [
  {
    id: 'SOX-ITGC-PD-001',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Program Development',
    name: 'SDLC Methodology',
    description: 'Formal software development lifecycle with documented phases.',
    requirement: 'ITGC Program Development',
    automatable: false,
    frequency: 'continuous',
    evidenceTypes: ['sdlc_documentation', 'phase_gate_approval', 'project_artifacts'],
    implementationGuidance: 'Document SDLC phases with required deliverables.',
    summitMapping: {
      governanceControls: ['sdlc-policy'],
      provenanceRequirements: ['development-chain'],
      dataClassifications: ['financial', 'development'],
    },
  },
  {
    id: 'SOX-ITGC-PD-002',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Program Development',
    name: 'Requirements Documentation',
    description: 'Business requirements must be documented and approved.',
    requirement: 'ITGC Program Development',
    automatable: false,
    frequency: 'as_needed',
    evidenceTypes: ['requirements_document', 'approval_log', 'stakeholder_sign_off'],
    implementationGuidance: 'Implement requirements management with traceability.',
    summitMapping: {
      governanceControls: ['requirements-policy'],
      provenanceRequirements: ['requirements-chain'],
      dataClassifications: ['financial', 'development'],
    },
  },
  {
    id: 'SOX-ITGC-PD-003',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Program Development',
    name: 'User Acceptance Testing',
    description: 'Business users must validate system meets requirements.',
    requirement: 'ITGC Program Development',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['uat_plan', 'test_results', 'sign_off'],
    implementationGuidance: 'Implement UAT workflow with formal sign-off.',
    summitMapping: {
      governanceControls: ['uat-policy'],
      provenanceRequirements: ['uat-chain'],
      dataClassifications: ['financial', 'development'],
    },
  },
  {
    id: 'SOX-ITGC-PD-004',
    framework: 'SOX',
    category: 'IT General Controls (ITGC)',
    subcategory: 'Program Development',
    name: 'Code Review',
    description: 'Code changes must be reviewed before deployment.',
    requirement: 'ITGC Program Development',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['code_review_log', 'approval_record', 'merge_request'],
    implementationGuidance: 'Implement mandatory code review in version control.',
    summitMapping: {
      governanceControls: ['code-review-policy'],
      provenanceRequirements: ['review-chain'],
      dataClassifications: ['financial', 'development'],
    },
  },
];

// =============================================================================
// Section 409 - Real-Time Disclosure
// =============================================================================

export const SECTION_409_CONTROLS: ComplianceControl[] = [
  {
    id: 'SOX-409-001',
    framework: 'SOX',
    category: 'Section 409 - Real-Time Disclosure',
    subcategory: 'Material Event Detection',
    name: 'Material Event Identification',
    description: 'Process to identify material events requiring rapid disclosure.',
    requirement: 'SOX Section 409',
    automatable: true,
    frequency: 'continuous',
    evidenceTypes: ['event_log', 'materiality_assessment', 'disclosure_decision'],
    implementationGuidance: 'Implement material event detection with threshold alerts.',
    summitMapping: {
      governanceControls: ['material-event-policy'],
      provenanceRequirements: ['event-chain'],
      dataClassifications: ['financial', 'material'],
    },
  },
  {
    id: 'SOX-409-002',
    framework: 'SOX',
    category: 'Section 409 - Real-Time Disclosure',
    subcategory: 'Rapid Disclosure',
    name: '8-K Filing Process',
    description: 'Timely filing of 8-K reports for material events.',
    requirement: 'SOX Section 409',
    automatable: true,
    frequency: 'as_needed',
    evidenceTypes: ['filing_record', 'deadline_tracking', 'approval_log'],
    implementationGuidance: 'Implement 8-K filing workflow with deadline tracking.',
    summitMapping: {
      governanceControls: ['8k-filing-policy'],
      provenanceRequirements: ['filing-chain'],
      dataClassifications: ['financial', 'public'],
    },
  },
];

// =============================================================================
// Export All Controls
// =============================================================================

export const ALL_SOX_CONTROLS: ComplianceControl[] = [
  ...SECTION_302_CONTROLS,
  ...SECTION_404_CONTROLS,
  ...ITGC_ACCESS_CONTROLS,
  ...ITGC_CHANGE_MANAGEMENT,
  ...ITGC_OPERATIONS,
  ...ITGC_PROGRAM_DEVELOPMENT,
  ...SECTION_409_CONTROLS,
];

export const SOX_CONTROL_COUNT = {
  section302: SECTION_302_CONTROLS.length,
  section404: SECTION_404_CONTROLS.length,
  itgcAccess: ITGC_ACCESS_CONTROLS.length,
  itgcChange: ITGC_CHANGE_MANAGEMENT.length,
  itgcOperations: ITGC_OPERATIONS.length,
  itgcProgram: ITGC_PROGRAM_DEVELOPMENT.length,
  section409: SECTION_409_CONTROLS.length,
  total: ALL_SOX_CONTROLS.length,
};

// =============================================================================
// ITGC Domains
// =============================================================================

export const ITGC_DOMAINS = [
  {
    id: 'logical_access',
    name: 'Logical Access',
    description: 'Controls over user access to systems and data',
    controls: ITGC_ACCESS_CONTROLS.map((c) => c.id),
  },
  {
    id: 'change_management',
    name: 'Change Management',
    description: 'Controls over changes to systems and applications',
    controls: ITGC_CHANGE_MANAGEMENT.map((c) => c.id),
  },
  {
    id: 'computer_operations',
    name: 'Computer Operations',
    description: 'Controls over IT operations and infrastructure',
    controls: ITGC_OPERATIONS.map((c) => c.id),
  },
  {
    id: 'program_development',
    name: 'Program Development',
    description: 'Controls over software development lifecycle',
    controls: ITGC_PROGRAM_DEVELOPMENT.map((c) => c.id),
  },
];

// =============================================================================
// SOX Compliance Service
// =============================================================================

export interface SOXAssessmentResult {
  controlId: string;
  controlName: string;
  status: 'effective' | 'ineffective' | 'needs_improvement' | 'not_tested';
  findings: string[];
  evidenceCollected: string[];
  deficiencyLevel?: 'deficiency' | 'significant_deficiency' | 'material_weakness';
  remediationRequired: boolean;
  remediationSteps?: string[];
  assessedAt: string;
  assessedBy: string;
}

export interface SOXComplianceReport {
  assessmentId: string;
  tenantId: string;
  assessmentPeriod: {
    start: string;
    end: string;
  };
  assessedAt: string;
  overallOpinion: 'effective' | 'ineffective' | 'qualified';
  controlResults: SOXAssessmentResult[];
  summary: {
    totalControls: number;
    effective: number;
    ineffective: number;
    needsImprovement: number;
    notTested: number;
    materialWeaknesses: number;
    significantDeficiencies: number;
  };
  itgcDomainResults: Array<{
    domainId: string;
    domainName: string;
    effectiveControls: number;
    totalControls: number;
    status: 'effective' | 'ineffective' | 'partially_effective';
  }>;
  managementAssertions?: {
    icfrEffective: boolean;
    signedBy?: string;
    signedAt?: string;
  };
  remediationPlan?: {
    priority: 'high' | 'medium' | 'low';
    items: Array<{
      controlId: string;
      action: string;
      deadline?: string;
      responsible?: string;
    }>;
  };
}

export class SOXComplianceService {
  private assessmentHistory: Map<string, SOXComplianceReport> = new Map();

  /**
   * Get all SOX controls
   */
  getControls(): ComplianceControl[] {
    return ALL_SOX_CONTROLS;
  }

  /**
   * Get a specific control by ID
   */
  getControl(controlId: string): ComplianceControl | undefined {
    return ALL_SOX_CONTROLS.find((c) => c.id === controlId);
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(category: ControlCategory): ComplianceControl[] {
    return ALL_SOX_CONTROLS.filter((c) => c.category === category);
  }

  /**
   * Get all ITGC domains
   */
  getITGCDomains(): typeof ITGC_DOMAINS {
    return ITGC_DOMAINS;
  }

  /**
   * Get controls for a specific ITGC domain
   */
  getControlsByDomain(domainId: string): ComplianceControl[] {
    const domain = ITGC_DOMAINS.find((d) => d.id === domainId);
    if (!domain) {
      return [];
    }
    return ALL_SOX_CONTROLS.filter((c) => domain.controls.includes(c.id));
  }

  /**
   * Assess a specific control
   */
  async assessControl(
    controlId: string,
    tenantId: string,
    evidence: Record<string, unknown>
  ): Promise<SOXAssessmentResult> {
    const control = this.getControl(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const findings: string[] = [];
    const evidenceCollected: string[] = Object.keys(evidence);
    let status: SOXAssessmentResult['status'] = 'effective';
    let deficiencyLevel: SOXAssessmentResult['deficiencyLevel'];

    // Check if required evidence types are present
    const missingEvidence = control.evidenceTypes.filter(
      (et) => !evidenceCollected.some((ec) => ec.includes(et))
    );

    if (missingEvidence.length > 0) {
      findings.push(`Missing required evidence: ${missingEvidence.join(', ')}`);
      status = missingEvidence.length === control.evidenceTypes.length
        ? 'ineffective'
        : 'needs_improvement';
    }

    // Control-specific checks
    const controlChecks = this.performControlSpecificChecks(control, evidence);
    findings.push(...controlChecks.findings);

    if (controlChecks.issues > 0) {
      if (controlChecks.issues >= 3) {
        status = 'ineffective';
        deficiencyLevel = controlChecks.critical
          ? 'material_weakness'
          : 'significant_deficiency';
      } else {
        status = 'needs_improvement';
        deficiencyLevel = 'deficiency';
      }
    }

    const remediationRequired = status !== 'effective';
    const remediationSteps = remediationRequired
      ? this.generateRemediationSteps(control, findings)
      : undefined;

    return {
      controlId,
      controlName: control.name,
      status,
      findings,
      evidenceCollected,
      deficiencyLevel,
      remediationRequired,
      remediationSteps,
      assessedAt: new Date().toISOString(),
      assessedBy: 'system:sox-compliance-service',
    };
  }

  /**
   * Perform full SOX compliance assessment
   */
  async performAssessment(
    tenantId: string,
    options: {
      assessmentPeriod?: { start: string; end: string };
      categories?: ControlCategory[];
      excludeControls?: string[];
      itgcDomainsOnly?: boolean;
    } = {}
  ): Promise<SOXComplianceReport> {
    const assessmentId = `sox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let controls = ALL_SOX_CONTROLS;

    if (options.itgcDomainsOnly) {
      controls = [
        ...ITGC_ACCESS_CONTROLS,
        ...ITGC_CHANGE_MANAGEMENT,
        ...ITGC_OPERATIONS,
        ...ITGC_PROGRAM_DEVELOPMENT,
      ];
    }
    if (options.categories) {
      controls = controls.filter((c) => options.categories!.includes(c.category));
    }
    if (options.excludeControls) {
      controls = controls.filter((c) => !options.excludeControls!.includes(c.id));
    }

    const controlResults: SOXAssessmentResult[] = [];
    for (const control of controls) {
      const result = await this.assessControl(control.id, tenantId, {});
      controlResults.push(result);
    }

    const summary = {
      totalControls: controlResults.length,
      effective: controlResults.filter((r: any) => r.status === 'effective').length,
      ineffective: controlResults.filter((r: any) => r.status === 'ineffective').length,
      needsImprovement: controlResults.filter((r: any) => r.status === 'needs_improvement').length,
      notTested: controlResults.filter((r: any) => r.status === 'not_tested').length,
      materialWeaknesses: controlResults.filter((r: any) => r.deficiencyLevel === 'material_weakness').length,
      significantDeficiencies: controlResults.filter((r: any) => r.deficiencyLevel === 'significant_deficiency').length,
    };

    // Calculate ITGC domain results
    const itgcDomainResults = ITGC_DOMAINS.map((domain) => {
      const domainResults = controlResults.filter((r: any) => domain.controls.includes(r.controlId));
      const effective = domainResults.filter((r: any) => r.status === 'effective').length;
      const total = domainResults.length;

      let status: 'effective' | 'ineffective' | 'partially_effective';
      if (effective === total) {
        status = 'effective';
      } else if (effective === 0) {
        status = 'ineffective';
      } else {
        status = 'partially_effective';
      }

      return {
        domainId: domain.id,
        domainName: domain.name,
        effectiveControls: effective,
        totalControls: total,
        status,
      };
    });

    // Determine overall opinion
    let overallOpinion: SOXComplianceReport['overallOpinion'];
    if (summary.materialWeaknesses > 0) {
      overallOpinion = 'ineffective';
    } else if (summary.significantDeficiencies > 0 || summary.ineffective > 0) {
      overallOpinion = 'qualified';
    } else {
      overallOpinion = 'effective';
    }

    const now = new Date();
    const assessmentPeriod = options.assessmentPeriod || {
      start: new Date(now.getFullYear(), 0, 1).toISOString(),
      end: now.toISOString(),
    };

    const report: SOXComplianceReport = {
      assessmentId,
      tenantId,
      assessmentPeriod,
      assessedAt: now.toISOString(),
      overallOpinion,
      controlResults,
      summary,
      itgcDomainResults,
      remediationPlan: overallOpinion !== 'effective'
        ? this.generateRemediationPlan(controlResults)
        : undefined,
    };

    this.assessmentHistory.set(assessmentId, report);
    return report;
  }

  /**
   * Get assessment history for a tenant
   */
  getAssessmentHistory(tenantId: string): SOXComplianceReport[] {
    return Array.from(this.assessmentHistory.values()).filter(
      (r: any) => r.tenantId === tenantId
    );
  }

  /**
   * Get a specific assessment by ID
   */
  getAssessment(assessmentId: string): SOXComplianceReport | undefined {
    return this.assessmentHistory.get(assessmentId);
  }

  /**
   * Record management assertion for ICFR
   */
  async recordManagementAssertion(
    assessmentId: string,
    assertion: {
      icfrEffective: boolean;
      signedBy: string;
    }
  ): Promise<SOXComplianceReport> {
    const report = this.assessmentHistory.get(assessmentId);
    if (!report) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const updated: SOXComplianceReport = {
      ...report,
      managementAssertions: {
        icfrEffective: assertion.icfrEffective,
        signedBy: assertion.signedBy,
        signedAt: new Date().toISOString(),
      },
    };

    this.assessmentHistory.set(assessmentId, updated);
    return updated;
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

    return {
      evidenceId,
      recordedAt: new Date().toISOString(),
    };
  }

  private performControlSpecificChecks(
    control: ComplianceControl,
    evidence: Record<string, unknown>
  ): { findings: string[]; issues: number; critical: boolean } {
    const findings: string[] = [];
    let issues = 0;
    let critical = false;

    switch (control.id) {
      case 'SOX-ITGC-LA-003': // Privileged Access Management
        if (!evidence.pamEnabled) {
          findings.push('Privileged Access Management not implemented');
          issues++;
          critical = true;
        }
        break;

      case 'SOX-ITGC-LA-004': // Segregation of Duties
        if (!evidence.sodMatrixDefined) {
          findings.push('Segregation of Duties matrix not defined');
          issues++;
        }
        if (evidence.sodViolations && (evidence.sodViolations as number) > 0) {
          findings.push(`Active SoD violations detected: ${evidence.sodViolations}`);
          issues++;
          critical = true;
        }
        break;

      case 'SOX-ITGC-CM-003': // Dev/Prod Separation
        if (!evidence.environmentSeparation) {
          findings.push('Development and production environments not properly separated');
          issues++;
          critical = true;
        }
        break;

      case 'SOX-404-001': // ICFR
        if (!evidence.icfrAssessmentCompleted) {
          findings.push('ICFR assessment not completed for current period');
          issues++;
          critical = true;
        }
        break;
    }

    return { findings, issues, critical };
  }

  private generateRemediationSteps(
    control: ComplianceControl,
    findings: string[]
  ): string[] {
    const steps: string[] = [];

    steps.push(`Review ${control.name} requirements (${control.requirement})`);
    steps.push(`Address findings: ${findings.join('; ')}`);
    steps.push(control.implementationGuidance);

    if (control.automatable) {
      steps.push('Implement automated controls for continuous compliance monitoring');
    }

    return steps;
  }

  private generateRemediationPlan(
    results: SOXAssessmentResult[]
  ): SOXComplianceReport['remediationPlan'] {
    const materialWeaknesses = results.filter((r: any) => r.deficiencyLevel === 'material_weakness');
    const significantDeficiencies = results.filter((r: any) => r.deficiencyLevel === 'significant_deficiency');
    const deficiencies = results.filter((r: any) => r.deficiencyLevel === 'deficiency');

    const items: Array<{ controlId: string; action: string; deadline?: string; responsible?: string }> = [];

    // Material weaknesses - immediate priority
    for (const result of materialWeaknesses) {
      items.push({
        controlId: result.controlId,
        action: `CRITICAL: Remediate material weakness in ${result.controlName}`,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        responsible: 'CFO/CIO',
      });
    }

    // Significant deficiencies - high priority
    for (const result of significantDeficiencies) {
      items.push({
        controlId: result.controlId,
        action: `HIGH: Remediate significant deficiency in ${result.controlName}`,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        responsible: 'Control Owner',
      });
    }

    // Other deficiencies
    for (const result of deficiencies) {
      items.push({
        controlId: result.controlId,
        action: `Improve ${result.controlName}: ${result.findings.join('; ')}`,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      priority: materialWeaknesses.length > 0 ? 'high' : significantDeficiencies.length > 0 ? 'medium' : 'low',
      items,
    };
  }
}

// Factory function
export function createSOXComplianceService(): SOXComplianceService {
  return new SOXComplianceService();
}

export default {
  framework: SOX_FRAMEWORK,
  controls: ALL_SOX_CONTROLS,
  counts: SOX_CONTROL_COUNT,
  domains: ITGC_DOMAINS,
};
