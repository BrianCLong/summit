"use strict";
/**
 * FedRAMP Controls
 *
 * Federal Risk and Authorization Management Program (FedRAMP) controls.
 * Implements NIST SP 800-53 control families for Moderate baseline.
 *
 * SOC 2 Controls: CC3.1 (Compliance Management)
 *
 * @module compliance/frameworks/FedRAMPControls
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FedRAMPControlsService = void 0;
exports.getFedRAMPControlsService = getFedRAMPControlsService;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'fedramp-compliance-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'FedRAMPControls',
    };
}
// ============================================================================
// Control Families Metadata
// ============================================================================
const CONTROL_FAMILIES = {
    AC: { name: 'Access Control', description: 'Controls for managing access to information systems' },
    AT: { name: 'Awareness and Training', description: 'Security awareness and training requirements' },
    AU: { name: 'Audit and Accountability', description: 'Audit logging and accountability controls' },
    CA: { name: 'Assessment, Authorization, and Monitoring', description: 'Security assessment and authorization' },
    CM: { name: 'Configuration Management', description: 'System configuration management controls' },
    CP: { name: 'Contingency Planning', description: 'Business continuity and disaster recovery' },
    IA: { name: 'Identification and Authentication', description: 'Identity management and authentication' },
    IR: { name: 'Incident Response', description: 'Security incident response procedures' },
    MA: { name: 'Maintenance', description: 'System maintenance controls' },
    MP: { name: 'Media Protection', description: 'Protection of media and information' },
    PE: { name: 'Physical and Environmental Protection', description: 'Physical security controls' },
    PL: { name: 'Planning', description: 'Security planning controls' },
    PM: { name: 'Program Management', description: 'Information security program management' },
    PS: { name: 'Personnel Security', description: 'Personnel security controls' },
    PT: { name: 'PII Processing and Transparency', description: 'Privacy controls for PII' },
    RA: { name: 'Risk Assessment', description: 'Risk assessment procedures' },
    SA: { name: 'System and Services Acquisition', description: 'System acquisition controls' },
    SC: { name: 'System and Communications Protection', description: 'Communications protection' },
    SI: { name: 'System and Information Integrity', description: 'System integrity controls' },
    SR: { name: 'Supply Chain Risk Management', description: 'Supply chain security' },
};
// ============================================================================
// FedRAMP Moderate Baseline Controls (Representative Sample)
// ============================================================================
const FEDRAMP_MODERATE_CONTROLS = [
    // Access Control
    {
        id: (0, uuid_1.v4)(),
        controlId: 'AC-1',
        family: 'AC',
        title: 'Policy and Procedures',
        description: 'Develop, document, and disseminate access control policy and procedures.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        supplementalGuidance: 'Access control policy can be included as part of the general security policy.',
        relatedControls: ['PM-9', 'PS-8', 'SI-12'],
        controlEnhancements: [],
        parameters: [
            {
                id: (0, uuid_1.v4)(),
                parameterId: 'AC-1_ODP[1]',
                label: 'personnel or roles',
                description: 'Personnel or roles to whom access control policy is disseminated',
                defaultValue: 'all personnel',
            },
        ],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'AC-1a', description: 'Develop and document access control policy' },
            { id: (0, uuid_1.v4)(), objectiveId: 'AC-1b', description: 'Disseminate access control policy to designated personnel' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'AC-1-Examine',
                method: 'examine',
                description: 'Examine access control policy and procedures',
                objects: ['Access control policy', 'Access control procedures'],
            },
        ],
    },
    {
        id: (0, uuid_1.v4)(),
        controlId: 'AC-2',
        family: 'AC',
        title: 'Account Management',
        description: 'Define and document the types of accounts allowed and specifically prohibited for use within the system.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-3', 'AC-5', 'AC-6', 'AC-17', 'AU-9', 'IA-2', 'IA-4', 'IA-5', 'IA-8'],
        controlEnhancements: [
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'AC-2(1)',
                title: 'Automated System Account Management',
                description: 'Support the management of system accounts using automated mechanisms.',
                baseline: ['Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'AC-2(2)',
                title: 'Automated Temporary and Emergency Account Management',
                description: 'Automatically remove or disable temporary and emergency accounts.',
                baseline: ['Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'AC-2(3)',
                title: 'Disable Accounts',
                description: 'Disable accounts when accounts have expired, no longer associated with a user, or violated policies.',
                baseline: ['Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'AC-2(4)',
                title: 'Automated Audit Actions',
                description: 'Automatically audit account creation, modification, enabling, disabling, and removal actions.',
                baseline: ['Moderate', 'High'],
            },
        ],
        parameters: [
            {
                id: (0, uuid_1.v4)(),
                parameterId: 'AC-2_ODP[1]',
                label: 'time period for account inactivity',
                description: 'Time period after which inactive accounts are disabled',
                defaultValue: '90 days',
            },
        ],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'AC-2a', description: 'Define and document account types' },
            { id: (0, uuid_1.v4)(), objectiveId: 'AC-2b', description: 'Assign account managers' },
            { id: (0, uuid_1.v4)(), objectiveId: 'AC-2c', description: 'Establish conditions for group membership' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'AC-2-Examine',
                method: 'examine',
                description: 'Examine account management procedures and system settings',
                objects: ['System security plan', 'Account management procedures', 'System configuration settings'],
            },
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'AC-2-Test',
                method: 'test',
                description: 'Test automated account management mechanisms',
                objects: ['Account management system', 'Audit logs'],
            },
        ],
    },
    {
        id: (0, uuid_1.v4)(),
        controlId: 'AC-3',
        family: 'AC',
        title: 'Access Enforcement',
        description: 'Enforce approved authorizations for logical access to information and system resources.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-2', 'AC-4', 'AC-5', 'AC-6', 'AC-16', 'AC-17', 'AC-18', 'AC-19', 'AC-24', 'AU-9', 'CA-9', 'CM-5', 'IA-2', 'IA-5', 'MA-3', 'MA-4', 'MA-5', 'PE-3', 'PS-2', 'SA-17', 'SC-2', 'SC-3', 'SC-4', 'SC-13', 'SC-28', 'SI-4'],
        controlEnhancements: [],
        parameters: [],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'AC-3a', description: 'Enforce approved authorizations for access' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'AC-3-Test',
                method: 'test',
                description: 'Test access enforcement mechanisms',
                objects: ['Access control system', 'System audit logs'],
            },
        ],
    },
    // Audit and Accountability
    {
        id: (0, uuid_1.v4)(),
        controlId: 'AU-2',
        family: 'AU',
        title: 'Event Logging',
        description: 'Identify the types of events that the system is capable of logging in support of the audit function.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-2', 'AC-3', 'AC-6', 'AC-7', 'AC-8', 'AC-16', 'AC-17', 'AU-3', 'AU-4', 'AU-5', 'AU-6', 'AU-7', 'AU-11', 'AU-12', 'CM-3', 'CM-5', 'MA-4', 'MP-4', 'PE-3', 'PM-21', 'PT-2', 'RA-8', 'SA-8', 'SC-7', 'SC-18', 'SI-3', 'SI-4', 'SI-7', 'SI-10', 'SI-11'],
        controlEnhancements: [],
        parameters: [
            {
                id: (0, uuid_1.v4)(),
                parameterId: 'AU-2_ODP[1]',
                label: 'event types',
                description: 'Event types to be logged',
                defaultValue: 'Successful and unsuccessful account logon events, account management events, object access, policy change, privilege functions, process tracking, system events',
            },
        ],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'AU-2a', description: 'Identify event types the system is capable of logging' },
            { id: (0, uuid_1.v4)(), objectiveId: 'AU-2b', description: 'Coordinate event logging with other organizations' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'AU-2-Examine',
                method: 'examine',
                description: 'Examine audit policy and system configuration',
                objects: ['Audit policy', 'System security plan', 'System configuration'],
            },
        ],
    },
    // Identification and Authentication
    {
        id: (0, uuid_1.v4)(),
        controlId: 'IA-2',
        family: 'IA',
        title: 'Identification and Authentication (Organizational Users)',
        description: 'Uniquely identify and authenticate organizational users and associate that unique identification with processes acting on behalf of those users.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-2', 'AC-3', 'AC-4', 'AC-14', 'AC-17', 'AC-18', 'AU-1', 'AU-6', 'IA-4', 'IA-5', 'IA-8', 'MA-4', 'MA-5', 'PE-2', 'PL-4', 'PM-12', 'SA-4', 'SA-8'],
        controlEnhancements: [
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'IA-2(1)',
                title: 'Multi-Factor Authentication to Privileged Accounts',
                description: 'Implement multi-factor authentication for access to privileged accounts.',
                baseline: ['Low', 'Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'IA-2(2)',
                title: 'Multi-Factor Authentication to Non-Privileged Accounts',
                description: 'Implement multi-factor authentication for access to non-privileged accounts.',
                baseline: ['Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'IA-2(8)',
                title: 'Access to Accounts - Replay Resistant',
                description: 'Implement replay-resistant authentication mechanisms for access to privileged and non-privileged accounts.',
                baseline: ['Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'IA-2(12)',
                title: 'Acceptance of PIV Credentials',
                description: 'Accept and electronically verify Personal Identity Verification (PIV) credentials.',
                baseline: ['Moderate', 'High'],
            },
        ],
        parameters: [],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'IA-2a', description: 'Uniquely identify organizational users' },
            { id: (0, uuid_1.v4)(), objectiveId: 'IA-2b', description: 'Authenticate organizational users' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'IA-2-Test',
                method: 'test',
                description: 'Test authentication mechanisms',
                objects: ['Authentication system', 'Multi-factor authentication'],
            },
        ],
    },
    // System and Communications Protection
    {
        id: (0, uuid_1.v4)(),
        controlId: 'SC-8',
        family: 'SC',
        title: 'Transmission Confidentiality and Integrity',
        description: 'Protect the confidentiality and integrity of transmitted information.',
        baseline: ['Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-17', 'AC-18', 'IA-5', 'SC-7', 'SC-12', 'SC-13', 'SC-23'],
        controlEnhancements: [
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'SC-8(1)',
                title: 'Cryptographic Protection',
                description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure and detect changes to information during transmission.',
                baseline: ['Moderate', 'High'],
            },
        ],
        parameters: [],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'SC-8a', description: 'Protect confidentiality of transmitted information' },
            { id: (0, uuid_1.v4)(), objectiveId: 'SC-8b', description: 'Protect integrity of transmitted information' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'SC-8-Test',
                method: 'test',
                description: 'Test transmission protection mechanisms',
                objects: ['Network traffic', 'Encryption configurations'],
            },
        ],
    },
    {
        id: (0, uuid_1.v4)(),
        controlId: 'SC-12',
        family: 'SC',
        title: 'Cryptographic Key Establishment and Management',
        description: 'Establish and manage cryptographic keys when cryptography is employed within the system.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['SC-8', 'SC-13', 'SC-17', 'SC-28'],
        controlEnhancements: [],
        parameters: [
            {
                id: (0, uuid_1.v4)(),
                parameterId: 'SC-12_ODP[1]',
                label: 'key management requirements',
                description: 'Requirements for key generation, distribution, storage, access, and destruction',
                defaultValue: 'NIST SP 800-57',
            },
        ],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'SC-12a', description: 'Establish cryptographic keys' },
            { id: (0, uuid_1.v4)(), objectiveId: 'SC-12b', description: 'Manage cryptographic keys' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'SC-12-Examine',
                method: 'examine',
                description: 'Examine key management procedures',
                objects: ['Key management policy', 'Key management procedures'],
            },
        ],
    },
    {
        id: (0, uuid_1.v4)(),
        controlId: 'SC-13',
        family: 'SC',
        title: 'Cryptographic Protection',
        description: 'Determine the cryptographic uses and implement the types of cryptography required for each specified use.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-2', 'AC-3', 'AC-7', 'AC-17', 'AC-18', 'AC-19', 'AU-9', 'AU-10', 'CM-11', 'CP-9', 'IA-3', 'IA-5', 'IA-7', 'MA-4', 'MP-2', 'MP-4', 'MP-5', 'SA-4', 'SA-8', 'SA-9', 'SC-8', 'SC-12', 'SC-23', 'SC-28', 'SC-40', 'SI-3', 'SI-7'],
        controlEnhancements: [],
        parameters: [
            {
                id: (0, uuid_1.v4)(),
                parameterId: 'SC-13_ODP[1]',
                label: 'cryptographic uses and types',
                description: 'Cryptographic uses and types of cryptography required',
                defaultValue: 'FIPS 140-2 validated cryptography for data at rest and in transit',
            },
        ],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'SC-13a', description: 'Determine cryptographic uses' },
            { id: (0, uuid_1.v4)(), objectiveId: 'SC-13b', description: 'Implement required cryptography' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'SC-13-Test',
                method: 'test',
                description: 'Test cryptographic implementations',
                objects: ['Encryption modules', 'FIPS validation certificates'],
            },
        ],
    },
    // Incident Response
    {
        id: (0, uuid_1.v4)(),
        controlId: 'IR-4',
        family: 'IR',
        title: 'Incident Handling',
        description: 'Implement an incident handling capability for incidents that includes preparation, detection and analysis, containment, eradication, and recovery.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-19', 'AU-6', 'AU-7', 'CM-6', 'CP-2', 'CP-3', 'CP-4', 'IR-2', 'IR-3', 'IR-5', 'IR-6', 'IR-8', 'PE-6', 'PL-2', 'PM-12', 'SA-8', 'SC-5', 'SC-7', 'SI-3', 'SI-4', 'SI-7'],
        controlEnhancements: [
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'IR-4(1)',
                title: 'Automated Incident Handling Processes',
                description: 'Support the incident handling process using automated mechanisms.',
                baseline: ['Moderate', 'High'],
            },
        ],
        parameters: [],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'IR-4a', description: 'Implement incident handling capability' },
            { id: (0, uuid_1.v4)(), objectiveId: 'IR-4b', description: 'Coordinate incident handling with contingency planning' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'IR-4-Examine',
                method: 'examine',
                description: 'Examine incident response plan and procedures',
                objects: ['Incident response plan', 'Incident response procedures', 'Incident records'],
            },
        ],
    },
    // Configuration Management
    {
        id: (0, uuid_1.v4)(),
        controlId: 'CM-2',
        family: 'CM',
        title: 'Baseline Configuration',
        description: 'Develop, document, and maintain a current baseline configuration of the system.',
        baseline: ['Low', 'Moderate', 'High'],
        priority: 'P1',
        relatedControls: ['AC-19', 'AU-6', 'CA-9', 'CM-1', 'CM-3', 'CM-5', 'CM-6', 'CM-8', 'CM-9', 'CP-9', 'CP-10', 'CP-12', 'MA-4', 'PL-8', 'SA-3', 'SA-8', 'SA-10', 'SA-15', 'SC-18'],
        controlEnhancements: [
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'CM-2(2)',
                title: 'Automation Support for Accuracy and Currency',
                description: 'Maintain the currency, completeness, accuracy, and availability of the baseline configuration using automated mechanisms.',
                baseline: ['Moderate', 'High'],
            },
            {
                id: (0, uuid_1.v4)(),
                enhancementId: 'CM-2(3)',
                title: 'Retention of Previous Configurations',
                description: 'Retain previous versions of baseline configurations to support rollback.',
                baseline: ['Moderate', 'High'],
            },
        ],
        parameters: [],
        objectives: [
            { id: (0, uuid_1.v4)(), objectiveId: 'CM-2a', description: 'Develop and document baseline configuration' },
            { id: (0, uuid_1.v4)(), objectiveId: 'CM-2b', description: 'Maintain current baseline configuration' },
        ],
        assessmentProcedures: [
            {
                id: (0, uuid_1.v4)(),
                procedureId: 'CM-2-Examine',
                method: 'examine',
                description: 'Examine baseline configuration documentation',
                objects: ['Baseline configuration', 'System inventory', 'Configuration management plan'],
            },
        ],
    },
];
// ============================================================================
// FedRAMP Controls Service
// ============================================================================
class FedRAMPControlsService {
    controls = new Map();
    implementations = new Map();
    constructor() {
        // Load controls
        for (const control of FEDRAMP_MODERATE_CONTROLS) {
            this.controls.set(control.controlId, control);
        }
        logger_js_1.default.info({ controlCount: this.controls.size }, 'FedRAMPControlsService initialized');
    }
    /**
     * Get all controls for a baseline
     */
    getControls(baseline = 'Moderate') {
        const controls = Array.from(this.controls.values())
            .filter(c => c.baseline.includes(baseline));
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'FedRAMPControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${controls.length} controls`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get a specific control
     */
    getControl(controlId) {
        const control = this.controls.get(controlId) || null;
        return (0, data_envelope_js_1.createDataEnvelope)(control, {
            source: 'FedRAMPControlsService',
            governanceVerdict: createVerdict(control ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.DENY, control ? 'Control found' : 'Control not found'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get controls by family
     */
    getControlsByFamily(family) {
        const controls = Array.from(this.controls.values())
            .filter(c => c.family === family);
        return (0, data_envelope_js_1.createDataEnvelope)(controls, {
            source: 'FedRAMPControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Retrieved ${controls.length} controls for ${family}`),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Get control family metadata
     */
    getControlFamilies() {
        return (0, data_envelope_js_1.createDataEnvelope)(CONTROL_FAMILIES, {
            source: 'FedRAMPControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Control families retrieved'),
            classification: data_envelope_js_1.DataClassification.PUBLIC,
        });
    }
    /**
     * Record control implementation for a tenant
     */
    recordImplementation(implementation) {
        const key = implementation.tenantId;
        const implementations = this.implementations.get(key) || [];
        // Find existing or add new
        const existingIndex = implementations.findIndex(i => i.controlId === implementation.controlId);
        if (existingIndex >= 0) {
            implementations[existingIndex] = implementation;
        }
        else {
            implementations.push(implementation);
        }
        this.implementations.set(key, implementations);
        logger_js_1.default.info({
            tenantId: implementation.tenantId,
            controlId: implementation.controlId,
            status: implementation.status,
        }, 'Control implementation recorded');
        return (0, data_envelope_js_1.createDataEnvelope)(implementation, {
            source: 'FedRAMPControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Implementation recorded'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get implementations for a tenant
     */
    getImplementations(tenantId) {
        const implementations = this.implementations.get(tenantId) || [];
        return (0, data_envelope_js_1.createDataEnvelope)(implementations, {
            source: 'FedRAMPControlsService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Implementations retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Assess FedRAMP compliance
     */
    assessCompliance(tenantId, baseline = 'Moderate') {
        const baselineControls = Array.from(this.controls.values())
            .filter(c => c.baseline.includes(baseline));
        const implementations = this.implementations.get(tenantId) || [];
        let implementedCount = 0;
        let partialCount = 0;
        let notImplementedCount = 0;
        const findings = [];
        for (const control of baselineControls) {
            const impl = implementations.find(i => i.controlId === control.controlId);
            if (!impl) {
                notImplementedCount++;
                findings.push({
                    id: (0, uuid_1.v4)(),
                    controlId: control.controlId,
                    severity: control.priority === 'P1' ? 'high' : 'moderate',
                    status: 'open',
                    description: `Control ${control.controlId} (${control.title}) is not implemented`,
                    remediation: `Implement ${control.controlId} per FedRAMP requirements`,
                });
            }
            else if (impl.status === 'implemented') {
                implementedCount++;
            }
            else if (impl.status === 'partially_implemented') {
                partialCount++;
                findings.push({
                    id: (0, uuid_1.v4)(),
                    controlId: control.controlId,
                    severity: 'moderate',
                    status: 'open',
                    description: `Control ${control.controlId} is only partially implemented`,
                    remediation: impl.findingIds.length > 0 ? 'Address open findings' : 'Complete implementation',
                });
            }
            else {
                notImplementedCount++;
            }
        }
        const totalControls = baselineControls.length;
        const complianceScore = totalControls > 0
            ? ((implementedCount + (partialCount * 0.5)) / totalControls) * 100
            : 0;
        const recommendations = [];
        if (notImplementedCount > 0) {
            recommendations.push(`Implement ${notImplementedCount} missing controls`);
        }
        if (partialCount > 0) {
            recommendations.push(`Complete implementation for ${partialCount} partial controls`);
        }
        if (complianceScore < 80) {
            recommendations.push('Schedule remediation sprint to address critical gaps');
        }
        const assessment = {
            id: (0, uuid_1.v4)(),
            tenantId,
            baseline,
            assessmentDate: new Date().toISOString(),
            assessorOrganization: 'Internal Assessment',
            totalControls,
            implementedControls: implementedCount,
            partiallyImplementedControls: partialCount,
            notImplementedControls: notImplementedCount,
            complianceScore: Math.round(complianceScore * 10) / 10,
            findings,
            recommendations,
            governanceVerdict: createVerdict(complianceScore >= 80 ? data_envelope_js_1.GovernanceResult.ALLOW :
                complianceScore >= 60 ? data_envelope_js_1.GovernanceResult.REVIEW_REQUIRED :
                    data_envelope_js_1.GovernanceResult.FLAG, `FedRAMP ${baseline} compliance: ${complianceScore.toFixed(1)}%`),
        };
        logger_js_1.default.info({
            tenantId,
            baseline,
            complianceScore: assessment.complianceScore,
            implementedControls: implementedCount,
            findings: findings.length,
        }, 'FedRAMP assessment completed');
        return (0, data_envelope_js_1.createDataEnvelope)(assessment, {
            source: 'FedRAMPControlsService',
            governanceVerdict: assessment.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get total control count for a baseline
     */
    getControlCount(baseline = 'Moderate') {
        return Array.from(this.controls.values())
            .filter(c => c.baseline.includes(baseline)).length;
    }
}
exports.FedRAMPControlsService = FedRAMPControlsService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getFedRAMPControlsService() {
    if (!instance) {
        instance = new FedRAMPControlsService();
    }
    return instance;
}
exports.default = FedRAMPControlsService;
