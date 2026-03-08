"use strict";
/**
 * CMMC 2.0 (Cybersecurity Maturity Model Certification) Controls
 *
 * Implementation of CMMC 2.0 with 3 levels and practices based on
 * NIST SP 800-171 requirements for protecting Controlled Unclassified Information (CUI).
 *
 * SOC 2 Controls: CC6.1 (Logical Access), CC6.8 (System Operations)
 *
 * @module compliance/frameworks/CMMCControls
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMMCControlsService = exports.DOMAIN_METADATA = exports.LEVEL_DESCRIPTIONS = void 0;
exports.getCMMCControlsService = getCMMCControlsService;
const events_1 = require("events");
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../../types/data-envelope.js");
/**
 * Level descriptions
 */
exports.LEVEL_DESCRIPTIONS = {
    1: {
        name: 'Foundational',
        description: 'Basic safeguarding of Federal Contract Information (FCI)',
        practiceCount: 17,
        assessmentType: 'self',
        applicableTo: 'Contractors handling FCI only',
        nistBasis: 'FAR 52.204-21',
    },
    2: {
        name: 'Advanced',
        description: 'Protection of Controlled Unclassified Information (CUI)',
        practiceCount: 110,
        assessmentType: 'c3pao',
        applicableTo: 'Contractors handling CUI',
        nistBasis: 'NIST SP 800-171',
    },
    3: {
        name: 'Expert',
        description: 'Enhanced protection against Advanced Persistent Threats (APTs)',
        practiceCount: 130,
        assessmentType: 'government',
        applicableTo: 'Contractors handling critical CUI or supporting high-priority programs',
        nistBasis: 'NIST SP 800-171 + subset of NIST SP 800-172',
    },
};
/**
 * Domain metadata
 */
exports.DOMAIN_METADATA = {
    AC: {
        name: 'Access Control',
        description: 'Limit system access to authorized users, processes, and devices, and limit the types of transactions and functions that authorized users are permitted to execute.',
        nist171Family: '3.1',
    },
    AT: {
        name: 'Awareness and Training',
        description: 'Ensure that managers and users of organizational systems are made aware of the security risks and applicable policies.',
        nist171Family: '3.2',
    },
    AU: {
        name: 'Audit and Accountability',
        description: 'Create, protect, and retain system audit records to enable monitoring, analysis, investigation, and reporting.',
        nist171Family: '3.3',
    },
    CA: {
        name: 'Assessment, Authorization, and Monitoring',
        description: 'Periodically assess security controls to determine effectiveness, develop and implement plans of action, and monitor security controls on an ongoing basis.',
        nist171Family: '3.12',
    },
    CM: {
        name: 'Configuration Management',
        description: 'Establish and maintain baseline configurations and inventories of systems, and enforce security configuration settings.',
        nist171Family: '3.4',
    },
    IA: {
        name: 'Identification and Authentication',
        description: 'Identify and authenticate users, processes, and devices as a prerequisite to allowing access to systems.',
        nist171Family: '3.5',
    },
    IR: {
        name: 'Incident Response',
        description: 'Establish incident-handling capability including preparation, detection, analysis, containment, recovery, and user response activities.',
        nist171Family: '3.6',
    },
    MA: {
        name: 'Maintenance',
        description: 'Perform timely maintenance on systems and provide effective controls on maintenance tools, techniques, and personnel.',
        nist171Family: '3.7',
    },
    MP: {
        name: 'Media Protection',
        description: 'Protect system media containing CUI and limit access to CUI on system media to authorized users.',
        nist171Family: '3.8',
    },
    PE: {
        name: 'Physical Protection',
        description: 'Limit physical access to systems, equipment, and operating environments to authorized individuals.',
        nist171Family: '3.10',
    },
    PS: {
        name: 'Personnel Security',
        description: 'Screen individuals prior to authorizing access and ensure systems are protected during and after personnel actions.',
        nist171Family: '3.9',
    },
    RA: {
        name: 'Risk Assessment',
        description: 'Periodically assess risk and vulnerabilities in systems and take appropriate action to address identified risks.',
        nist171Family: '3.11',
    },
    SC: {
        name: 'System and Communications Protection',
        description: 'Monitor, control, and protect communications at external and key internal boundaries, and employ architectural designs to protect confidentiality.',
        nist171Family: '3.13',
    },
    SI: {
        name: 'System and Information Integrity',
        description: 'Identify, report, and correct system flaws in a timely manner; protect against malicious code; and monitor system security alerts.',
        nist171Family: '3.14',
    },
};
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'cmmc-compliance-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'CMMCControls',
    };
}
// ============================================================================
// CMMC Practices Data
// ============================================================================
/**
 * Representative CMMC 2.0 Practices (subset for implementation)
 */
const CMMC_PRACTICES = [
    // Level 1 - Access Control
    {
        id: 'cmmc-ac-l1-001',
        practiceId: 'AC.L1-3.1.1',
        domain: 'AC',
        level: 1,
        title: 'Authorized Access Control',
        description: 'Limit system access to authorized users, processes acting on behalf of authorized users, or devices (including other systems).',
        discussionPoints: [
            'User account management',
            'Process identification and authentication',
            'Device authentication',
        ],
        assessmentObjectives: [
            {
                id: 'ac.l1-3.1.1[a]',
                description: 'Authorized users are identified.',
                examineMethods: ['Access control policy', 'User accounts list'],
                interviewSubjects: ['System administrators'],
                testProcedures: ['Attempt unauthorized access'],
            },
            {
                id: 'ac.l1-3.1.1[b]',
                description: 'Processes acting on behalf of authorized users are identified.',
                examineMethods: ['System documentation'],
                interviewSubjects: ['System administrators'],
                testProcedures: ['Review process authentication'],
            },
        ],
        nist171Mapping: '3.1.1',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(i)',
    },
    {
        id: 'cmmc-ac-l1-002',
        practiceId: 'AC.L1-3.1.2',
        domain: 'AC',
        level: 1,
        title: 'Transaction & Function Control',
        description: 'Limit system access to the types of transactions and functions that authorized users are permitted to execute.',
        discussionPoints: [
            'Role-based access control',
            'Function-level restrictions',
            'Transaction type limitations',
        ],
        assessmentObjectives: [
            {
                id: 'ac.l1-3.1.2[a]',
                description: 'Types of transactions authorized users are permitted to execute are defined.',
                examineMethods: ['Access control policy', 'Role definitions'],
                interviewSubjects: ['Security personnel'],
                testProcedures: ['Test role permissions'],
            },
        ],
        nist171Mapping: '3.1.2',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(ii)',
    },
    // Level 1 - Identification and Authentication
    {
        id: 'cmmc-ia-l1-001',
        practiceId: 'IA.L1-3.5.1',
        domain: 'IA',
        level: 1,
        title: 'Identification',
        description: 'Identify system users, processes acting on behalf of users, or devices.',
        discussionPoints: [
            'User identification methods',
            'Process identification',
            'Device identification',
        ],
        assessmentObjectives: [
            {
                id: 'ia.l1-3.5.1[a]',
                description: 'System users are identified.',
                examineMethods: ['Identification policy', 'User directory'],
                interviewSubjects: ['System administrators'],
                testProcedures: ['Verify user identification'],
            },
        ],
        nist171Mapping: '3.5.1',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(iii)',
    },
    {
        id: 'cmmc-ia-l1-002',
        practiceId: 'IA.L1-3.5.2',
        domain: 'IA',
        level: 1,
        title: 'Authentication',
        description: 'Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational systems.',
        discussionPoints: [
            'Authentication mechanisms',
            'Password policies',
            'Multi-factor authentication',
        ],
        assessmentObjectives: [
            {
                id: 'ia.l1-3.5.2[a]',
                description: 'Identities of users are authenticated as a prerequisite to system access.',
                examineMethods: ['Authentication policy', 'System configurations'],
                interviewSubjects: ['System administrators'],
                testProcedures: ['Test authentication process'],
            },
        ],
        nist171Mapping: '3.5.2',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(iv)',
    },
    // Level 1 - Media Protection
    {
        id: 'cmmc-mp-l1-001',
        practiceId: 'MP.L1-3.8.3',
        domain: 'MP',
        level: 1,
        title: 'Media Disposal',
        description: 'Sanitize or destroy system media containing Federal Contract Information before disposal or release for reuse.',
        discussionPoints: [
            'Media sanitization procedures',
            'Destruction methods',
            'Verification of sanitization',
        ],
        assessmentObjectives: [
            {
                id: 'mp.l1-3.8.3[a]',
                description: 'System media containing FCI is sanitized or destroyed before disposal.',
                examineMethods: ['Media handling procedures', 'Sanitization logs'],
                interviewSubjects: ['IT personnel'],
                testProcedures: ['Review sanitization records'],
            },
        ],
        nist171Mapping: '3.8.3',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(v)',
    },
    // Level 1 - Physical Protection
    {
        id: 'cmmc-pe-l1-001',
        practiceId: 'PE.L1-3.10.1',
        domain: 'PE',
        level: 1,
        title: 'Limit Physical Access',
        description: 'Limit physical access to organizational systems, equipment, and the respective operating environments to authorized individuals.',
        discussionPoints: [
            'Physical access controls',
            'Authorization procedures',
            'Visitor management',
        ],
        assessmentObjectives: [
            {
                id: 'pe.l1-3.10.1[a]',
                description: 'Authorized individuals allowed physical access are identified.',
                examineMethods: ['Physical access policy', 'Access lists'],
                interviewSubjects: ['Facility management'],
                testProcedures: ['Test physical access controls'],
            },
        ],
        nist171Mapping: '3.10.1',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(vi)',
    },
    // Level 1 - System and Communications Protection
    {
        id: 'cmmc-sc-l1-001',
        practiceId: 'SC.L1-3.13.1',
        domain: 'SC',
        level: 1,
        title: 'Boundary Protection',
        description: 'Monitor, control, and protect organizational communications at the external boundaries and key internal boundaries of the information systems.',
        discussionPoints: [
            'Firewall implementation',
            'Network segmentation',
            'Traffic monitoring',
        ],
        assessmentObjectives: [
            {
                id: 'sc.l1-3.13.1[a]',
                description: 'Communications at external system boundaries are monitored.',
                examineMethods: ['Network diagrams', 'Firewall configurations'],
                interviewSubjects: ['Network administrators'],
                testProcedures: ['Review monitoring logs'],
            },
        ],
        nist171Mapping: '3.13.1',
        nist172Mapping: null,
        farClause: 'FAR 52.204-21(b)(1)(vii)',
    },
    // Level 2 - Access Control (Enhanced)
    {
        id: 'cmmc-ac-l2-001',
        practiceId: 'AC.L2-3.1.3',
        domain: 'AC',
        level: 2,
        title: 'Control CUI Flow',
        description: 'Control the flow of CUI in accordance with approved authorizations.',
        discussionPoints: [
            'Data flow controls',
            'Information flow policies',
            'CUI boundary controls',
        ],
        assessmentObjectives: [
            {
                id: 'ac.l2-3.1.3[a]',
                description: 'Approved authorizations for controlling the flow of CUI are defined.',
                examineMethods: ['Information flow policy', 'Authorization documentation'],
                interviewSubjects: ['Security personnel'],
                testProcedures: ['Test data flow controls'],
            },
        ],
        nist171Mapping: '3.1.3',
        nist172Mapping: null,
        farClause: null,
    },
    {
        id: 'cmmc-ac-l2-002',
        practiceId: 'AC.L2-3.1.5',
        domain: 'AC',
        level: 2,
        title: 'Least Privilege',
        description: 'Employ the principle of least privilege, including for specific security functions and privileged accounts.',
        discussionPoints: [
            'Privilege minimization',
            'Role-based access',
            'Privileged account management',
        ],
        assessmentObjectives: [
            {
                id: 'ac.l2-3.1.5[a]',
                description: 'Privileged accounts are identified.',
                examineMethods: ['Account policy', 'Privileged user list'],
                interviewSubjects: ['System administrators'],
                testProcedures: ['Review privilege assignments'],
            },
            {
                id: 'ac.l2-3.1.5[b]',
                description: 'Least privilege is employed.',
                examineMethods: ['Access control configurations'],
                interviewSubjects: ['Security personnel'],
                testProcedures: ['Test access restrictions'],
            },
        ],
        nist171Mapping: '3.1.5',
        nist172Mapping: null,
        farClause: null,
    },
    // Level 2 - Audit and Accountability
    {
        id: 'cmmc-au-l2-001',
        practiceId: 'AU.L2-3.3.1',
        domain: 'AU',
        level: 2,
        title: 'System Auditing',
        description: 'Create, protect, and retain system audit records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful, unauthorized, or inappropriate system activity.',
        discussionPoints: [
            'Audit log generation',
            'Log protection',
            'Retention requirements',
        ],
        assessmentObjectives: [
            {
                id: 'au.l2-3.3.1[a]',
                description: 'Audit records are specified to be created.',
                examineMethods: ['Audit policy', 'System configurations'],
                interviewSubjects: ['System administrators'],
                testProcedures: ['Review audit log samples'],
            },
        ],
        nist171Mapping: '3.3.1',
        nist172Mapping: null,
        farClause: null,
    },
    // Level 2 - Configuration Management
    {
        id: 'cmmc-cm-l2-001',
        practiceId: 'CM.L2-3.4.1',
        domain: 'CM',
        level: 2,
        title: 'System Baselining',
        description: 'Establish and maintain baseline configurations and inventories of organizational systems throughout the respective system development life cycles.',
        discussionPoints: [
            'Configuration baselines',
            'System inventories',
            'Lifecycle management',
        ],
        assessmentObjectives: [
            {
                id: 'cm.l2-3.4.1[a]',
                description: 'Baseline configurations are established.',
                examineMethods: ['Configuration policy', 'Baseline documentation'],
                interviewSubjects: ['Configuration managers'],
                testProcedures: ['Compare actual to baseline'],
            },
        ],
        nist171Mapping: '3.4.1',
        nist172Mapping: null,
        farClause: null,
    },
    // Level 2 - Incident Response
    {
        id: 'cmmc-ir-l2-001',
        practiceId: 'IR.L2-3.6.1',
        domain: 'IR',
        level: 2,
        title: 'Incident Handling',
        description: 'Establish an operational incident-handling capability for organizational systems that includes preparation, detection, analysis, containment, recovery, and user response activities.',
        discussionPoints: [
            'Incident response procedures',
            'Response team organization',
            'Communication protocols',
        ],
        assessmentObjectives: [
            {
                id: 'ir.l2-3.6.1[a]',
                description: 'An incident-handling capability is established.',
                examineMethods: ['Incident response plan', 'Team roster'],
                interviewSubjects: ['Incident response team'],
                testProcedures: ['Conduct tabletop exercise'],
            },
        ],
        nist171Mapping: '3.6.1',
        nist172Mapping: null,
        farClause: null,
    },
    // Level 2 - Risk Assessment
    {
        id: 'cmmc-ra-l2-001',
        practiceId: 'RA.L2-3.11.1',
        domain: 'RA',
        level: 2,
        title: 'Risk Assessments',
        description: 'Periodically assess the risk to organizational operations, organizational assets, and individuals resulting from the operation of organizational systems and the associated processing, storage, or transmission of CUI.',
        discussionPoints: [
            'Risk assessment methodology',
            'Assessment frequency',
            'Risk documentation',
        ],
        assessmentObjectives: [
            {
                id: 'ra.l2-3.11.1[a]',
                description: 'Risk assessments are periodically conducted.',
                examineMethods: ['Risk assessment policy', 'Assessment reports'],
                interviewSubjects: ['Risk managers'],
                testProcedures: ['Review assessment schedule'],
            },
        ],
        nist171Mapping: '3.11.1',
        nist172Mapping: null,
        farClause: null,
    },
    // Level 2 - Security Assessment
    {
        id: 'cmmc-ca-l2-001',
        practiceId: 'CA.L2-3.12.1',
        domain: 'CA',
        level: 2,
        title: 'Security Control Assessment',
        description: 'Periodically assess the security controls in organizational systems to determine if the controls are effective in their application.',
        discussionPoints: [
            'Assessment procedures',
            'Control effectiveness',
            'Remediation tracking',
        ],
        assessmentObjectives: [
            {
                id: 'ca.l2-3.12.1[a]',
                description: 'Security controls are assessed periodically.',
                examineMethods: ['Assessment policy', 'Assessment reports'],
                interviewSubjects: ['Security assessors'],
                testProcedures: ['Review control testing'],
            },
        ],
        nist171Mapping: '3.12.1',
        nist172Mapping: null,
        farClause: null,
    },
    // Level 3 - Access Control (Expert)
    {
        id: 'cmmc-ac-l3-001',
        practiceId: 'AC.L3-3.1.3e',
        domain: 'AC',
        level: 3,
        title: 'Enhanced CUI Flow Control',
        description: 'Employ enhanced controls to protect the flow of CUI and implement strict separation between security domains.',
        discussionPoints: [
            'Cross-domain solutions',
            'Data diodes',
            'Enhanced filtering',
        ],
        assessmentObjectives: [
            {
                id: 'ac.l3-3.1.3e[a]',
                description: 'Enhanced information flow controls are implemented.',
                examineMethods: ['Enhanced security architecture', 'Cross-domain solutions'],
                interviewSubjects: ['Security architects'],
                testProcedures: ['Test cross-domain controls'],
            },
        ],
        nist171Mapping: '3.1.3',
        nist172Mapping: '3.1.3e',
        farClause: null,
    },
    // Level 3 - System and Information Integrity (Expert)
    {
        id: 'cmmc-si-l3-001',
        practiceId: 'SI.L3-3.14.1e',
        domain: 'SI',
        level: 3,
        title: 'Advanced Threat Detection',
        description: 'Employ advanced mechanisms to detect and respond to indicators of compromise and advanced persistent threats.',
        discussionPoints: [
            'Threat hunting',
            'Behavioral analytics',
            'Advanced malware detection',
        ],
        assessmentObjectives: [
            {
                id: 'si.l3-3.14.1e[a]',
                description: 'Advanced threat detection mechanisms are employed.',
                examineMethods: ['Threat detection architecture', 'Tool configurations'],
                interviewSubjects: ['Security operations'],
                testProcedures: ['Test detection capabilities'],
            },
        ],
        nist171Mapping: '3.14.1',
        nist172Mapping: '3.14.1e',
        farClause: null,
    },
];
// ============================================================================
// CMMC Controls Service
// ============================================================================
class CMMCControlsService extends events_1.EventEmitter {
    static instance = null;
    practices;
    implementations;
    poams;
    assessments;
    cuiScopes;
    config;
    constructor(config) {
        super();
        this.practices = new Map();
        this.implementations = new Map();
        this.poams = new Map();
        this.assessments = new Map();
        this.cuiScopes = new Map();
        this.config = {
            enableContinuousMonitoring: true,
            poamAutoGeneration: true,
            evidenceRetentionDays: 365 * 3,
            assessmentValidityDays: 365 * 3,
            ...config,
        };
        this.loadPractices();
    }
    /**
     * Get singleton instance
     */
    static getInstance(config) {
        if (!CMMCControlsService.instance) {
            CMMCControlsService.instance = new CMMCControlsService(config);
        }
        return CMMCControlsService.instance;
    }
    /**
     * Load practices into memory
     */
    loadPractices() {
        for (const practice of CMMC_PRACTICES) {
            this.practices.set(practice.id, practice);
        }
    }
    /**
     * Get all practices
     */
    getAllPractices() {
        const practices = Array.from(this.practices.values());
        return (0, data_envelope_js_1.createDataEnvelope)(practices, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${practices.length} CMMC practices`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get practices by level
     */
    getPracticesByLevel(level) {
        // Level N includes all practices from levels 1 through N
        const practices = Array.from(this.practices.values())
            .filter((p) => p.level <= level);
        return (0, data_envelope_js_1.createDataEnvelope)(practices, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${practices.length} practices for Level ${level}`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get practices by domain
     */
    getPracticesByDomain(domain) {
        const practices = Array.from(this.practices.values())
            .filter((p) => p.domain === domain);
        return (0, data_envelope_js_1.createDataEnvelope)(practices, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${practices.length} practices for ${exports.DOMAIN_METADATA[domain].name}`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get level description
     */
    getLevelDescription(level) {
        const description = exports.LEVEL_DESCRIPTIONS[level];
        return (0, data_envelope_js_1.createDataEnvelope)(description, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Level description retrieved'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get domain metadata
     */
    getDomainMetadata(domain) {
        const metadata = exports.DOMAIN_METADATA[domain];
        return (0, data_envelope_js_1.createDataEnvelope)(metadata, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Domain metadata retrieved'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Record practice implementation
     */
    recordImplementation(tenantId, implementation) {
        const practice = Array.from(this.practices.values())
            .find((p) => p.practiceId === implementation.practiceId);
        if (!practice) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'CMMCControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Practice ${implementation.practiceId} not found`),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const impl = {
            ...implementation,
            tenantId,
        };
        const tenantImpls = this.implementations.get(tenantId) || [];
        const existingIndex = tenantImpls.findIndex((i) => i.practiceId === impl.practiceId);
        if (existingIndex >= 0) {
            tenantImpls[existingIndex] = impl;
        }
        else {
            tenantImpls.push(impl);
        }
        this.implementations.set(tenantId, tenantImpls);
        // Auto-generate POA&M if not implemented
        if (this.config.poamAutoGeneration &&
            (impl.status === 'not_implemented' || impl.status === 'partially_implemented')) {
            this.generatePOAM(tenantId, impl.practiceId);
        }
        this.emit('implementationRecorded', { tenantId, implementation: impl });
        return (0, data_envelope_js_1.createDataEnvelope)(impl, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Practice implementation recorded'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Generate POA&M for a practice
     */
    generatePOAM(tenantId, practiceId) {
        const practice = Array.from(this.practices.values())
            .find((p) => p.practiceId === practiceId);
        const poam = {
            id: `poam-${Date.now()}`,
            tenantId,
            practiceId,
            weakness: `${practiceId} - ${practice?.title || 'Unknown'} not fully implemented`,
            milestonePlan: [
                {
                    id: `ms-${Date.now()}-1`,
                    description: 'Develop implementation plan',
                    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                },
                {
                    id: `ms-${Date.now()}-2`,
                    description: 'Implement control',
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                },
                {
                    id: `ms-${Date.now()}-3`,
                    description: 'Collect evidence and validate',
                    targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                },
            ],
            resources: 'To be determined',
            scheduledCompletionDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
            status: 'open',
            riskLevel: practice?.level === 1 ? 'high' : practice?.level === 2 ? 'moderate' : 'high',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const tenantPoams = this.poams.get(tenantId) || [];
        tenantPoams.push(poam);
        this.poams.set(tenantId, tenantPoams);
        return poam;
    }
    /**
     * Get POA&Ms for tenant
     */
    getPOAMs(tenantId) {
        const poams = this.poams.get(tenantId) || [];
        return (0, data_envelope_js_1.createDataEnvelope)(poams, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${poams.length} POA&M(s)`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Update POA&M
     */
    updatePOAM(tenantId, poamId, updates) {
        const tenantPoams = this.poams.get(tenantId) || [];
        const poamIndex = tenantPoams.findIndex((p) => p.id === poamId);
        if (poamIndex < 0) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'CMMCControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `POA&M ${poamId} not found`),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        tenantPoams[poamIndex] = {
            ...tenantPoams[poamIndex],
            ...updates,
            updatedAt: new Date(),
        };
        this.poams.set(tenantId, tenantPoams);
        this.emit('poamUpdated', { tenantId, poam: tenantPoams[poamIndex] });
        return (0, data_envelope_js_1.createDataEnvelope)(tenantPoams[poamIndex], {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'POA&M updated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Define CUI scope
     */
    defineCUIScope(tenantId, scope) {
        const cuiScope = {
            ...scope,
            id: `cui-scope-${Date.now()}`,
            tenantId,
        };
        this.cuiScopes.set(tenantId, cuiScope);
        this.emit('cuiScopeDefined', { tenantId, scope: cuiScope });
        return (0, data_envelope_js_1.createDataEnvelope)(cuiScope, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'CUI scope defined successfully'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get CUI scope
     */
    getCUIScope(tenantId) {
        const scope = this.cuiScopes.get(tenantId) || null;
        return (0, data_envelope_js_1.createDataEnvelope)(scope, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(scope ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, scope ? 'CUI scope retrieved' : 'No CUI scope defined'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Conduct CMMC assessment
     */
    conductAssessment(tenantId, targetLevel) {
        const scope = this.cuiScopes.get(tenantId);
        if (!scope && targetLevel >= 2) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'CMMCControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'CUI scope must be defined for Level 2+ assessments'),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const requiredPractices = Array.from(this.practices.values())
            .filter((p) => p.level <= targetLevel);
        const tenantImpls = this.implementations.get(tenantId) || [];
        // Assess each practice
        const practiceResults = requiredPractices.map((practice) => {
            const impl = tenantImpls.find((i) => i.practiceId === practice.practiceId);
            let result = 'not_met';
            if (impl?.status === 'implemented') {
                result = 'met';
            }
            else if (impl?.status === 'not_applicable') {
                result = 'not_applicable';
            }
            return {
                practiceId: practice.practiceId,
                result,
                findings: result === 'not_met' ? [`${practice.title} not fully implemented`] : [],
                evidence: impl?.evidence.map((e) => e.title) || [],
            };
        });
        // Calculate domain scores
        const domains = Object.keys(exports.DOMAIN_METADATA);
        const domainScores = {};
        for (const domain of domains) {
            const domainPractices = requiredPractices.filter((p) => p.domain === domain);
            const domainResults = practiceResults.filter((r) => domainPractices.some((p) => p.practiceId === r.practiceId));
            const met = domainResults.filter((r) => r.result === 'met').length;
            const notMet = domainResults.filter((r) => r.result === 'not_met').length;
            const na = domainResults.filter((r) => r.result === 'not_applicable').length;
            const applicable = domainPractices.length - na;
            domainScores[domain] = {
                practicesRequired: domainPractices.length,
                practicesMet: met,
                practicesNotMet: notMet,
                practicesNA: na,
                score: applicable > 0 ? (met / applicable) * 100 : 100,
            };
        }
        // Determine overall result
        const totalMet = practiceResults.filter((r) => r.result === 'met').length;
        const totalNotMet = practiceResults.filter((r) => r.result === 'not_met').length;
        const poamsRequired = totalNotMet;
        let overallResult = 'fail';
        if (totalNotMet === 0) {
            overallResult = 'pass';
        }
        else if (totalNotMet <= 3 && targetLevel === 2) {
            overallResult = 'conditional';
        }
        const assessment = {
            id: `cmmc-assessment-${Date.now()}`,
            tenantId,
            targetLevel,
            assessmentType: exports.LEVEL_DESCRIPTIONS[targetLevel].assessmentType,
            assessmentDate: new Date(),
            overallResult,
            practiceResults,
            domainScores,
            poamsRequired,
            validUntil: overallResult === 'pass'
                ? new Date(Date.now() + this.config.assessmentValidityDays * 24 * 60 * 60 * 1000)
                : undefined,
            certificateNumber: overallResult === 'pass' ? `CMMC-${Date.now()}` : undefined,
        };
        const tenantAssessments = this.assessments.get(tenantId) || [];
        tenantAssessments.push(assessment);
        this.assessments.set(tenantId, tenantAssessments);
        this.emit('assessmentCompleted', { tenantId, assessment });
        return (0, data_envelope_js_1.createDataEnvelope)(assessment, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(overallResult === 'pass' ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, `CMMC Level ${targetLevel} assessment: ${overallResult.toUpperCase()}`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get assessment history
     */
    getAssessmentHistory(tenantId) {
        const assessments = this.assessments.get(tenantId) || [];
        return (0, data_envelope_js_1.createDataEnvelope)(assessments, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${assessments.length} assessment(s)`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get readiness summary for a target level
     */
    getReadinessSummary(tenantId, targetLevel) {
        const requiredPractices = Array.from(this.practices.values())
            .filter((p) => p.level <= targetLevel);
        const tenantImpls = this.implementations.get(tenantId) || [];
        const implemented = requiredPractices.filter((p) => tenantImpls.some((i) => i.practiceId === p.practiceId &&
            (i.status === 'implemented' || i.status === 'not_applicable'))).length;
        const gapCount = requiredPractices.length - implemented;
        const readinessPercentage = requiredPractices.length > 0
            ? (implemented / requiredPractices.length) * 100
            : 0;
        // Calculate domain readiness
        const domains = Object.keys(exports.DOMAIN_METADATA);
        const domainReadiness = {};
        for (const domain of domains) {
            const domainPractices = requiredPractices.filter((p) => p.domain === domain);
            const domainImplemented = domainPractices.filter((p) => tenantImpls.some((i) => i.practiceId === p.practiceId &&
                (i.status === 'implemented' || i.status === 'not_applicable'))).length;
            domainReadiness[domain] = domainPractices.length > 0
                ? (domainImplemented / domainPractices.length) * 100
                : 100;
        }
        // Identify critical gaps (Level 1 practices not implemented)
        const criticalGaps = requiredPractices
            .filter((p) => p.level === 1 &&
            !tenantImpls.some((i) => i.practiceId === p.practiceId && i.status === 'implemented'))
            .map((p) => `${p.practiceId}: ${p.title}`);
        return (0, data_envelope_js_1.createDataEnvelope)({
            targetLevel,
            requiredPractices: requiredPractices.length,
            implementedPractices: implemented,
            gapCount,
            readinessPercentage,
            domainReadiness,
            criticalGaps,
        }, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(readinessPercentage >= 100 ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, `CMMC Level ${targetLevel} readiness: ${readinessPercentage.toFixed(1)}%`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get service statistics
     */
    getStats(tenantId) {
        const tenantImpls = this.implementations.get(tenantId) || [];
        const tenantPoams = this.poams.get(tenantId) || [];
        const tenantAssessments = this.assessments.get(tenantId) || [];
        const scope = this.cuiScopes.get(tenantId);
        const lastAssessment = tenantAssessments.length > 0
            ? tenantAssessments[tenantAssessments.length - 1]
            : null;
        const stats = {
            totalPractices: this.practices.size,
            implementedPractices: tenantImpls.filter((i) => i.status === 'implemented').length,
            plannedPractices: tenantImpls.filter((i) => i.status === 'planned').length,
            openPoams: tenantPoams.filter((p) => p.status !== 'completed').length,
            currentLevel: lastAssessment?.overallResult === 'pass'
                ? lastAssessment.targetLevel
                : null,
            lastAssessmentDate: lastAssessment?.assessmentDate || null,
            scopedSystemCount: scope?.systems.length || 0,
        };
        return (0, data_envelope_js_1.createDataEnvelope)(stats, {
            source: 'CMMCControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'CMMC statistics retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
}
exports.CMMCControlsService = CMMCControlsService;
// ============================================================================
// Factory Function
// ============================================================================
let serviceInstance = null;
function getCMMCControlsService(config) {
    if (!serviceInstance) {
        serviceInstance = CMMCControlsService.getInstance(config);
    }
    return serviceInstance;
}
