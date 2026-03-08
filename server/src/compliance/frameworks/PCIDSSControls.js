"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCIDSSControlsService = exports.GOAL_DESCRIPTIONS = exports.REQUIREMENT_METADATA = void 0;
exports.getPCIDSSControlsService = getPCIDSSControlsService;
const events_1 = require("events");
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../../types/data-envelope.js");
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
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
exports.REQUIREMENT_METADATA = {
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
exports.GOAL_DESCRIPTIONS = {
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
const PCI_DSS_CONTROLS = [
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
class PCIDSSControlsService extends events_1.EventEmitter {
    static instance = null;
    controls;
    implementations;
    cdeScopes;
    assessments;
    config;
    constructor(config) {
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
    static getInstance(config) {
        if (!PCIDSSControlsService.instance) {
            PCIDSSControlsService.instance = new PCIDSSControlsService(config);
        }
        return PCIDSSControlsService.instance;
    }
    /**
     * Load PCI-DSS controls into memory
     */
    loadControls() {
        for (const control of PCI_DSS_CONTROLS) {
            this.controls.set(control.id, control);
        }
    }
    /**
     * Get all controls
     */
    getAllControls() {
        const controls = Array.from(this.controls.values());
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'PCI-DSS controls retrieved successfully'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get controls by requirement
     */
    getControlsByRequirement(requirement) {
        const controls = Array.from(this.controls.values())
            .filter((c) => c.requirementNumber === requirement);
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${controls.length} controls for ${requirement}`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get controls by goal
     */
    getControlsByGoal(goal) {
        const controls = Array.from(this.controls.values())
            .filter((c) => c.goal === goal);
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${controls.length} controls for goal: ${goal}`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get controls by SAQ type
     */
    getControlsBySAQType(saqType) {
        const controls = Array.from(this.controls.values())
            .filter((c) => c.applicability.some((a) => a.saqType === saqType && a.applicability === 'required'));
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${controls.length} required controls for ${saqType}`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get new v4.0 controls
     */
    getNewV4Controls() {
        const controls = Array.from(this.controls.values())
            .filter((c) => c.isNewInV4);
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${controls.length} new v4.0 controls`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Record control implementation
     */
    recordImplementation(tenantId, implementation) {
        const control = this.controls.get(implementation.controlId);
        if (!control) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PCIDSSControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Control ${implementation.controlId} not found`),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const impl = {
            ...implementation,
            tenantId,
        };
        const tenantImpls = this.implementations.get(tenantId) || [];
        const existingIndex = tenantImpls.findIndex((i) => i.controlId === impl.controlId);
        if (existingIndex >= 0) {
            tenantImpls[existingIndex] = impl;
        }
        else {
            tenantImpls.push(impl);
        }
        this.implementations.set(tenantId, tenantImpls);
        this.emit('implementationRecorded', { tenantId, implementation: impl });
        return (0, data_envelope_js_1.createDataEnvelope)(impl, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Control implementation recorded successfully'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Define CDE scope for tenant
     */
    defineCDEScope(tenantId, scope) {
        const cdeScope = {
            ...scope,
            id: `cde-${Date.now()}`,
            tenantId,
        };
        this.cdeScopes.set(tenantId, cdeScope);
        this.emit('cdeScopeDefined', { tenantId, scope: cdeScope });
        return (0, data_envelope_js_1.createDataEnvelope)(cdeScope, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'CDE scope defined successfully'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get CDE scope for tenant
     */
    getCDEScope(tenantId) {
        const scope = this.cdeScopes.get(tenantId) || null;
        return (0, data_envelope_js_1.createDataEnvelope)(scope, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(scope ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, scope ? 'CDE scope retrieved' : 'No CDE scope defined for tenant'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Analyze cardholder data flow
     */
    analyzeDataFlow(tenantId, flowId) {
        const scope = this.cdeScopes.get(tenantId);
        if (!scope) {
            return (0, data_envelope_js_1.createDataEnvelope)({ flow: null, risks: [], recommendations: [] }, {
                source: 'PCIDSSControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'No CDE scope defined for tenant'),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const flow = scope.dataFlows.find((f) => f.id === flowId);
        if (!flow) {
            return (0, data_envelope_js_1.createDataEnvelope)({ flow: null, risks: [], recommendations: [] }, {
                source: 'PCIDSSControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Data flow ${flowId} not found`),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const risks = [];
        const recommendations = [];
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
        const sensitiveElements = ['full_track_data', 'CAV2_CVC2_CVV2_CID', 'PIN_PIN_block'];
        const hasSensitive = flow.dataElements.some((e) => sensitiveElements.includes(e));
        if (hasSensitive) {
            risks.push('Sensitive authentication data in flow');
            recommendations.push('Ensure SAD is not stored after authorization');
        }
        return (0, data_envelope_js_1.createDataEnvelope)({ flow, risks, recommendations }, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(risks.length > 0 ? data_envelope_js_1.GovernanceResult.FLAG : data_envelope_js_1.GovernanceResult.ALLOW, risks.length > 0
                ? `Data flow analysis found ${risks.length} risk(s)`
                : 'Data flow analysis complete - no issues found'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Conduct PCI-DSS assessment
     */
    conductAssessment(tenantId, assessmentType, saqType) {
        const scope = this.cdeScopes.get(tenantId);
        if (!scope) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PCIDSSControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'CDE scope must be defined before assessment'),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const tenantImpls = this.implementations.get(tenantId) || [];
        const applicableControls = Array.from(this.controls.values())
            .filter((c) => c.applicability.some((a) => a.saqType === saqType && a.applicability === 'required'));
        // Assess each requirement
        const requirementResults = [];
        const requirements = Object.keys(exports.REQUIREMENT_METADATA);
        for (const req of requirements) {
            const reqControls = applicableControls.filter((c) => c.requirementNumber === req);
            const reqImpls = tenantImpls.filter((i) => reqControls.some((c) => c.id === i.controlId));
            const compliant = reqImpls.filter((i) => i.status === 'in_place' || i.status === 'in_place_with_ccw').length;
            const nonCompliant = reqControls.length - compliant -
                reqImpls.filter((i) => i.status === 'not_applicable').length;
            const notApplicable = reqImpls.filter((i) => i.status === 'not_applicable').length;
            const findings = reqControls
                .filter((c) => {
                const impl = tenantImpls.find((i) => i.controlId === c.id);
                return !impl || impl.status === 'not_in_place' || impl.status === 'not_tested';
            })
                .map((c) => ({
                id: `finding-${c.id}-${Date.now()}`,
                controlId: c.id,
                severity: 'high',
                description: `Control ${c.subRequirement} - ${c.title} not implemented`,
                affectedSystems: scope.systems.filter((s) => s.category === 'cde').map((s) => s.name),
                recommendedRemediation: c.definedApproach.implementationGuidance.join('; '),
                targetRemediationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            }));
            let status = 'compliant';
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
        const allCompliant = requirementResults.every((r) => r.status === 'compliant');
        const anyNonCompliant = requirementResults.some((r) => r.status === 'non_compliant');
        const overallCompliance = allCompliant
            ? 'compliant'
            : anyNonCompliant
                ? 'non_compliant'
                : 'partially_compliant';
        const compensatingControlsUsed = tenantImpls.filter((i) => i.status === 'in_place_with_ccw').length;
        const assessment = {
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
        return (0, data_envelope_js_1.createDataEnvelope)(assessment, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(overallCompliance === 'compliant' ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, `PCI-DSS assessment completed: ${overallCompliance}`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get assessment history
     */
    getAssessmentHistory(tenantId) {
        const assessments = this.assessments.get(tenantId) || [];
        return (0, data_envelope_js_1.createDataEnvelope)(assessments, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${assessments.length} assessment(s)`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Create compensating control worksheet
     */
    createCompensatingControl(tenantId, ccw) {
        const control = Array.from(this.controls.values())
            .find((c) => c.subRequirement === ccw.originalRequirement);
        if (!control) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'PCIDSSControlsService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Original requirement ${ccw.originalRequirement} not found`),
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        const compensatingControl = {
            ...ccw,
            id: `ccw-${Date.now()}`,
        };
        this.emit('compensatingControlCreated', { tenantId, ccw: compensatingControl });
        return (0, data_envelope_js_1.createDataEnvelope)(compensatingControl, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Compensating control worksheet created'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get requirement metadata
     */
    getRequirementMetadata(requirement) {
        const metadata = exports.REQUIREMENT_METADATA[requirement];
        return (0, data_envelope_js_1.createDataEnvelope)(metadata, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Requirement metadata retrieved'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get goal description
     */
    getGoalDescription(goal) {
        const description = exports.GOAL_DESCRIPTIONS[goal];
        return (0, data_envelope_js_1.createDataEnvelope)(description, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Goal description retrieved'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get service statistics
     */
    getStats(tenantId) {
        const tenantImpls = this.implementations.get(tenantId) || [];
        const tenantAssessments = this.assessments.get(tenantId) || [];
        const scope = this.cdeScopes.get(tenantId);
        const lastAssessment = tenantAssessments.length > 0
            ? tenantAssessments[tenantAssessments.length - 1]
            : null;
        const stats = {
            totalControls: this.controls.size,
            implementedControls: tenantImpls.filter((i) => i.status === 'in_place' || i.status === 'in_place_with_ccw').length,
            pendingControls: this.controls.size - tenantImpls.length,
            compensatingControls: tenantImpls.filter((i) => i.status === 'in_place_with_ccw').length,
            lastAssessmentDate: lastAssessment?.attestationDate || null,
            nextAssessmentDue: lastAssessment
                ? new Date(lastAssessment.assessmentPeriod.end.getTime() + 365 * 24 * 60 * 60 * 1000)
                : null,
            cdeSystemCount: scope?.systems.length || 0,
            dataFlowCount: scope?.dataFlows.length || 0,
        };
        return (0, data_envelope_js_1.createDataEnvelope)(stats, {
            source: 'PCIDSSControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'PCI-DSS statistics retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
}
exports.PCIDSSControlsService = PCIDSSControlsService;
// ============================================================================
// Factory Function
// ============================================================================
let serviceInstance = null;
function getPCIDSSControlsService(config) {
    if (!serviceInstance) {
        serviceInstance = PCIDSSControlsService.getInstance(config);
    }
    return serviceInstance;
}
