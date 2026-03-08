"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATODocumentGenerator = void 0;
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
/**
 * ATODocumentGenerator - Generates ATO package documents
 */
class ATODocumentGenerator {
    organization;
    system;
    controls;
    sbom;
    constructor(organization, system, controls, sbom) {
        this.organization = organization;
        this.system = system;
        this.controls = controls;
        this.sbom = sbom;
    }
    /**
     * Generate full ATO package
     */
    async generateATOPackage(framework, options = {}) {
        const defaultOptions = {
            format: 'markdown',
            includeEvidence: true,
            includeControlNarratives: true,
            signatureRequired: false,
            ...options,
        };
        const requiredDocs = this.getRequiredDocuments(framework);
        const documents = [];
        for (const docType of requiredDocs) {
            const doc = await this.generateDocument(docType, defaultOptions);
            documents.push({
                type: docType,
                name: doc.name,
                version: doc.version,
                status: 'draft',
                generatedAt: doc.generatedAt,
            });
        }
        const completionPercentage = this.calculateCompletion();
        const riskScore = this.calculateRiskScore();
        return {
            id: (0, uuid_1.v4)(),
            procurementRequestId: (0, uuid_1.v4)(),
            framework,
            status: completionPercentage >= 100 ? 'pending_review' : 'in_progress',
            documents,
            controls: this.controls,
            riskScore,
            completionPercentage,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    /**
     * Generate a single document
     */
    async generateDocument(docType, options) {
        const generators = {
            SSP: () => this.generateSSP(options),
            SAR: () => this.generateSAR(options),
            POA_M: () => this.generatePOAM(options),
            ATO_LETTER: () => this.generateATOLetter(options),
            CONMON_REPORT: () => this.generateConMonReport(options),
            INCIDENT_RESPONSE_PLAN: () => this.generateIRP(options),
            CONFIGURATION_MGMT_PLAN: () => this.generateCMP(options),
            CONTINGENCY_PLAN: () => this.generateCP(options),
            PIA: () => this.generatePIA(options),
            PTA: () => this.generatePTA(options),
            SBOM: () => this.generateSBOMDocument(options),
            VULNERABILITY_SCAN: () => this.generateVulnScanReport(options),
            PENETRATION_TEST: () => this.generatePenTestReport(options),
            FIPS_VALIDATION: () => this.generateFIPSValidation(options),
            SUPPLY_CHAIN_RISK: () => this.generateSCRM(options),
        };
        const content = generators[docType]();
        return {
            id: (0, uuid_1.v4)(),
            type: docType,
            name: this.getDocumentName(docType),
            version: '1.0',
            content,
            format: options.format,
            generatedAt: new Date(),
            metadata: {
                organization: this.organization.name,
                system: this.system.systemName,
                controlCount: this.controls.length,
            },
        };
    }
    /**
     * Get required documents for framework
     */
    getRequiredDocuments(framework) {
        const requirements = {
            FedRAMP: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'CONMON_REPORT', 'SBOM'],
            FedRAMP_High: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'CONMON_REPORT', 'SBOM', 'PENETRATION_TEST', 'FIPS_VALIDATION'],
            FedRAMP_Moderate: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'CONMON_REPORT', 'SBOM'],
            FedRAMP_Low: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'SBOM'],
            StateRAMP: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'SBOM'],
            IL2: ['SSP', 'SBOM'],
            IL4: ['SSP', 'SAR', 'POA_M', 'SBOM', 'VULNERABILITY_SCAN'],
            IL5: ['SSP', 'SAR', 'POA_M', 'SBOM', 'VULNERABILITY_SCAN', 'FIPS_VALIDATION'],
            IL6: ['SSP', 'SAR', 'POA_M', 'SBOM', 'VULNERABILITY_SCAN', 'FIPS_VALIDATION', 'PENETRATION_TEST'],
            FISMA: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER'],
            CMMC_L1: ['SSP'],
            CMMC_L2: ['SSP', 'POA_M', 'SBOM'],
            CMMC_L3: ['SSP', 'POA_M', 'SAR', 'SBOM', 'PENETRATION_TEST'],
            NIST_800_53: ['SSP', 'SAR', 'POA_M'],
            NIST_800_171: ['SSP', 'POA_M'],
            CJIS: ['SSP', 'SAR', 'CONFIGURATION_MGMT_PLAN'],
            ITAR: ['SSP', 'SUPPLY_CHAIN_RISK'],
            SOC2: ['SSP', 'SAR'],
            HIPAA: ['SSP', 'PIA', 'INCIDENT_RESPONSE_PLAN'],
        };
        return requirements[framework] || ['SSP'];
    }
    /**
     * Get document display name
     */
    getDocumentName(docType) {
        const names = {
            SSP: 'System Security Plan',
            SAR: 'Security Assessment Report',
            POA_M: 'Plan of Action and Milestones',
            ATO_LETTER: 'Authorization to Operate Letter',
            CONMON_REPORT: 'Continuous Monitoring Report',
            INCIDENT_RESPONSE_PLAN: 'Incident Response Plan',
            CONFIGURATION_MGMT_PLAN: 'Configuration Management Plan',
            CONTINGENCY_PLAN: 'Contingency Plan',
            PIA: 'Privacy Impact Assessment',
            PTA: 'Privacy Threshold Analysis',
            SBOM: 'Software Bill of Materials',
            VULNERABILITY_SCAN: 'Vulnerability Scan Report',
            PENETRATION_TEST: 'Penetration Test Report',
            FIPS_VALIDATION: 'FIPS 140-2/3 Validation Certificate',
            SUPPLY_CHAIN_RISK: 'Supply Chain Risk Management Plan',
        };
        return names[docType];
    }
    /**
     * Generate System Security Plan
     */
    generateSSP(options) {
        const date = (0, date_fns_1.format)(new Date(), 'MMMM d, yyyy');
        const controlsByFamily = this.groupControlsByFamily();
        return `# System Security Plan (SSP)
## ${this.system.systemName}

**Version:** 1.0
**Date:** ${date}
**Organization:** ${this.organization.name}
**Classification:** ${this.system.fipsCategory.confidentiality.toUpperCase()}

---

## 1. System Identification

| Field | Value |
|-------|-------|
| System Name | ${this.system.systemName} |
| System Acronym | ${this.system.systemAcronym} |
| System Type | ${this.system.systemType} |
| Deployment Model | ${this.system.deploymentModel} |
| Operational Status | ${this.system.operationalStatus} |
| Cloud Provider | ${this.system.cloudProvider || 'N/A'} |

### 1.1 System Description
${this.system.systemDescription}

### 1.2 System Boundary

**Components:**
${this.system.systemBoundary.components.map((c) => `- ${c}`).join('\n')}

**Data Flows:**
${this.system.systemBoundary.dataFlows.map((d) => `- ${d}`).join('\n')}

**External Interfaces:**
${this.system.systemBoundary.externalInterfaces.map((i) => `- ${i}`).join('\n')}

---

## 2. Organization Information

| Field | Value |
|-------|-------|
| Organization | ${this.organization.name} |
| Address | ${this.organization.address}, ${this.organization.city}, ${this.organization.state} ${this.organization.zip} |
| Website | ${this.organization.website} |
| DUNS | ${this.organization.dunsNumber || 'N/A'} |
| CAGE Code | ${this.organization.cageCode || 'N/A'} |

### 2.1 Key Contacts

**Authorized Representative:**
- Name: ${this.organization.authorizedRepresentative.name}
- Title: ${this.organization.authorizedRepresentative.title}
- Email: ${this.organization.authorizedRepresentative.email}

**Technical Contact:**
- Name: ${this.organization.technicalContact.name}
- Email: ${this.organization.technicalContact.email}

**Security Contact:**
- Name: ${this.organization.securityContact.name}
- Email: ${this.organization.securityContact.email}

---

## 3. Security Categorization (FIPS 199)

| Impact Area | Level |
|-------------|-------|
| Confidentiality | ${this.system.fipsCategory.confidentiality.toUpperCase()} |
| Integrity | ${this.system.fipsCategory.integrity.toUpperCase()} |
| Availability | ${this.system.fipsCategory.availability.toUpperCase()} |

**Overall Categorization:** ${this.getOverallCategorization()}

---

## 4. System Environment

**Data Types Processed:**
${this.system.dataTypes.map((t) => `- ${t}`).join('\n')}

**User Types:**
${this.system.userTypes.map((u) => `- ${u}`).join('\n')}

**Estimated Users:** ${this.system.estimatedUsers}

---

## 5. Security Control Implementation

**Total Controls:** ${this.controls.length}

${Object.entries(controlsByFamily)
            .map(([family, controls]) => `
### ${family} - ${this.getControlFamilyName(family)}

| Control ID | Title | Status | Priority |
|------------|-------|--------|----------|
${controls.map((c) => `| ${c.id} | ${c.title} | ${c.status} | ${c.priority} |`).join('\n')}
${options.includeControlNarratives
            ? controls
                .filter((c) => c.implementationNarrative)
                .map((c) => `\n**${c.id} Implementation:**\n${c.implementationNarrative}`)
                .join('\n')
            : ''}
`)
            .join('\n')}

---

## 6. Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| System Owner | ${this.organization.authorizedRepresentative.name} | _______________ | __________ |
| ISSO | ${this.organization.securityContact.name} | _______________ | __________ |
| Authorizing Official | | _______________ | __________ |

---

*Document generated by Procurement Automation Engine*
`;
    }
    /**
     * Generate Security Assessment Report
     */
    generateSAR(options) {
        const date = (0, date_fns_1.format)(new Date(), 'MMMM d, yyyy');
        const findings = this.generateFindings();
        return `# Security Assessment Report (SAR)
## ${this.system.systemName}

**Version:** 1.0
**Assessment Date:** ${date}
**Organization:** ${this.organization.name}

---

## 1. Executive Summary

This Security Assessment Report documents the assessment of ${this.system.systemName} conducted for ${this.organization.name}. The assessment evaluated ${this.controls.length} security controls.

### Assessment Results Summary

| Category | Count |
|----------|-------|
| Controls Assessed | ${this.controls.length} |
| Satisfied | ${this.controls.filter((c) => c.status === 'assessed').length} |
| Other Than Satisfied | ${this.controls.filter((c) => c.status !== 'assessed').length} |
| Findings | ${findings.length} |

---

## 2. Assessment Methodology

The assessment was conducted using the following methodology:
- Documentation review
- Technical testing
- Interview with key personnel
- Evidence collection and validation

---

## 3. Findings

${findings.length === 0 ? '*No findings identified*' : findings.map((f, i) => `
### Finding ${i + 1}: ${f.title}

| Field | Value |
|-------|-------|
| Risk Level | ${f.risk} |
| Control | ${f.controlId} |
| Status | Open |

**Description:** ${f.description}

**Recommendation:** ${f.recommendation}
`).join('\n')}

---

## 4. Recommendations

1. Address all findings in the POA&M
2. Implement continuous monitoring
3. Conduct regular assessments

---

*Document generated by Procurement Automation Engine*
`;
    }
    /**
     * Generate POA&M
     */
    generatePOAM(options) {
        const date = (0, date_fns_1.format)(new Date(), 'MMMM d, yyyy');
        const findings = this.generateFindings();
        return `# Plan of Action and Milestones (POA&M)
## ${this.system.systemName}

**Version:** 1.0
**Date:** ${date}
**Organization:** ${this.organization.name}

---

## Summary

| Metric | Value |
|--------|-------|
| Total Items | ${findings.length} |
| Critical | ${findings.filter((f) => f.risk === 'Critical').length} |
| High | ${findings.filter((f) => f.risk === 'High').length} |
| Moderate | ${findings.filter((f) => f.risk === 'Moderate').length} |
| Low | ${findings.filter((f) => f.risk === 'Low').length} |

---

## POA&M Items

${findings.map((f, i) => `
### POA&M-${String(i + 1).padStart(3, '0')}

| Field | Value |
|-------|-------|
| Weakness | ${f.title} |
| Risk Level | ${f.risk} |
| Control | ${f.controlId} |
| Responsible Party | ${this.organization.securityContact.name} |
| Scheduled Completion | TBD |
| Status | Open |

**Description:** ${f.description}

**Milestones:**
1. [ ] Initial assessment - Due: TBD
2. [ ] Remediation implementation - Due: TBD
3. [ ] Verification testing - Due: TBD
`).join('\n')}

---

*Document generated by Procurement Automation Engine*
`;
    }
    /**
     * Generate ATO Letter
     */
    generateATOLetter(options) {
        const date = (0, date_fns_1.format)(new Date(), 'MMMM d, yyyy');
        return `# Authorization to Operate (ATO) Letter
## ${this.system.systemName}

**Date:** ${date}

---

**TO:** ${this.organization.authorizedRepresentative.name}, ${this.organization.authorizedRepresentative.title}

**FROM:** Authorizing Official

**SUBJECT:** Authorization to Operate for ${this.system.systemName} (${this.system.systemAcronym})

---

## Authorization Decision

Based on the security assessment conducted and documented in the Security Assessment Report (SAR), and review of the System Security Plan (SSP) and Plan of Action and Milestones (POA&M), I hereby:

☐ **GRANT** Authorization to Operate
☐ **GRANT** Authorization to Operate with Conditions
☐ **DENY** Authorization to Operate

## Authorization Details

| Field | Value |
|-------|-------|
| System Name | ${this.system.systemName} |
| System Owner | ${this.organization.name} |
| Security Categorization | ${this.getOverallCategorization()} |
| ATO Effective Date | ________________ |
| ATO Expiration Date | ________________ |

## Conditions (if applicable)

_______________________________________________________________________

## Signatures

**Authorizing Official:**

Signature: _________________________
Name: _________________________
Title: _________________________
Date: _________________________

---

*Document generated by Procurement Automation Engine*
`;
    }
    /**
     * Generate Continuous Monitoring Report
     */
    generateConMonReport(options) {
        const date = (0, date_fns_1.format)(new Date(), 'MMMM d, yyyy');
        return `# Continuous Monitoring Report
## ${this.system.systemName}

**Reporting Period:** ${date}
**Organization:** ${this.organization.name}

---

## 1. Executive Summary

This report provides the monthly continuous monitoring status for ${this.system.systemName}.

## 2. Vulnerability Management

| Metric | Value |
|--------|-------|
| Open Vulnerabilities | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Remediated This Period | 0 |

## 3. POA&M Status

| Status | Count |
|--------|-------|
| Open | 0 |
| Closed | 0 |
| Delayed | 0 |

## 4. Security Events

No significant security events during this reporting period.

## 5. Control Assessment Summary

All controls operating as intended.

---

*Document generated by Procurement Automation Engine*
`;
    }
    // Stub generators for other document types
    generateIRP(options) {
        return `# Incident Response Plan\n## ${this.system.systemName}\n\n*Template - requires completion*`;
    }
    generateCMP(options) {
        return `# Configuration Management Plan\n## ${this.system.systemName}\n\n*Template - requires completion*`;
    }
    generateCP(options) {
        return `# Contingency Plan\n## ${this.system.systemName}\n\n*Template - requires completion*`;
    }
    generatePIA(options) {
        return `# Privacy Impact Assessment\n## ${this.system.systemName}\n\n*Template - requires completion*`;
    }
    generatePTA(options) {
        return `# Privacy Threshold Analysis\n## ${this.system.systemName}\n\n*Template - requires completion*`;
    }
    generateSBOMDocument(options) {
        if (!this.sbom) {
            return `# Software Bill of Materials\n## ${this.system.systemName}\n\n*SBOM not yet generated. Run SBOM generator to create.*`;
        }
        return `# Software Bill of Materials Summary\n## ${this.system.systemName}\n\n**Format:** ${this.sbom.format}\n**Components:** ${this.sbom.components}\n**Generated:** ${this.sbom.generatedAt}\n\n*Full SBOM available in ${this.sbom.format} format*`;
    }
    generateVulnScanReport(options) {
        return `# Vulnerability Scan Report\n## ${this.system.systemName}\n\n*Requires integration with vulnerability scanner*`;
    }
    generatePenTestReport(options) {
        return `# Penetration Test Report\n## ${this.system.systemName}\n\n*Requires third-party assessment*`;
    }
    generateFIPSValidation(options) {
        return `# FIPS 140-2/3 Validation\n## ${this.system.systemName}\n\n*Requires NIST CMVP validation*`;
    }
    generateSCRM(options) {
        return `# Supply Chain Risk Management Plan\n## ${this.system.systemName}\n\n*Template - requires completion*`;
    }
    // Helper methods
    groupControlsByFamily() {
        return this.controls.reduce((acc, control) => {
            const family = control.family;
            if (!acc[family]) {
                acc[family] = [];
            }
            acc[family].push(control);
            return acc;
        }, {});
    }
    getControlFamilyName(family) {
        const names = {
            AC: 'Access Control',
            AT: 'Awareness and Training',
            AU: 'Audit and Accountability',
            CA: 'Assessment, Authorization, and Monitoring',
            CM: 'Configuration Management',
            CP: 'Contingency Planning',
            IA: 'Identification and Authentication',
            IR: 'Incident Response',
            MA: 'Maintenance',
            MP: 'Media Protection',
            PE: 'Physical and Environmental Protection',
            PL: 'Planning',
            PS: 'Personnel Security',
            RA: 'Risk Assessment',
            SA: 'System and Services Acquisition',
            SC: 'System and Communications Protection',
            SI: 'System and Information Integrity',
            SR: 'Supply Chain Risk Management',
        };
        return names[family] || family;
    }
    getOverallCategorization() {
        const levels = ['low', 'moderate', 'high'];
        const max = Math.max(levels.indexOf(this.system.fipsCategory.confidentiality), levels.indexOf(this.system.fipsCategory.integrity), levels.indexOf(this.system.fipsCategory.availability));
        return levels[max].toUpperCase();
    }
    calculateCompletion() {
        const implemented = this.controls.filter((c) => c.status === 'implemented' || c.status === 'assessed').length;
        return Math.round((implemented / this.controls.length) * 100);
    }
    calculateRiskScore() {
        const weights = { P0: 40, P1: 30, P2: 20, P3: 10 };
        const notImplemented = this.controls.filter((c) => c.status === 'not_started' || c.status === 'in_progress');
        const riskPoints = notImplemented.reduce((sum, c) => sum + weights[c.priority], 0);
        return Math.min(100, riskPoints);
    }
    generateFindings() {
        return this.controls
            .filter((c) => c.status === 'not_started' || c.status === 'in_progress')
            .slice(0, 5)
            .map((c) => ({
            title: `${c.id}: ${c.title} - Not Implemented`,
            description: c.description,
            risk: c.priority === 'P0' ? 'Critical' : c.priority === 'P1' ? 'High' : c.priority === 'P2' ? 'Moderate' : 'Low',
            controlId: c.id,
            recommendation: `Implement ${c.title} control as documented in the SSP.`,
        }));
    }
}
exports.ATODocumentGenerator = ATODocumentGenerator;
