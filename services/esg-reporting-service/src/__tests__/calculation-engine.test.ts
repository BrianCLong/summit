/**
 * ESG Calculation Engine Tests
 * Tests for the metrics calculation and scoring functionality
 */

import {
  calculateESGScore,
  calculateEnvironmentalScore,
  calculateSocialScore,
  calculateGovernanceScore,
  analyzeTrend,
  DEFAULT_WEIGHTS,
  type EnvironmentalMetrics,
  type SocialMetrics,
  type GovernanceMetrics,
} from '@intelgraph/esg-reporting';

describe('ESG Calculation Engine', () => {
  describe('calculateEnvironmentalScore', () => {
    const sampleEnvironmentalMetrics: EnvironmentalMetrics = {
      carbonEmissions: {
        scope1: 1000,
        scope2: 500,
        scope3: 2000,
        totalEmissions: 3500,
        intensityRatio: 35,
        unit: 'tonnes_co2e',
        baselineYear: 2020,
        reductionTarget: 50,
        reductionAchieved: 25,
      },
      energy: {
        totalConsumption: 10000,
        renewableEnergy: 6000,
        nonRenewableEnergy: 4000,
        renewablePercentage: 60,
        energyIntensity: 100,
        unit: 'mwh',
      },
      water: {
        totalWithdrawal: 50000,
        totalDischarge: 40000,
        totalConsumption: 10000,
        recycledWater: 15000,
        waterIntensity: 50,
        unit: 'cubic_meters',
      },
      waste: {
        totalWaste: 1000,
        hazardousWaste: 50,
        nonHazardousWaste: 950,
        recycledWaste: 600,
        diversionRate: 60,
        unit: 'tonnes',
      },
    };

    it('should calculate environmental score within valid range', () => {
      const score = calculateEnvironmentalScore(sampleEnvironmentalMetrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for better renewable percentage', () => {
      const lowRenewable: EnvironmentalMetrics = {
        ...sampleEnvironmentalMetrics,
        energy: { ...sampleEnvironmentalMetrics.energy, renewablePercentage: 20 },
      };

      const highRenewable: EnvironmentalMetrics = {
        ...sampleEnvironmentalMetrics,
        energy: { ...sampleEnvironmentalMetrics.energy, renewablePercentage: 90 },
      };

      const lowScore = calculateEnvironmentalScore(lowRenewable);
      const highScore = calculateEnvironmentalScore(highRenewable);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should give higher score for better waste diversion', () => {
      const lowDiversion: EnvironmentalMetrics = {
        ...sampleEnvironmentalMetrics,
        waste: { ...sampleEnvironmentalMetrics.waste, diversionRate: 20 },
      };

      const highDiversion: EnvironmentalMetrics = {
        ...sampleEnvironmentalMetrics,
        waste: { ...sampleEnvironmentalMetrics.waste, diversionRate: 90 },
      };

      const lowScore = calculateEnvironmentalScore(lowDiversion);
      const highScore = calculateEnvironmentalScore(highDiversion);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('calculateSocialScore', () => {
    const sampleSocialMetrics: SocialMetrics = {
      diversity: {
        totalEmployees: 1000,
        genderDiversity: {
          male: 520,
          female: 450,
          nonBinary: 20,
          notDisclosed: 10,
        },
        ageDistribution: {
          under30: 300,
          between30And50: 500,
          over50: 200,
        },
        disabilityInclusion: 5,
        veteranEmployment: 3,
      },
      laborPractices: {
        turnoverRate: 15,
        voluntaryTurnoverRate: 10,
        averageTenure: 4.5,
        trainingHoursPerEmployee: 40,
        trainingInvestment: 1000000,
        collectiveBargainingCoverage: 30,
        minimumNoticePeriod: 30,
      },
      healthAndSafety: {
        totalRecordableIncidentRate: 2.5,
        lostTimeInjuryRate: 1.0,
        fatalities: 0,
        nearMisses: 50,
        safetyTrainingHours: 20,
        healthProgramParticipation: 75,
      },
      communityImpact: {
        communityInvestment: 500000,
        volunteerHours: 10000,
        localHiringPercentage: 70,
        supplierDiversitySpend: 200000,
        charitableDonations: 100000,
        stakeholderEngagementEvents: 24,
      },
      humanRights: {
        humanRightsTrainingCoverage: 95,
        humanRightsAssessments: 10,
        grievancesFiled: 5,
        grievancesResolved: 4,
        childLaborRiskAssessment: true,
        forcedLaborRiskAssessment: true,
      },
    };

    it('should calculate social score within valid range', () => {
      const score = calculateSocialScore(sampleSocialMetrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize high turnover rate', () => {
      const lowTurnover: SocialMetrics = {
        ...sampleSocialMetrics,
        laborPractices: { ...sampleSocialMetrics.laborPractices, voluntaryTurnoverRate: 5 },
      };

      const highTurnover: SocialMetrics = {
        ...sampleSocialMetrics,
        laborPractices: { ...sampleSocialMetrics.laborPractices, voluntaryTurnoverRate: 40 },
      };

      const lowScore = calculateSocialScore(lowTurnover);
      const highScore = calculateSocialScore(highTurnover);

      expect(lowScore).toBeGreaterThan(highScore);
    });

    it('should heavily penalize fatalities', () => {
      const noFatalities: SocialMetrics = {
        ...sampleSocialMetrics,
        healthAndSafety: { ...sampleSocialMetrics.healthAndSafety, fatalities: 0 },
      };

      const withFatalities: SocialMetrics = {
        ...sampleSocialMetrics,
        healthAndSafety: { ...sampleSocialMetrics.healthAndSafety, fatalities: 2 },
      };

      const noFatalitiesScore = calculateSocialScore(noFatalities);
      const withFatalitiesScore = calculateSocialScore(withFatalities);

      expect(noFatalitiesScore).toBeGreaterThan(withFatalitiesScore);
    });
  });

  describe('calculateGovernanceScore', () => {
    const sampleGovernanceMetrics: GovernanceMetrics = {
      boardComposition: {
        totalMembers: 12,
        independentMembers: 8,
        femaleMembers: 4,
        diverseMembers: 5,
        averageTenure: 5,
        averageAge: 58,
        meetingsPerYear: 6,
        attendanceRate: 95,
      },
      executiveCompensation: {
        ceoToMedianWorkerRatio: 150,
        performanceBasedCompensation: 60,
        longTermIncentives: 40,
        clawbackPolicyInPlace: true,
        sayOnPaySupport: 85,
      },
      ethicsAndCompliance: {
        codeOfConductCoverage: 100,
        ethicsTrainingCompletion: 98,
        whistleblowerCases: 3,
        corruptionIncidents: 0,
        antiCompetitiveIncidents: 0,
        regulatoryFines: 0,
        lobbyingExpenses: 500000,
        politicalContributions: 0,
      },
      riskManagement: {
        enterpriseRiskManagementInPlace: true,
        cybersecurityIncidents: 1,
        dataBreaches: 0,
        businessContinuityTestsPerYear: 2,
        thirdPartyRiskAssessments: 50,
        climateRiskAssessment: true,
      },
      shareholderRights: {
        oneShareOneVote: true,
        proxyAccessAvailable: true,
        shareholderProposalsImplemented: 2,
        annualMeetingParticipation: 75,
      },
    };

    it('should calculate governance score within valid range', () => {
      const score = calculateGovernanceScore(sampleGovernanceMetrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should reward high board independence', () => {
      const lowIndependence: GovernanceMetrics = {
        ...sampleGovernanceMetrics,
        boardComposition: { ...sampleGovernanceMetrics.boardComposition, independentMembers: 3 },
      };

      const highIndependence: GovernanceMetrics = {
        ...sampleGovernanceMetrics,
        boardComposition: { ...sampleGovernanceMetrics.boardComposition, independentMembers: 10 },
      };

      const lowScore = calculateGovernanceScore(lowIndependence);
      const highScore = calculateGovernanceScore(highIndependence);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should penalize high CEO pay ratio', () => {
      const lowRatio: GovernanceMetrics = {
        ...sampleGovernanceMetrics,
        executiveCompensation: { ...sampleGovernanceMetrics.executiveCompensation, ceoToMedianWorkerRatio: 50 },
      };

      const highRatio: GovernanceMetrics = {
        ...sampleGovernanceMetrics,
        executiveCompensation: { ...sampleGovernanceMetrics.executiveCompensation, ceoToMedianWorkerRatio: 400 },
      };

      const lowRatioScore = calculateGovernanceScore(lowRatio);
      const highRatioScore = calculateGovernanceScore(highRatio);

      expect(lowRatioScore).toBeGreaterThan(highRatioScore);
    });
  });

  describe('calculateESGScore', () => {
    const sampleEnv: EnvironmentalMetrics = {
      carbonEmissions: {
        scope1: 1000, scope2: 500, scope3: 2000, totalEmissions: 3500,
        intensityRatio: 35, unit: 'tonnes_co2e',
      },
      energy: {
        totalConsumption: 10000, renewableEnergy: 6000, nonRenewableEnergy: 4000,
        renewablePercentage: 60, energyIntensity: 100, unit: 'mwh',
      },
      water: {
        totalWithdrawal: 50000, totalDischarge: 40000, totalConsumption: 10000,
        recycledWater: 15000, waterIntensity: 50, unit: 'cubic_meters',
      },
      waste: {
        totalWaste: 1000, hazardousWaste: 50, nonHazardousWaste: 950,
        recycledWaste: 600, diversionRate: 60, unit: 'tonnes',
      },
    };

    const sampleSoc: SocialMetrics = {
      diversity: {
        totalEmployees: 1000,
        genderDiversity: { male: 520, female: 450, nonBinary: 20, notDisclosed: 10 },
      },
      laborPractices: {
        turnoverRate: 15, voluntaryTurnoverRate: 10, averageTenure: 4.5,
        trainingHoursPerEmployee: 40, trainingInvestment: 1000000,
        collectiveBargainingCoverage: 30, minimumNoticePeriod: 30,
      },
      healthAndSafety: {
        totalRecordableIncidentRate: 2.5, lostTimeInjuryRate: 1.0, fatalities: 0,
        nearMisses: 50, safetyTrainingHours: 20, healthProgramParticipation: 75,
      },
      communityImpact: {
        communityInvestment: 500000, volunteerHours: 10000, localHiringPercentage: 70,
        supplierDiversitySpend: 200000, charitableDonations: 100000,
        stakeholderEngagementEvents: 24,
      },
      humanRights: {
        humanRightsTrainingCoverage: 95, humanRightsAssessments: 10,
        grievancesFiled: 5, grievancesResolved: 4,
        childLaborRiskAssessment: true, forcedLaborRiskAssessment: true,
      },
    };

    const sampleGov: GovernanceMetrics = {
      boardComposition: {
        totalMembers: 12, independentMembers: 8, femaleMembers: 4, diverseMembers: 5,
        averageTenure: 5, averageAge: 58, meetingsPerYear: 6, attendanceRate: 95,
      },
      executiveCompensation: {
        ceoToMedianWorkerRatio: 150, performanceBasedCompensation: 60,
        longTermIncentives: 40, clawbackPolicyInPlace: true, sayOnPaySupport: 85,
      },
      ethicsAndCompliance: {
        codeOfConductCoverage: 100, ethicsTrainingCompletion: 98,
        whistleblowerCases: 3, corruptionIncidents: 0, antiCompetitiveIncidents: 0,
        regulatoryFines: 0, lobbyingExpenses: 500000, politicalContributions: 0,
      },
      riskManagement: {
        enterpriseRiskManagementInPlace: true, cybersecurityIncidents: 1,
        dataBreaches: 0, businessContinuityTestsPerYear: 2,
        thirdPartyRiskAssessments: 50, climateRiskAssessment: true,
      },
      shareholderRights: {
        oneShareOneVote: true, proxyAccessAvailable: true,
        shareholderProposalsImplemented: 2, annualMeetingParticipation: 75,
      },
    };

    it('should calculate overall ESG score', () => {
      const score = calculateESGScore(sampleEnv, sampleSoc, sampleGov);

      expect(score).toHaveProperty('overall');
      expect(score).toHaveProperty('environmental');
      expect(score).toHaveProperty('social');
      expect(score).toHaveProperty('governance');
      expect(score).toHaveProperty('methodology');
      expect(score).toHaveProperty('calculatedAt');

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });

    it('should apply category weights correctly', () => {
      const score = calculateESGScore(sampleEnv, sampleSoc, sampleGov, DEFAULT_WEIGHTS);

      const expectedOverall =
        score.environmental * DEFAULT_WEIGHTS.categoryWeights.environmental +
        score.social * DEFAULT_WEIGHTS.categoryWeights.social +
        score.governance * DEFAULT_WEIGHTS.categoryWeights.governance;

      expect(Math.abs(score.overall - expectedOverall)).toBeLessThan(0.1);
    });
  });

  describe('analyzeTrend', () => {
    it('should identify improving trend', () => {
      const result = analyzeTrend(100, [70, 80, 90], true);
      expect(result.direction).toBe('improving');
      expect(result.percentageChange).toBeGreaterThan(0);
    });

    it('should identify declining trend', () => {
      const result = analyzeTrend(70, [100, 90, 80], true);
      expect(result.direction).toBe('declining');
      expect(result.percentageChange).toBeLessThan(0);
    });

    it('should identify stable trend', () => {
      const result = analyzeTrend(100, [99, 100, 101], true);
      expect(result.direction).toBe('stable');
    });

    it('should handle inverse metrics correctly', () => {
      // For emissions (lower is better), decreasing values = improving
      const result = analyzeTrend(70, [100, 90, 80], false);
      expect(result.direction).toBe('improving');
    });

    it('should return stable with no history', () => {
      const result = analyzeTrend(100, [], true);
      expect(result.direction).toBe('stable');
      expect(result.periods).toBe(0);
      expect(result.confidence).toBe('low');
    });

    it('should indicate confidence based on data points', () => {
      const lowConfidence = analyzeTrend(100, [90], true);
      const mediumConfidence = analyzeTrend(100, [80, 90], true);
      const highConfidence = analyzeTrend(100, [70, 80, 90, 95], true);

      expect(lowConfidence.confidence).toBe('low');
      expect(mediumConfidence.confidence).toBe('medium');
      expect(highConfidence.confidence).toBe('high');
    });
  });
});
