/**
 * ESG Compliance Frameworks
 * Definitions and mappings for major ESG reporting standards
 */

import type { ESGCategory, ComplianceStatus } from '../types/esg-models.js';

// ============================================================================
// Framework Definitions
// ============================================================================

export interface FrameworkRequirement {
  id: string;
  name: string;
  description: string;
  category: ESGCategory;
  subcategory: string;
  metrics: string[];
  mandatory: boolean;
  guidance?: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  fullName: string;
  version: string;
  description: string;
  website: string;
  categories: ESGCategory[];
  requirements: FrameworkRequirement[];
  industrySpecific: boolean;
  geographicScope: 'global' | 'regional' | string[];
}

// ============================================================================
// GRI Standards (Global Reporting Initiative)
// ============================================================================

export const GRI_FRAMEWORK: ComplianceFramework = {
  id: 'gri',
  name: 'GRI Standards',
  fullName: 'Global Reporting Initiative Standards',
  version: '2021',
  description:
    'The most widely used standards for sustainability reporting, providing a comprehensive framework for organizations to report their impacts on the economy, environment, and society.',
  website: 'https://www.globalreporting.org',
  categories: ['environmental', 'social', 'governance'],
  industrySpecific: false,
  geographicScope: 'global',
  requirements: [
    // Environmental
    {
      id: 'gri-302',
      name: 'Energy',
      description:
        'Energy consumption within and outside the organization, energy intensity, reduction of energy consumption',
      category: 'environmental',
      subcategory: 'energy',
      metrics: [
        'totalEnergyConsumption',
        'renewableEnergy',
        'energyIntensity',
        'energyReduction',
      ],
      mandatory: true,
      guidance:
        'Report in joules, watt-hours, or multiples. Include all fuel types.',
    },
    {
      id: 'gri-303',
      name: 'Water and Effluents',
      description: 'Water withdrawal, consumption, and discharge',
      category: 'environmental',
      subcategory: 'water',
      metrics: [
        'waterWithdrawal',
        'waterDischarge',
        'waterConsumption',
        'waterRecycled',
      ],
      mandatory: true,
    },
    {
      id: 'gri-305',
      name: 'Emissions',
      description: 'GHG emissions (Scope 1, 2, 3), emissions intensity, reduction',
      category: 'environmental',
      subcategory: 'emissions',
      metrics: [
        'scope1Emissions',
        'scope2Emissions',
        'scope3Emissions',
        'emissionsIntensity',
        'emissionsReduction',
      ],
      mandatory: true,
      guidance: 'Use GHG Protocol methodology. Report in tonnes of CO2 equivalent.',
    },
    {
      id: 'gri-306',
      name: 'Waste',
      description: 'Waste generation, diversion from disposal, waste directed to disposal',
      category: 'environmental',
      subcategory: 'waste',
      metrics: [
        'totalWaste',
        'hazardousWaste',
        'wasteRecycled',
        'wasteDiversionRate',
      ],
      mandatory: true,
    },
    // Social
    {
      id: 'gri-401',
      name: 'Employment',
      description:
        'New employee hires, employee turnover, benefits provided to full-time employees',
      category: 'social',
      subcategory: 'employment',
      metrics: ['newHires', 'turnoverRate', 'benefitsCoverage'],
      mandatory: true,
    },
    {
      id: 'gri-403',
      name: 'Occupational Health and Safety',
      description:
        'Work-related injuries, ill health, hazard identification, worker training on health and safety',
      category: 'social',
      subcategory: 'healthSafety',
      metrics: [
        'injuryRate',
        'lostTimeInjuryRate',
        'fatalities',
        'safetyTrainingHours',
      ],
      mandatory: true,
    },
    {
      id: 'gri-404',
      name: 'Training and Education',
      description:
        'Average hours of training per employee, programs for upgrading employee skills',
      category: 'social',
      subcategory: 'training',
      metrics: ['trainingHoursPerEmployee', 'trainingInvestment'],
      mandatory: true,
    },
    {
      id: 'gri-405',
      name: 'Diversity and Equal Opportunity',
      description: 'Diversity of governance bodies and employees',
      category: 'social',
      subcategory: 'diversity',
      metrics: ['genderDiversity', 'boardDiversity', 'ageDistribution'],
      mandatory: true,
    },
    // Governance
    {
      id: 'gri-205',
      name: 'Anti-corruption',
      description:
        'Operations assessed for corruption risks, communication and training about anti-corruption',
      category: 'governance',
      subcategory: 'ethics',
      metrics: [
        'corruptionRiskAssessments',
        'antiCorruptionTraining',
        'corruptionIncidents',
      ],
      mandatory: true,
    },
    {
      id: 'gri-206',
      name: 'Anti-competitive Behavior',
      description:
        'Legal actions for anti-competitive behavior, anti-trust, and monopoly practices',
      category: 'governance',
      subcategory: 'ethics',
      metrics: ['antiCompetitiveIncidents'],
      mandatory: true,
    },
  ],
};

// ============================================================================
// SASB Standards (Sustainability Accounting Standards Board)
// ============================================================================

export const SASB_FRAMEWORK: ComplianceFramework = {
  id: 'sasb',
  name: 'SASB Standards',
  fullName: 'Sustainability Accounting Standards Board Standards',
  version: '2023',
  description:
    'Industry-specific standards designed to identify financially material sustainability information for investor decision-making.',
  website: 'https://www.sasb.org',
  categories: ['environmental', 'social', 'governance'],
  industrySpecific: true,
  geographicScope: 'global',
  requirements: [
    // Environmental - General
    {
      id: 'sasb-ghg',
      name: 'GHG Emissions',
      description:
        'Gross global Scope 1 emissions, percentage covered under emissions-limiting regulations',
      category: 'environmental',
      subcategory: 'emissions',
      metrics: ['scope1Emissions', 'scope2Emissions', 'regulatoryCoverage'],
      mandatory: true,
    },
    {
      id: 'sasb-energy',
      name: 'Energy Management',
      description:
        'Total energy consumed, percentage grid electricity, percentage renewable',
      category: 'environmental',
      subcategory: 'energy',
      metrics: ['totalEnergyConsumption', 'gridElectricity', 'renewablePercentage'],
      mandatory: true,
    },
    {
      id: 'sasb-water',
      name: 'Water Management',
      description:
        'Total water withdrawn, total water consumed, percentage in water-stressed regions',
      category: 'environmental',
      subcategory: 'water',
      metrics: ['waterWithdrawal', 'waterConsumption', 'waterStressExposure'],
      mandatory: true,
    },
    // Social
    {
      id: 'sasb-workforce',
      name: 'Employee Health & Safety',
      description: 'Total recordable incident rate, fatality rate, near miss frequency rate',
      category: 'social',
      subcategory: 'healthSafety',
      metrics: ['trir', 'fatalityRate', 'nearMissRate'],
      mandatory: true,
    },
    {
      id: 'sasb-diversity',
      name: 'Employee Engagement, Diversity & Inclusion',
      description:
        'Percentage of gender and racial/ethnic group representation for management and workforce',
      category: 'social',
      subcategory: 'diversity',
      metrics: ['genderDiversityManagement', 'ethnicDiversityManagement'],
      mandatory: true,
    },
    // Governance
    {
      id: 'sasb-data-security',
      name: 'Data Security',
      description:
        'Number of data breaches, percentage involving personally identifiable information',
      category: 'governance',
      subcategory: 'cybersecurity',
      metrics: ['dataBreaches', 'piiBreaches'],
      mandatory: true,
    },
    {
      id: 'sasb-business-ethics',
      name: 'Business Ethics',
      description:
        'Description of policies and procedures to ensure ethical conduct',
      category: 'governance',
      subcategory: 'ethics',
      metrics: ['ethicsTraining', 'whistleblowerCases'],
      mandatory: true,
    },
  ],
};

// ============================================================================
// TCFD (Task Force on Climate-related Financial Disclosures)
// ============================================================================

export const TCFD_FRAMEWORK: ComplianceFramework = {
  id: 'tcfd',
  name: 'TCFD',
  fullName: 'Task Force on Climate-related Financial Disclosures',
  version: '2021',
  description:
    'Recommendations for climate-related financial disclosures organized around governance, strategy, risk management, and metrics & targets.',
  website: 'https://www.fsb-tcfd.org',
  categories: ['environmental', 'governance'],
  industrySpecific: false,
  geographicScope: 'global',
  requirements: [
    // Governance
    {
      id: 'tcfd-gov-a',
      name: 'Board Oversight',
      description:
        "Board's oversight of climate-related risks and opportunities",
      category: 'governance',
      subcategory: 'boardOversight',
      metrics: ['climateOversightFrequency', 'boardClimateCompetency'],
      mandatory: true,
      guidance:
        'Describe how the board monitors and oversees progress against goals and targets.',
    },
    {
      id: 'tcfd-gov-b',
      name: 'Management Role',
      description:
        "Management's role in assessing and managing climate-related risks and opportunities",
      category: 'governance',
      subcategory: 'management',
      metrics: ['climateCommittees', 'managementReportingFrequency'],
      mandatory: true,
    },
    // Strategy
    {
      id: 'tcfd-strat-a',
      name: 'Climate Risks and Opportunities',
      description:
        'Climate-related risks and opportunities identified over short, medium, and long term',
      category: 'environmental',
      subcategory: 'climateRisk',
      metrics: ['physicalRisks', 'transitionRisks', 'climateOpportunities'],
      mandatory: true,
    },
    {
      id: 'tcfd-strat-b',
      name: 'Business Impact',
      description:
        "Impact of climate-related risks and opportunities on organization's businesses, strategy, and financial planning",
      category: 'environmental',
      subcategory: 'climateStrategy',
      metrics: ['revenueAtRisk', 'assetsAtRisk', 'adaptationInvestment'],
      mandatory: true,
    },
    {
      id: 'tcfd-strat-c',
      name: 'Scenario Analysis',
      description:
        "Resilience of organization's strategy considering different climate-related scenarios",
      category: 'environmental',
      subcategory: 'scenarioAnalysis',
      metrics: ['scenariosAnalyzed', 'resilienceAssessment'],
      mandatory: true,
    },
    // Risk Management
    {
      id: 'tcfd-risk-a',
      name: 'Risk Identification',
      description: 'Processes for identifying and assessing climate-related risks',
      category: 'governance',
      subcategory: 'riskManagement',
      metrics: ['riskAssessmentFrequency', 'riskFrameworkMaturity'],
      mandatory: true,
    },
    {
      id: 'tcfd-risk-b',
      name: 'Risk Management Process',
      description: 'Processes for managing climate-related risks',
      category: 'governance',
      subcategory: 'riskManagement',
      metrics: ['riskMitigationActions', 'riskTransferMechanisms'],
      mandatory: true,
    },
    // Metrics and Targets
    {
      id: 'tcfd-metrics-a',
      name: 'Climate Metrics',
      description:
        'Metrics used to assess climate-related risks and opportunities',
      category: 'environmental',
      subcategory: 'emissions',
      metrics: ['scope1Emissions', 'scope2Emissions', 'scope3Emissions'],
      mandatory: true,
    },
    {
      id: 'tcfd-metrics-b',
      name: 'GHG Emissions',
      description: 'Scope 1, Scope 2, and if appropriate, Scope 3 GHG emissions',
      category: 'environmental',
      subcategory: 'emissions',
      metrics: ['scope1Emissions', 'scope2Emissions', 'scope3Emissions'],
      mandatory: true,
    },
    {
      id: 'tcfd-metrics-c',
      name: 'Climate Targets',
      description:
        'Targets used to manage climate-related risks and opportunities',
      category: 'environmental',
      subcategory: 'targets',
      metrics: ['emissionsReductionTarget', 'netZeroTarget', 'renewableTarget'],
      mandatory: true,
    },
  ],
};

// ============================================================================
// CDP (Carbon Disclosure Project)
// ============================================================================

export const CDP_FRAMEWORK: ComplianceFramework = {
  id: 'cdp',
  name: 'CDP',
  fullName: 'Carbon Disclosure Project',
  version: '2024',
  description:
    'Global disclosure system for environmental impact covering climate change, water security, and deforestation.',
  website: 'https://www.cdp.net',
  categories: ['environmental'],
  industrySpecific: false,
  geographicScope: 'global',
  requirements: [
    {
      id: 'cdp-cc-1',
      name: 'Governance',
      description: 'Board-level oversight and management responsibility for climate issues',
      category: 'environmental',
      subcategory: 'governance',
      metrics: ['boardOversight', 'managementResponsibility'],
      mandatory: true,
    },
    {
      id: 'cdp-cc-2',
      name: 'Risks and Opportunities',
      description:
        'Climate-related risks and opportunities including financial implications',
      category: 'environmental',
      subcategory: 'climateRisk',
      metrics: ['physicalRisks', 'transitionRisks', 'financialImplications'],
      mandatory: true,
    },
    {
      id: 'cdp-cc-3',
      name: 'Business Strategy',
      description: 'Climate-related aspects of business strategy',
      category: 'environmental',
      subcategory: 'strategy',
      metrics: ['climateIntegration', 'lowCarbonProducts'],
      mandatory: true,
    },
    {
      id: 'cdp-cc-4',
      name: 'Targets and Performance',
      description: 'Emissions reduction targets and performance against targets',
      category: 'environmental',
      subcategory: 'targets',
      metrics: ['emissionsTargets', 'targetProgress', 'scienceBasedTargets'],
      mandatory: true,
    },
    {
      id: 'cdp-cc-5',
      name: 'Emissions Methodology',
      description: 'Methodology and verification of emissions data',
      category: 'environmental',
      subcategory: 'emissions',
      metrics: ['scope1Emissions', 'scope2Emissions', 'scope3Emissions', 'verification'],
      mandatory: true,
    },
    {
      id: 'cdp-cc-6',
      name: 'Energy',
      description: 'Energy-related activities and consumption',
      category: 'environmental',
      subcategory: 'energy',
      metrics: ['energyConsumption', 'renewableEnergy', 'energyEfficiency'],
      mandatory: true,
    },
    {
      id: 'cdp-water-1',
      name: 'Water Accounting',
      description: 'Water accounting including withdrawals, discharges, and consumption',
      category: 'environmental',
      subcategory: 'water',
      metrics: ['waterWithdrawal', 'waterDischarge', 'waterConsumption'],
      mandatory: false,
    },
  ],
};

// ============================================================================
// EU CSRD (Corporate Sustainability Reporting Directive)
// ============================================================================

export const CSRD_FRAMEWORK: ComplianceFramework = {
  id: 'csrd',
  name: 'EU CSRD',
  fullName: 'EU Corporate Sustainability Reporting Directive',
  version: '2024',
  description:
    'EU directive requiring companies to report on sustainability matters using European Sustainability Reporting Standards (ESRS).',
  website: 'https://ec.europa.eu/info/business-economy-euro/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en',
  categories: ['environmental', 'social', 'governance'],
  industrySpecific: false,
  geographicScope: ['EU', 'EEA'],
  requirements: [
    // ESRS E1 - Climate Change
    {
      id: 'esrs-e1',
      name: 'Climate Change',
      description:
        'Climate change mitigation, adaptation, energy, and GHG emissions',
      category: 'environmental',
      subcategory: 'climate',
      metrics: [
        'scope1Emissions',
        'scope2Emissions',
        'scope3Emissions',
        'emissionsTargets',
        'energyConsumption',
      ],
      mandatory: true,
    },
    // ESRS E2 - Pollution
    {
      id: 'esrs-e2',
      name: 'Pollution',
      description: 'Air, water, and soil pollution prevention and control',
      category: 'environmental',
      subcategory: 'pollution',
      metrics: ['airEmissions', 'waterPollution', 'soilContamination'],
      mandatory: true,
    },
    // ESRS E3 - Water and Marine Resources
    {
      id: 'esrs-e3',
      name: 'Water and Marine Resources',
      description: 'Water consumption, marine resources, and oceans',
      category: 'environmental',
      subcategory: 'water',
      metrics: ['waterConsumption', 'marineImpact'],
      mandatory: true,
    },
    // ESRS E4 - Biodiversity
    {
      id: 'esrs-e4',
      name: 'Biodiversity and Ecosystems',
      description: 'Impact on biodiversity and ecosystems',
      category: 'environmental',
      subcategory: 'biodiversity',
      metrics: ['biodiversityImpact', 'landUse', 'ecosystemServices'],
      mandatory: true,
    },
    // ESRS E5 - Circular Economy
    {
      id: 'esrs-e5',
      name: 'Resource Use and Circular Economy',
      description: 'Resource inflows, outflows, and waste',
      category: 'environmental',
      subcategory: 'circularEconomy',
      metrics: ['resourceConsumption', 'wasteGeneration', 'recyclingRate'],
      mandatory: true,
    },
    // ESRS S1 - Own Workforce
    {
      id: 'esrs-s1',
      name: 'Own Workforce',
      description:
        'Working conditions, equal treatment, and other work-related rights',
      category: 'social',
      subcategory: 'workforce',
      metrics: [
        'employeeCount',
        'workingConditions',
        'equalTreatment',
        'healthSafety',
      ],
      mandatory: true,
    },
    // ESRS S2 - Workers in Value Chain
    {
      id: 'esrs-s2',
      name: 'Workers in Value Chain',
      description: 'Working conditions for workers in the value chain',
      category: 'social',
      subcategory: 'supplyChain',
      metrics: ['supplyChainLabor', 'humanRightsDueDiligence'],
      mandatory: true,
    },
    // ESRS S3 - Affected Communities
    {
      id: 'esrs-s3',
      name: 'Affected Communities',
      description: 'Impact on communities',
      category: 'social',
      subcategory: 'community',
      metrics: ['communityImpact', 'communityEngagement'],
      mandatory: true,
    },
    // ESRS S4 - Consumers
    {
      id: 'esrs-s4',
      name: 'Consumers and End-Users',
      description: 'Impact on consumers and end-users',
      category: 'social',
      subcategory: 'consumers',
      metrics: ['productSafety', 'dataPrivacy', 'accessibleProducts'],
      mandatory: true,
    },
    // ESRS G1 - Business Conduct
    {
      id: 'esrs-g1',
      name: 'Business Conduct',
      description:
        'Business ethics, corporate culture, anti-corruption, political engagement',
      category: 'governance',
      subcategory: 'ethics',
      metrics: [
        'antiCorruption',
        'whistleblowing',
        'politicalEngagement',
        'paymentPractices',
      ],
      mandatory: true,
    },
  ],
};

// ============================================================================
// UN SDGs (Sustainable Development Goals)
// ============================================================================

export const UNSDG_FRAMEWORK: ComplianceFramework = {
  id: 'unsdg',
  name: 'UN SDGs',
  fullName: 'United Nations Sustainable Development Goals',
  version: '2030 Agenda',
  description:
    "17 interlinked global goals designed to be a 'blueprint to achieve a better and more sustainable future for all'.",
  website: 'https://sdgs.un.org/goals',
  categories: ['environmental', 'social', 'governance'],
  industrySpecific: false,
  geographicScope: 'global',
  requirements: [
    {
      id: 'sdg-7',
      name: 'SDG 7: Affordable and Clean Energy',
      description: 'Ensure access to affordable, reliable, sustainable and modern energy',
      category: 'environmental',
      subcategory: 'energy',
      metrics: ['renewableEnergy', 'energyEfficiency', 'cleanEnergyInvestment'],
      mandatory: false,
    },
    {
      id: 'sdg-8',
      name: 'SDG 8: Decent Work and Economic Growth',
      description: 'Promote sustained, inclusive and sustainable economic growth',
      category: 'social',
      subcategory: 'employment',
      metrics: ['employmentCreation', 'laborRights', 'youthEmployment'],
      mandatory: false,
    },
    {
      id: 'sdg-12',
      name: 'SDG 12: Responsible Consumption and Production',
      description: 'Ensure sustainable consumption and production patterns',
      category: 'environmental',
      subcategory: 'circularEconomy',
      metrics: ['resourceEfficiency', 'wasteReduction', 'sustainableProcurement'],
      mandatory: false,
    },
    {
      id: 'sdg-13',
      name: 'SDG 13: Climate Action',
      description: 'Take urgent action to combat climate change and its impacts',
      category: 'environmental',
      subcategory: 'climate',
      metrics: ['emissionsReduction', 'climateResilience', 'climateFinance'],
      mandatory: false,
    },
    {
      id: 'sdg-5',
      name: 'SDG 5: Gender Equality',
      description: 'Achieve gender equality and empower all women and girls',
      category: 'social',
      subcategory: 'diversity',
      metrics: ['genderParity', 'womenInLeadership', 'equalPay'],
      mandatory: false,
    },
  ],
};

// ============================================================================
// Framework Registry
// ============================================================================

export const COMPLIANCE_FRAMEWORKS: Record<string, ComplianceFramework> = {
  gri: GRI_FRAMEWORK,
  sasb: SASB_FRAMEWORK,
  tcfd: TCFD_FRAMEWORK,
  cdp: CDP_FRAMEWORK,
  csrd: CSRD_FRAMEWORK,
  unsdg: UNSDG_FRAMEWORK,
};

export function getFramework(id: string): ComplianceFramework | undefined {
  return COMPLIANCE_FRAMEWORKS[id.toLowerCase()];
}

export function getAllFrameworks(): ComplianceFramework[] {
  return Object.values(COMPLIANCE_FRAMEWORKS);
}

export function getFrameworksByCategory(
  category: ESGCategory,
): ComplianceFramework[] {
  return Object.values(COMPLIANCE_FRAMEWORKS).filter((fw) =>
    fw.categories.includes(category),
  );
}

export function getRequirementsByMetric(
  metricName: string,
): { framework: string; requirement: FrameworkRequirement }[] {
  const results: { framework: string; requirement: FrameworkRequirement }[] = [];

  for (const [frameworkId, framework] of Object.entries(COMPLIANCE_FRAMEWORKS)) {
    for (const req of framework.requirements) {
      if (req.metrics.includes(metricName)) {
        results.push({ framework: frameworkId, requirement: req });
      }
    }
  }

  return results;
}

export function assessCompliance(
  frameworkId: string,
  reportedMetrics: string[],
): {
  framework: string;
  totalRequirements: number;
  mandatoryRequirements: number;
  metRequirements: number;
  mandatoryMet: number;
  compliancePercentage: number;
  mandatoryCompliancePercentage: number;
  status: ComplianceStatus;
  gaps: FrameworkRequirement[];
} {
  const framework = getFramework(frameworkId);
  if (!framework) {
    throw new Error(`Unknown framework: ${frameworkId}`);
  }

  const mandatoryRequirements = framework.requirements.filter((r) => r.mandatory);
  const reportedMetricsSet = new Set(reportedMetrics);

  let metRequirements = 0;
  let mandatoryMet = 0;
  const gaps: FrameworkRequirement[] = [];

  for (const req of framework.requirements) {
    const hasAllMetrics = req.metrics.every((m) => reportedMetricsSet.has(m));

    if (hasAllMetrics) {
      metRequirements++;
      if (req.mandatory) {
        mandatoryMet++;
      }
    } else if (req.mandatory) {
      gaps.push(req);
    }
  }

  const compliancePercentage =
    framework.requirements.length > 0
      ? (metRequirements / framework.requirements.length) * 100
      : 0;

  const mandatoryCompliancePercentage =
    mandatoryRequirements.length > 0
      ? (mandatoryMet / mandatoryRequirements.length) * 100
      : 100;

  let status: ComplianceStatus;
  if (mandatoryCompliancePercentage === 100) {
    status = 'compliant';
  } else if (mandatoryCompliancePercentage >= 75) {
    status = 'partially_compliant';
  } else {
    status = 'non_compliant';
  }

  return {
    framework: frameworkId,
    totalRequirements: framework.requirements.length,
    mandatoryRequirements: mandatoryRequirements.length,
    metRequirements,
    mandatoryMet,
    compliancePercentage,
    mandatoryCompliancePercentage,
    status,
    gaps,
  };
}
