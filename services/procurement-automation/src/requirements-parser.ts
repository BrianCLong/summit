import {
  ProcurementFramework,
  ProcurementRequest,
  ComplianceControl,
  ATODocumentType,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Framework-specific control mappings
 * Maps frameworks to their required control families and documents
 */
const FRAMEWORK_REQUIREMENTS: Record<
  ProcurementFramework,
  {
    controlFamilies: string[];
    requiredDocuments: ATODocumentType[];
    minimumControls: number;
  }
> = {
  FedRAMP: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'CONMON_REPORT', 'SBOM'],
    minimumControls: 325,
  },
  FedRAMP_High: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'CONMON_REPORT', 'SBOM', 'PENETRATION_TEST', 'FIPS_VALIDATION'],
    minimumControls: 421,
  },
  FedRAMP_Moderate: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'CONMON_REPORT', 'SBOM'],
    minimumControls: 325,
  },
  FedRAMP_Low: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'SBOM'],
    minimumControls: 125,
  },
  StateRAMP: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER', 'SBOM'],
    minimumControls: 125,
  },
  IL2: {
    controlFamilies: ['AC', 'AU', 'CM', 'IA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SBOM'],
    minimumControls: 50,
  },
  IL4: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'SBOM', 'VULNERABILITY_SCAN'],
    minimumControls: 200,
  },
  IL5: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'SBOM', 'VULNERABILITY_SCAN', 'FIPS_VALIDATION'],
    minimumControls: 300,
  },
  IL6: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'SBOM', 'VULNERABILITY_SCAN', 'FIPS_VALIDATION', 'PENETRATION_TEST'],
    minimumControls: 400,
  },
  FISMA: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M', 'ATO_LETTER'],
    minimumControls: 200,
  },
  CMMC_L1: {
    controlFamilies: ['AC', 'IA', 'MP', 'PE', 'SC', 'SI'],
    requiredDocuments: ['SSP'],
    minimumControls: 17,
  },
  CMMC_L2: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'RE', 'RM', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'POA_M', 'SBOM'],
    minimumControls: 110,
  },
  CMMC_L3: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'RE', 'RM', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'POA_M', 'SAR', 'SBOM', 'PENETRATION_TEST'],
    minimumControls: 130,
  },
  NIST_800_53: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PL', 'PM', 'PS', 'PT', 'RA', 'SA', 'SC', 'SI', 'SR'],
    requiredDocuments: ['SSP', 'SAR', 'POA_M'],
    minimumControls: 400,
  },
  NIST_800_171: {
    controlFamilies: ['AC', 'AT', 'AU', 'CA', 'CM', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'POA_M'],
    minimumControls: 110,
  },
  CJIS: {
    controlFamilies: ['AC', 'AU', 'IA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SAR', 'CONFIGURATION_MGMT_PLAN'],
    minimumControls: 80,
  },
  ITAR: {
    controlFamilies: ['AC', 'AU', 'PE', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'SUPPLY_CHAIN_RISK'],
    minimumControls: 50,
  },
  SOC2: {
    controlFamilies: ['CC', 'A', 'C', 'PI', 'P'],
    requiredDocuments: ['SSP', 'SAR'],
    minimumControls: 60,
  },
  HIPAA: {
    controlFamilies: ['AC', 'AU', 'IA', 'SC', 'SI'],
    requiredDocuments: ['SSP', 'PIA', 'INCIDENT_RESPONSE_PLAN'],
    minimumControls: 75,
  },
};

/**
 * Control family descriptions
 */
const CONTROL_FAMILIES: Record<string, string> = {
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
  PM: 'Program Management',
  PS: 'Personnel Security',
  PT: 'PII Processing and Transparency',
  RA: 'Risk Assessment',
  RE: 'Recovery',
  RM: 'Risk Management',
  SA: 'System and Services Acquisition',
  SC: 'System and Communications Protection',
  SI: 'System and Information Integrity',
  SR: 'Supply Chain Risk Management',
  CC: 'Common Criteria (SOC2)',
  A: 'Availability (SOC2)',
  C: 'Confidentiality (SOC2)',
  PI: 'Processing Integrity (SOC2)',
  P: 'Privacy (SOC2)',
};

export interface ParsedRequirements {
  frameworks: ProcurementFramework[];
  controlFamilies: string[];
  requiredDocuments: ATODocumentType[];
  estimatedControls: number;
  dataClassification: 'public' | 'cui' | 'secret' | 'top_secret';
  riskLevel: 'low' | 'moderate' | 'high';
  estimatedTimelineDays: number;
  gapAnalysis: {
    family: string;
    familyName: string;
    required: boolean;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
  }[];
}

/**
 * RequirementsParser - Parses government procurement requirements
 * and determines applicable frameworks, controls, and documents
 */
export class RequirementsParser {
  /**
   * Parse raw requirements text and extract structured requirements
   */
  parseRequirementsText(text: string): ParsedRequirements {
    const frameworks = this.detectFrameworks(text);
    const dataClassification = this.detectDataClassification(text);

    return this.buildRequirements(frameworks, dataClassification);
  }

  /**
   * Parse from structured input
   */
  parseStructuredRequirements(input: {
    frameworks: ProcurementFramework[];
    dataClassification?: 'public' | 'cui' | 'secret' | 'top_secret';
  }): ParsedRequirements {
    return this.buildRequirements(
      input.frameworks,
      input.dataClassification || 'cui',
    );
  }

  /**
   * Detect frameworks mentioned in text
   */
  private detectFrameworks(text: string): ProcurementFramework[] {
    const frameworks: ProcurementFramework[] = [];
    const lowerText = text.toLowerCase();

    const patterns: [RegExp, ProcurementFramework][] = [
      [/fedramp\s*high/i, 'FedRAMP_High'],
      [/fedramp\s*moderate/i, 'FedRAMP_Moderate'],
      [/fedramp\s*low/i, 'FedRAMP_Low'],
      [/fedramp/i, 'FedRAMP'],
      [/stateramp/i, 'StateRAMP'],
      [/il[- ]?6/i, 'IL6'],
      [/il[- ]?5/i, 'IL5'],
      [/il[- ]?4/i, 'IL4'],
      [/il[- ]?2/i, 'IL2'],
      [/fisma/i, 'FISMA'],
      [/cmmc\s*(level\s*)?3/i, 'CMMC_L3'],
      [/cmmc\s*(level\s*)?2/i, 'CMMC_L2'],
      [/cmmc\s*(level\s*)?1/i, 'CMMC_L1'],
      [/nist\s*800[- ]?53/i, 'NIST_800_53'],
      [/nist\s*800[- ]?171/i, 'NIST_800_171'],
      [/cjis/i, 'CJIS'],
      [/itar/i, 'ITAR'],
      [/soc\s*2/i, 'SOC2'],
      [/hipaa/i, 'HIPAA'],
    ];

    for (const [pattern, framework] of patterns) {
      if (pattern.test(text) && !frameworks.includes(framework)) {
        frameworks.push(framework);
      }
    }

    return frameworks.length > 0 ? frameworks : ['FedRAMP_Moderate'];
  }

  /**
   * Detect data classification from text
   */
  private detectDataClassification(
    text: string,
  ): 'public' | 'cui' | 'secret' | 'top_secret' {
    const lowerText = text.toLowerCase();

    if (/top\s*secret|ts\/sci/i.test(text)) return 'top_secret';
    if (/\bsecret\b/i.test(text)) return 'secret';
    if (/\bcui\b|controlled\s*unclassified/i.test(text)) return 'cui';
    if (/\bpublic\b|unclassified/i.test(text)) return 'public';

    return 'cui'; // Default to CUI
  }

  /**
   * Build full requirements from frameworks and classification
   */
  private buildRequirements(
    frameworks: ProcurementFramework[],
    dataClassification: 'public' | 'cui' | 'secret' | 'top_secret',
  ): ParsedRequirements {
    // Aggregate control families and documents from all frameworks
    const controlFamiliesSet = new Set<string>();
    const requiredDocumentsSet = new Set<ATODocumentType>();
    let maxControls = 0;

    for (const framework of frameworks) {
      const reqs = FRAMEWORK_REQUIREMENTS[framework];
      reqs.controlFamilies.forEach((f) => controlFamiliesSet.add(f));
      reqs.requiredDocuments.forEach((d) => requiredDocumentsSet.add(d));
      maxControls = Math.max(maxControls, reqs.minimumControls);
    }

    const controlFamilies = Array.from(controlFamiliesSet).sort();
    const requiredDocuments = Array.from(requiredDocumentsSet);

    // Determine risk level based on classification and frameworks
    const riskLevel = this.calculateRiskLevel(frameworks, dataClassification);

    // Estimate timeline
    const estimatedTimelineDays = this.estimateTimeline(
      frameworks,
      maxControls,
      riskLevel,
    );

    // Build gap analysis
    const gapAnalysis = controlFamilies.map((family) => ({
      family,
      familyName: CONTROL_FAMILIES[family] || family,
      required: true,
      priority: this.getControlFamilyPriority(family, riskLevel),
    }));

    return {
      frameworks,
      controlFamilies,
      requiredDocuments,
      estimatedControls: maxControls,
      dataClassification,
      riskLevel,
      estimatedTimelineDays,
      gapAnalysis,
    };
  }

  /**
   * Calculate risk level based on frameworks and classification
   */
  private calculateRiskLevel(
    frameworks: ProcurementFramework[],
    classification: string,
  ): 'low' | 'moderate' | 'high' {
    if (
      classification === 'top_secret' ||
      classification === 'secret' ||
      frameworks.includes('FedRAMP_High') ||
      frameworks.includes('IL6') ||
      frameworks.includes('IL5')
    ) {
      return 'high';
    }

    if (
      classification === 'cui' ||
      frameworks.includes('FedRAMP_Moderate') ||
      frameworks.includes('IL4') ||
      frameworks.includes('CMMC_L2') ||
      frameworks.includes('CMMC_L3')
    ) {
      return 'moderate';
    }

    return 'low';
  }

  /**
   * Estimate timeline in days
   */
  private estimateTimeline(
    frameworks: ProcurementFramework[],
    controlCount: number,
    riskLevel: string,
  ): number {
    let baseDays = 90; // Base 90 days

    // Add days based on control count
    baseDays += Math.floor(controlCount / 10);

    // Multiply for risk level
    if (riskLevel === 'high') baseDays *= 1.5;
    if (riskLevel === 'moderate') baseDays *= 1.2;

    // Add for multiple frameworks
    if (frameworks.length > 1) {
      baseDays += (frameworks.length - 1) * 30;
    }

    return Math.round(baseDays);
  }

  /**
   * Get priority for control family based on risk
   */
  private getControlFamilyPriority(
    family: string,
    riskLevel: string,
  ): 'P0' | 'P1' | 'P2' | 'P3' {
    const criticalFamilies = ['AC', 'IA', 'SC', 'AU', 'SI'];
    const highFamilies = ['CM', 'IR', 'CA', 'RA'];

    if (criticalFamilies.includes(family)) return 'P0';
    if (highFamilies.includes(family)) return 'P1';
    if (riskLevel === 'high') return 'P2';
    return 'P3';
  }

  /**
   * Generate initial compliance controls from parsed requirements
   */
  generateInitialControls(
    requirements: ParsedRequirements,
  ): ComplianceControl[] {
    const controls: ComplianceControl[] = [];

    for (const gap of requirements.gapAnalysis) {
      // Generate sample controls for each family
      const familyControls = this.generateFamilyControls(
        gap.family,
        gap.familyName,
        requirements.frameworks[0],
        gap.priority,
      );
      controls.push(...familyControls);
    }

    return controls;
  }

  /**
   * Generate sample controls for a control family
   */
  private generateFamilyControls(
    family: string,
    familyName: string,
    framework: ProcurementFramework,
    priority: 'P0' | 'P1' | 'P2' | 'P3',
  ): ComplianceControl[] {
    const controls: ComplianceControl[] = [];

    // Generate 3-5 sample controls per family
    const sampleControls = this.getSampleControlsForFamily(family);

    for (let i = 0; i < sampleControls.length; i++) {
      controls.push({
        id: `${family}-${i + 1}`,
        family,
        title: sampleControls[i].title,
        description: sampleControls[i].description,
        framework,
        priority,
        status: 'not_started',
        evidence: [],
        responsibleParty: 'TBD',
        implementationNarrative: undefined,
      });
    }

    return controls;
  }

  /**
   * Get sample controls for common families
   */
  private getSampleControlsForFamily(
    family: string,
  ): { title: string; description: string }[] {
    const samples: Record<string, { title: string; description: string }[]> = {
      AC: [
        { title: 'Account Management', description: 'Manage information system accounts.' },
        { title: 'Access Enforcement', description: 'Enforce approved authorizations.' },
        { title: 'Least Privilege', description: 'Employ principle of least privilege.' },
        { title: 'Remote Access', description: 'Establish and document remote access.' },
      ],
      IA: [
        { title: 'Identification and Authentication', description: 'Uniquely identify users.' },
        { title: 'Multi-factor Authentication', description: 'Implement MFA for access.' },
        { title: 'Authenticator Management', description: 'Manage authenticators.' },
      ],
      SC: [
        { title: 'Transmission Confidentiality', description: 'Protect transmitted information.' },
        { title: 'Cryptographic Protection', description: 'Implement cryptographic mechanisms.' },
        { title: 'Boundary Protection', description: 'Monitor at managed interfaces.' },
      ],
      AU: [
        { title: 'Audit Events', description: 'Generate audit events.' },
        { title: 'Audit Review and Analysis', description: 'Review and analyze audit records.' },
        { title: 'Audit Storage Capacity', description: 'Allocate audit storage capacity.' },
      ],
      SI: [
        { title: 'Flaw Remediation', description: 'Identify and correct flaws.' },
        { title: 'Malicious Code Protection', description: 'Protect against malicious code.' },
        { title: 'Information System Monitoring', description: 'Monitor the information system.' },
      ],
    };

    return samples[family] || [
      { title: `${family} Control 1`, description: `Implementation of ${family} requirements.` },
      { title: `${family} Control 2`, description: `Monitoring for ${family} compliance.` },
    ];
  }
}
