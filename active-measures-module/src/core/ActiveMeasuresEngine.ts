import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { activeMeasuresGraphRepo } from '../db/neo4j';

export interface ActiveMeasure {
  id: string;
  name: string;
  category: string;
  description: string;
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  effectivenessRating: number; // 0-1
  unattributabilityScore: number; // 0-1
  classification: string;
  novelFeatures: NovelFeature[];
  aiCapabilities: AICapability[];
  operationalFramework: OperationalFramework;
  resourceRequirements: ResourceRequirements;
  legalFramework: LegalFramework;
  ethicalScore: number; // 0-1
  pqcResistance: PostQuantumCryptoRating;
  metadata: Record<string, any>;
}

export interface NovelFeature {
  name: string;
  description: string;
  maturityLevel: 'EXPERIMENTAL' | 'PROTOTYPE' | 'OPERATIONAL' | 'MATURE';
  innovationIndex: number; // 0-1
}

export interface AICapability {
  type: 'DEEPFAKE' | 'NLP' | 'BEHAVIORAL_MODELING' | 'PREDICTIVE_ANALYTICS' | 'AUTONOMOUS_EXECUTION';
  description: string;
  confidence: number; // 0-1
  trainingData: string[];
  ethicalConstraints: string[];
}

export interface OperationalFramework {
  doctrine: string;
  tactics: string[];
  procedures: string[];
  successMetrics: SuccessMetric[];
}

export interface SuccessMetric {
  name: string;
  target: number;
  threshold: number;
  measurement: string;
}

export interface ResourceRequirements {
  personnel: number;
  budget: number;
  technology: string[];
  timeframe: number; // days
  specializedAssets: string[];
}

export interface LegalFramework {
  authority: string;
  limitations: string[];
  oversight: string[];
  complianceRequirements: string[];
}

export interface PostQuantumCryptoRating {
  level: 'VULNERABLE' | 'MODERATE' | 'RESISTANT' | 'IMMUNE';
  assessment: string;
  recommendations: string[];
  quantumThreatTimeline: number; // years
}

export interface Operation {
  id: string;
  name: string;
  description: string;
  status: OperationStatus;
  classification: string;
  objectives: Objective[];
  measures: AssignedMeasure[];
  targetProfile: TargetProfile;
  timeline: Timeline;
  team: Team;
  approvalChain: ApprovalRecord[];
  executionPlan?: ExecutionPlan;
  progress: OperationProgress;
  effectivenessMetrics?: EffectivenessMetrics;
  auditTrail: AuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Objective {
  id: string;
  type: 'INFLUENCE_PERCEPTION' | 'DISRUPT_OPERATIONS' | 'GATHER_INTELLIGENCE' | 'COUNTER_NARRATIVE' | 'DETER_ACTION' | 'COMPEL_BEHAVIOR';
  description: string;
  successCriteria: string[];
  metrics: SuccessMetric[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AssignedMeasure {
  measureId: string;
  parameters: Record<string, any>;
  constraints: OperationalConstraint[];
  priority: number;
  resourceAllocation: number; // 0-1
}

export interface OperationalConstraint {
  type: string;
  description: string;
  mandatory: boolean;
  impact: string;
}

export interface TargetProfile {
  entityIds: string[];
  demographicData: Record<string, any>;
  psychographicProfile: Record<string, any>;
  vulnerabilities: Vulnerability[];
  communicationChannels: string[];
  influenceNetwork: Record<string, any>;
  adaptabilityScore: number; // 0-1
}

export interface Vulnerability {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exploitability: number; // 0-1
  description: string;
  mitigations: string[];
}

export type OperationStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'READY_FOR_EXECUTION' 
  | 'EXECUTING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'ABORTED' 
  | 'FAILED';

export interface Timeline {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  phases: OperationPhase[];
}

export interface OperationPhase {
  name: string;
  start: Date;
  end: Date;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DELAYED';
  deliverables: string[];
  dependencies: string[];
}

export interface Team {
  lead: TeamMember;
  members: TeamMember[];
  approvers: Approver[];
  advisors: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  clearanceLevel: string;
  responsibilities: string[];
  contactInfo: Record<string, string>;
}

export interface Approver {
  id: string;
  name: string;
  role: string;
  level: number;
  requiredFor: string[];
}

export interface ApprovalRecord {
  id: string;
  approver: Approver;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  timestamp: Date;
  conditions: string[];
  comments: string;
  signature: string;
}

export interface ExecutionPlan {
  phases: ExecutionPhase[];
  contingencies: Contingency[];
  riskMitigation: RiskMitigation[];
  communicationPlan: CommunicationPlan;
}

export interface ExecutionPhase {
  name: string;
  objectives: string[];
  tasks: Task[];
  resources: ResourceAllocation[];
  timeline: { start: Date; end: Date };
  successCriteria: string[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignee: string;
  dependencies: string[];
  estimatedDuration: number; // hours
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
}

export interface Contingency {
  scenario: string;
  probability: number; // 0-1
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  response: string[];
  triggers: string[];
}

export interface RiskMitigation {
  risk: string;
  probability: number; // 0-1
  impact: string;
  mitigation: string[];
  owner: string;
  deadline: Date;
}

export interface CommunicationPlan {
  channels: CommunicationChannel[];
  protocols: string[];
  escalationMatrix: EscalationRule[];
  emergencyContacts: Contact[];
}

export interface CommunicationChannel {
  name: string;
  type: 'SECURE' | 'ENCRYPTED' | 'AIRGAPPED' | 'PUBLIC';
  participants: string[];
  purpose: string;
}

export interface EscalationRule {
  condition: string;
  timeThreshold: number; // hours
  escalateTo: string;
  action: string;
}

export interface Contact {
  name: string;
  role: string;
  secure: string;
  emergency: string;
}

export interface OperationProgress {
  percentage: number; // 0-100
  currentPhase: string;
  completedTasks: number;
  totalTasks: number;
  estimatedCompletion: Date;
  blockers: Blocker[];
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner: string;
  estimatedResolution: Date;
}

export interface EffectivenessMetrics {
  primaryObjectives: ObjectiveMetric[];
  secondaryEffects: SecondaryEffect[];
  unintendedConsequences: UnintendedConsequence[];
  attributionAnalysis: AttributionAnalysis;
  networkImpact: NetworkImpactAnalysis;
  temporalEffects: TemporalEffectsAnalysis;
}

export interface ObjectiveMetric {
  objectiveId: string;
  achievementRate: number; // 0-1
  confidence: number; // 0-1
  impact: string;
  timeline: string;
}

export interface SecondaryEffect {
  type: string;
  magnitude: number; // 0-1
  significance: string;
  duration: string;
}

export interface UnintendedConsequence {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigation: string[];
  responsibility: string;
}

export interface AttributionAnalysis {
  probability: number; // 0-1
  indicators: string[];
  countermeasures: string[];
  plausibleDeniability: number; // 0-1
}

export interface NetworkImpactAnalysis {
  reach: number;
  influence: number; // 0-1
  cascadeEffects: CascadeEffect[];
  feedback: FeedbackLoop[];
}

export interface CascadeEffect {
  trigger: string;
  propagation: string[];
  magnitude: number; // 0-1
  timeframe: string;
}

export interface FeedbackLoop {
  type: 'POSITIVE' | 'NEGATIVE';
  strength: number; // 0-1
  delay: number; // hours
  description: string;
}

export interface TemporalEffectsAnalysis {
  shortTerm: EffectProfile;
  mediumTerm: EffectProfile;
  longTerm: EffectProfile;
}

export interface EffectProfile {
  timeframe: string;
  expectedEffects: string[];
  confidence: number; // 0-1
  variance: number; // 0-1
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: Actor;
  action: string;
  operationId?: string;
  details: Record<string, any>;
  classification: string;
  ipAddress: string;
  userAgent: string;
  geolocation?: GeolocationData;
  cryptographicSignature: string;
}

export interface Actor {
  id: string;
  type: 'HUMAN_OPERATOR' | 'AI_SYSTEM' | 'AUTOMATED_PROCESS' | 'EXTERNAL_SYSTEM';
  name: string;
  role: string;
  clearanceLevel: string;
  organization: string;
}

export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  accuracy: number;
  source: string;
}

export interface Tuners {
  proportionality: number; // 0-1
  riskTolerance: number; // 0-1
  ethicalIndex: number; // 0-1
  unattributabilityRequirement: number; // 0-1
  resourceConstraints: ResourceConstraints;
  operationalSecurity: OperationalSecurity;
  plausibleDeniability: number; // 0-1
  collateralDamageThreshold: number; // 0-1
}

export interface ResourceConstraints {
  maxBudget: number;
  maxPersonnel: number;
  maxDuration: number; // days
  availableAssets: string[];
  geographicalConstraints: string[];
}

export interface OperationalSecurity {
  classificationLevel: string;
  compartmentalization: string[];
  needToKnowGroups: string[];
  communicationProtocols: string[];
}

export class ActiveMeasuresEngine {
  private neo4jRepo: any;
  private measuresCatalog: Map<string, ActiveMeasure> = new Map();
  private operationsRegistry: Map<string, Operation> = new Map();

  constructor(neo4jDriver: any) {
    this.neo4jRepo = activeMeasuresGraphRepo;
    this.initializeMeasuresCatalog();
    logger.info('Active Measures Engine initialized');
  }

  // Initialize the measures catalog with predefined measures
  private async initializeMeasuresCatalog(): Promise<void> {
    try {
      // Initialize schema
      await this.neo4jRepo.initializeSchema();

      // Seed with sample measures if empty
      const existingMeasures = await this.neo4jRepo.getActiveMeasuresPortfolio({});
      if (existingMeasures.length === 0) {
        await this.seedSampleMeasures();
      }

      logger.info('Active Measures catalog initialized');
    } catch (error) {
      logger.error('Failed to initialize measures catalog', { error: error.message });
      throw error;
    }
  }

  // Seed the database with sample active measures
  private async seedSampleMeasures(): Promise<void> {
    const sampleMeasures: Partial<ActiveMeasure>[] = [
      {
        id: 'info-ops-001',
        name: 'Coordinated Inauthentic Behavior',
        category: 'INFORMATION_OPERATIONS',
        description: 'Orchestrated network of authentic-appearing accounts to amplify narratives',
        riskLevel: 'MODERATE',
        effectivenessRating: 0.75,
        unattributabilityScore: 0.85,
        classification: 'SECRET',
        ethicalScore: 0.6,
        metadata: {
          platforms: ['social_media', 'forums', 'news_sites'],
          scalability: 'HIGH',
          detectability: 'MEDIUM',
        },
      },
      {
        id: 'cyber-ops-001',
        name: 'Infrastructure Disruption Campaign',
        category: 'CYBER_OPERATIONS',
        description: 'Targeted disruption of critical infrastructure systems',
        riskLevel: 'HIGH',
        effectivenessRating: 0.90,
        unattributabilityScore: 0.70,
        classification: 'TOP_SECRET',
        ethicalScore: 0.3,
        metadata: {
          targets: ['power_grid', 'communications', 'transportation'],
          persistence: 'MEDIUM',
          collateralDamage: 'MEDIUM',
        },
      },
      {
        id: 'psyops-001',
        name: 'Behavioral Influence Network',
        category: 'PSYCHOLOGICAL_OPERATIONS',
        description: 'AI-driven personalized psychological influence campaigns',
        riskLevel: 'HIGH',
        effectivenessRating: 0.85,
        unattributabilityScore: 0.90,
        classification: 'SECRET',
        ethicalScore: 0.4,
        metadata: {
          aiModels: ['gpt-4', 'behavioral_prediction', 'sentiment_analysis'],
          personalization: 'HIGH',
          scalability: 'EXTREME',
        },
      },
      {
        id: 'econ-pressure-001',
        name: 'Market Volatility Induction',
        category: 'ECONOMIC_PRESSURE',
        description: 'Strategic market manipulation to create economic instability',
        riskLevel: 'CRITICAL',
        effectivenessRating: 0.95,
        unattributabilityScore: 0.60,
        classification: 'TOP_SECRET',
        ethicalScore: 0.2,
        metadata: {
          markets: ['forex', 'commodities', 'crypto'],
          leverage: 'HIGH',
          reversibility: 'LOW',
        },
      },
      {
        id: 'cultural-ops-001',
        name: 'Cultural Narrative Reshaping',
        category: 'CULTURAL_OPERATIONS',
        description: 'Long-term cultural influence through entertainment and media',
        riskLevel: 'LOW',
        effectivenessRating: 0.60,
        unattributabilityScore: 0.95,
        classification: 'CONFIDENTIAL',
        ethicalScore: 0.7,
        metadata: {
          timeframe: 'LONG_TERM',
          channels: ['entertainment', 'education', 'social_media'],
          subtlety: 'HIGH',
        },
      },
    ];

    for (const measure of sampleMeasures) {
      try {
        await this.neo4jRepo.createActiveMeasure(measure);
        logger.info('Seeded sample measure', { measureId: measure.id, name: measure.name });
      } catch (error) {
        logger.warn('Failed to seed measure', { measureId: measure.id, error: error.message });
      }
    }

    metricsCollector.setGauge('seeded_measures', sampleMeasures.length);
    logger.info('Sample measures seeded successfully');
  }

  // Get portfolio of active measures with filtering and tuning
  async getActiveMeasuresPortfolio(
    filters: any = {},
    tuners: Partial<Tuners> = {}
  ): Promise<any> {
    try {
      const startTime = Date.now();
      
      // Apply ethical constraints
      const ethicallyFilteredMeasures = await this.applyEthicalFiltering(filters, tuners);
      
      // Get measures from Neo4j
      const measures = await this.neo4jRepo.getActiveMeasuresPortfolio(ethicallyFilteredMeasures);
      
      // Apply tuning algorithms
      const tunedMeasures = this.applyTuningAlgorithms(measures, tuners);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(tunedMeasures, tuners);
      
      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(tunedMeasures);
      
      // Check compliance status
      const complianceStatus = await this.checkComplianceStatus(tunedMeasures);
      
      const portfolio = {
        id: uuidv4(),
        totalCount: tunedMeasures.length,
        measures: tunedMeasures,
        categories: this.categorizeMeasures(tunedMeasures),
        recommendations,
        riskAssessment,
        complianceStatus,
      };
      
      const duration = Date.now() - startTime;
      metricsCollector.recordHistogram('portfolio_generation_time', duration);
      metricsCollector.incrementCounter('portfolio_requests');
      
      logger.info('Generated active measures portfolio', {
        measureCount: tunedMeasures.length,
        duration,
        filters,
        tuners,
      });
      
      return portfolio;
    } catch (error) {
      metricsCollector.incrementCounter('portfolio_errors');
      logger.error('Failed to generate portfolio', { error: error.message, filters, tuners });
      throw error;
    }
  }

  // Apply ethical filtering based on constraints
  private async applyEthicalFiltering(
    filters: any,
    tuners: Partial<Tuners>
  ): Promise<any> {
    const ethicalIndex = tuners.ethicalIndex || 0.8;
    
    // Filter out measures that don't meet ethical requirements
    const ethicalFilters = {
      ...filters,
      ethicalScoreThreshold: ethicalIndex,
    };
    
    // Apply additional ethical constraints
    if (ethicalIndex > 0.9) {
      // Strict ethical mode - exclude high-risk operations
      ethicalFilters.excludeCategories = [
        ...(ethicalFilters.excludeCategories || []),
        'ECONOMIC_PRESSURE',
      ];
      ethicalFilters.maxRiskLevel = 'MODERATE';
    }
    
    logger.debug('Applied ethical filtering', { ethicalIndex, ethicalFilters });
    return ethicalFilters;
  }

  // Apply tuning algorithms to optimize measure selection
  private applyTuningAlgorithms(measures: any[], tuners: Partial<Tuners>): any[] {
    const {
      proportionality = 0.5,
      riskTolerance = 0.3,
      unattributabilityRequirement = 0.7,
      plausibleDeniability = 0.9,
    } = tuners;
    
    return measures
      .map(measure => {
        // Calculate composite score based on tuners
        const effectivenessWeight = proportionality;
        const riskWeight = 1 - riskTolerance;
        const unattributabilityWeight = unattributabilityRequirement;
        const deniabilityWeight = plausibleDeniability;
        
        const riskPenalty = this.calculateRiskPenalty(measure.riskLevel);
        
        const compositeScore = (
          (measure.effectivenessRating * effectivenessWeight) +
          (measure.unattributabilityScore * unattributabilityWeight) +
          ((1 - riskPenalty) * riskWeight) +
          (measure.plausibleDeniabilityScore || 0.5) * deniabilityWeight
        ) / 4;
        
        return {
          ...measure,
          compositeScore,
          tuningMetadata: {
            effectivenessContribution: measure.effectivenessRating * effectivenessWeight,
            riskContribution: (1 - riskPenalty) * riskWeight,
            unattributabilityContribution: measure.unattributabilityScore * unattributabilityWeight,
            deniabilityContribution: (measure.plausibleDeniabilityScore || 0.5) * deniabilityWeight,
          },
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 50); // Limit to top 50 measures
  }

  // Calculate risk penalty based on risk level
  private calculateRiskPenalty(riskLevel: string): number {
    const riskPenalties = {
      MINIMAL: 0.0,
      LOW: 0.1,
      MODERATE: 0.3,
      HIGH: 0.6,
      CRITICAL: 0.9,
    };
    return riskPenalties[riskLevel] || 0.5;
  }

  // Generate recommendations based on portfolio analysis
  private generateRecommendations(measures: any[], tuners: Partial<Tuners>): any[] {
    const recommendations = [];
    
    // Analyze portfolio composition
    const categoryDistribution = this.analyzeCategoryDistribution(measures);
    const riskProfile = this.analyzeRiskProfile(measures);
    const effectivenessProfile = this.analyzeEffectivenessProfile(measures);
    
    // Generate diversification recommendations
    if (categoryDistribution.dominantCategory.percentage > 0.7) {
      recommendations.push({
        id: uuidv4(),
        type: 'DIVERSIFICATION',
        title: 'Portfolio Diversification Needed',
        description: `Portfolio is heavily concentrated in ${categoryDistribution.dominantCategory.name} (${categoryDistribution.dominantCategory.percentage * 100}%). Consider adding measures from other categories.`,
        priority: 'HIGH',
        rationale: 'Diversified portfolios are more resilient to countermeasures and detection.',
      });
    }
    
    // Generate risk balance recommendations
    if (riskProfile.averageRisk > 0.7 && tuners.riskTolerance < 0.5) {
      recommendations.push({
        id: uuidv4(),
        type: 'RISK_MITIGATION',
        title: 'High Risk Profile Detected',
        description: 'Current portfolio exceeds risk tolerance. Consider adding lower-risk measures or implementing additional safeguards.',
        priority: 'CRITICAL',
        rationale: 'High-risk operations require careful risk management and may face approval challenges.',
      });
    }
    
    // Generate effectiveness optimization recommendations
    if (effectivenessProfile.lowEffectivenessMeasures > 0.3) {
      recommendations.push({
        id: uuidv4(),
        type: 'EFFECTIVENESS_OPTIMIZATION',
        title: 'Effectiveness Optimization Opportunity',
        description: 'Multiple low-effectiveness measures detected. Consider combining or replacing with higher-impact alternatives.',
        priority: 'MEDIUM',
        rationale: 'Resource optimization and improved outcomes through strategic measure selection.',
      });
    }
    
    return recommendations;
  }

  // Analyze category distribution in portfolio
  private analyzeCategoryDistribution(measures: any[]): any {
    const categoryCounts = {};
    measures.forEach(measure => {
      categoryCounts[measure.category] = (categoryCounts[measure.category] || 0) + 1;
    });
    
    const totalMeasures = measures.length;
    const categoryPercentages = Object.entries(categoryCounts).map(([category, count]) => ({
      name: category,
      count: count as number,
      percentage: (count as number) / totalMeasures,
    }));
    
    const dominantCategory = categoryPercentages.reduce((max, current) => 
      current.percentage > max.percentage ? current : max
    );
    
    return {
      categories: categoryPercentages,
      dominantCategory,
      diversityIndex: this.calculateDiversityIndex(categoryPercentages),
    };
  }

  // Calculate portfolio diversity index
  private calculateDiversityIndex(categoryPercentages: any[]): number {
    // Shannon diversity index
    return -categoryPercentages.reduce((sum, cat) => {
      if (cat.percentage > 0) {
        return sum + cat.percentage * Math.log(cat.percentage);
      }
      return sum;
    }, 0);
  }

  // Analyze risk profile of portfolio
  private analyzeRiskProfile(measures: any[]): any {
    const riskValues = measures.map(measure => this.calculateRiskPenalty(measure.riskLevel));
    const averageRisk = riskValues.reduce((sum, risk) => sum + risk, 0) / riskValues.length;
    const riskVariance = this.calculateVariance(riskValues);
    
    return {
      averageRisk,
      riskVariance,
      highRiskMeasures: measures.filter(m => ['HIGH', 'CRITICAL'].includes(m.riskLevel)).length,
      riskDistribution: this.calculateRiskDistribution(measures),
    };
  }

  // Analyze effectiveness profile
  private analyzeEffectivenessProfile(measures: any[]): any {
    const effectivenessScores = measures.map(m => m.effectivenessRating);
    const averageEffectiveness = effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length;
    const lowEffectivenessMeasures = measures.filter(m => m.effectivenessRating < 0.6).length / measures.length;
    
    return {
      averageEffectiveness,
      lowEffectivenessMeasures,
      topPerformers: measures.filter(m => m.effectivenessRating > 0.8).length,
    };
  }

  // Calculate variance for risk analysis
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Calculate risk distribution
  private calculateRiskDistribution(measures: any[]): any {
    const distribution = {
      MINIMAL: 0,
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    
    measures.forEach(measure => {
      distribution[measure.riskLevel]++;
    });
    
    const total = measures.length;
    return Object.entries(distribution).reduce((acc, [level, count]) => {
      acc[level] = count / total;
      return acc;
    }, {});
  }

  // Calculate overall risk assessment
  private calculateRiskAssessment(measures: any[]): any {
    const riskProfile = this.analyzeRiskProfile(measures);
    
    let overallRisk: string;
    if (riskProfile.averageRisk < 0.3) overallRisk = 'LOW';
    else if (riskProfile.averageRisk < 0.6) overallRisk = 'MODERATE';
    else if (riskProfile.averageRisk < 0.8) overallRisk = 'HIGH';
    else overallRisk = 'CRITICAL';
    
    const categories = [
      {
        name: 'Operational Risk',
        level: overallRisk,
        probability: riskProfile.averageRisk,
        impact: 'Operations could be compromised or detected',
        factors: ['Attribution risk', 'Detection probability', 'Countermeasure effectiveness'],
      },
      {
        name: 'Legal Risk',
        level: measures.some(m => m.classification === 'TOP_SECRET') ? 'HIGH' : 'MODERATE',
        probability: 0.3,
        impact: 'Legal consequences for unauthorized activities',
        factors: ['Jurisdictional issues', 'International law violations', 'Domestic legal constraints'],
      },
      {
        name: 'Ethical Risk',
        level: this.calculateEthicalRiskLevel(measures),
        probability: 0.4,
        impact: 'Reputation damage and ethical violations',
        factors: ['Civilian impact', 'Human rights concerns', 'Proportionality issues'],
      },
    ];
    
    return {
      overallRisk,
      categories,
      mitigationStrategies: this.generateRiskMitigationStrategies(riskProfile),
      lastUpdated: new Date().toISOString(),
    };
  }

  // Calculate ethical risk level
  private calculateEthicalRiskLevel(measures: any[]): string {
    const averageEthicalScore = measures.reduce((sum, m) => sum + (m.ethicalScore || 0.5), 0) / measures.length;
    
    if (averageEthicalScore > 0.8) return 'LOW';
    if (averageEthicalScore > 0.6) return 'MODERATE';
    if (averageEthicalScore > 0.4) return 'HIGH';
    return 'CRITICAL';
  }

  // Generate risk mitigation strategies
  private generateRiskMitigationStrategies(riskProfile: any): string[] {
    const strategies = [];
    
    if (riskProfile.averageRisk > 0.6) {
      strategies.push('Implement additional operational security measures');
      strategies.push('Establish robust plausible deniability protocols');
      strategies.push('Develop comprehensive cover stories and legends');
    }
    
    if (riskProfile.highRiskMeasures > 2) {
      strategies.push('Consider phased implementation to reduce simultaneous exposure');
      strategies.push('Establish emergency abort and cleanup procedures');
    }
    
    strategies.push('Regular threat assessment and countermeasure analysis');
    strategies.push('Continuous monitoring of detection indicators');
    strategies.push('Maintain operational compartmentalization');
    
    return strategies;
  }

  // Check compliance status
  private async checkComplianceStatus(measures: any[]): Promise<any> {
    const frameworks = [
      {
        name: 'DoD Directive 3600.01',
        status: 'COMPLIANT',
        lastReview: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        issues: [],
      },
      {
        name: 'Executive Order 12333',
        status: 'REVIEW_REQUIRED',
        lastReview: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        issues: ['Attribution requirements need clarification'],
      },
      {
        name: 'Geneva Conventions',
        status: measures.some(m => m.category === 'ECONOMIC_PRESSURE') ? 'POTENTIAL_VIOLATION' : 'COMPLIANT',
        lastReview: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        issues: measures.some(m => m.category === 'ECONOMIC_PRESSURE') ? ['Economic warfare provisions'] : [],
      },
    ];
    
    const overallStatus = frameworks.some(f => f.status === 'POTENTIAL_VIOLATION') 
      ? 'NON_COMPLIANT'
      : frameworks.some(f => f.status === 'REVIEW_REQUIRED')
      ? 'REVIEW_REQUIRED'
      : 'COMPLIANT';
    
    return {
      overallStatus,
      frameworks,
    };
  }

  // Categorize measures for portfolio display
  private categorizeMeasures(measures: any[]): any[] {
    const categories = {};
    
    measures.forEach(measure => {
      if (!categories[measure.category]) {
        categories[measure.category] = {
          name: measure.category,
          count: 0,
          totalEffectiveness: 0,
        };
      }
      
      categories[measure.category].count++;
      categories[measure.category].totalEffectiveness += measure.effectivenessRating;
    });
    
    return Object.values(categories).map((category: any) => ({
      ...category,
      averageEffectiveness: category.totalEffectiveness / category.count,
    }));
  }

  // Create a new operation
  async createOperation(operationData: any): Promise<string> {
    try {
      const operationId = uuidv4();
      const operation = {
        id: operationId,
        ...operationData,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const createdId = await this.neo4jRepo.createOperation(operation);
      
      // Link measures to operation if provided
      if (operationData.measures && operationData.measures.length > 0) {
        const measureIds = operationData.measures.map(m => m.categoryId || m.id);
        await this.neo4jRepo.linkOperationToMeasures(createdId, measureIds);
      }
      
      // Create audit entry
      await this.createAuditEntry({
        actor: operationData.createdBy || 'system',
        action: 'CREATE_OPERATION',
        operationId: createdId,
        details: { operationName: operation.name, classification: operation.classification },
      });
      
      metricsCollector.incrementCounter('operations_created');
      logger.info('Operation created successfully', { operationId: createdId, name: operation.name });
      
      return createdId;
    } catch (error) {
      metricsCollector.incrementCounter('operation_creation_errors');
      logger.error('Failed to create operation', { error: error.message, operationData });
      throw error;
    }
  }

  // Get operation details
  async getOperation(operationId: string): Promise<Operation | null> {
    try {
      const operation = await this.neo4jRepo.getOperation(operationId);
      
      if (operation) {
        metricsCollector.incrementCounter('operation_retrievals');
        logger.debug('Operation retrieved', { operationId });
      }
      
      return operation;
    } catch (error) {
      logger.error('Failed to retrieve operation', { error: error.message, operationId });
      throw error;
    }
  }

  // Create audit entry
  async createAuditEntry(entryData: any): Promise<string> {
    try {
      const auditEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...entryData,
        cryptographicSignature: this.generateCryptographicSignature(entryData),
      };
      
      const entryId = await this.neo4jRepo.createAuditEntry(auditEntry);
      
      metricsCollector.incrementCounter('audit_entries_total');
      logger.debug('Audit entry created', { entryId, action: entryData.action });
      
      return entryId;
    } catch (error) {
      logger.error('Failed to create audit entry', { error: error.message, entryData });
      throw error;
    }
  }

  // Generate cryptographic signature for audit entries
  private generateCryptographicSignature(data: any): string {
    // In production, use proper cryptographic signing
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  // Combine multiple measures into an operation plan
  async combineMeasures(
    measureIds: string[],
    tuners: Partial<Tuners>,
    context: any
  ): Promise<any> {
    try {
      const startTime = Date.now();
      
      // Retrieve measure details
      const measures = await Promise.all(
        measureIds.map(id => this.getMeasureById(id))
      );
      
      // Analyze compatibility
      const compatibilityMatrix = this.analyzeCompatibility(measures);
      
      // Generate operation plan
      const operationPlan = this.generateOperationPlan(measures, tuners, context);
      
      // Calculate predicted effects
      const predictedEffects = this.calculatePredictedEffects(measures, context);
      
      // Assess risks
      const riskAssessment = this.assessCombinedRisks(measures);
      
      // Generate recommendations
      const recommendations = this.generateCombinationRecommendations(measures, compatibilityMatrix);
      
      const result = {
        success: true,
        operationPlan: {
          ...operationPlan,
          predictedEffects,
          riskAssessment,
        },
        compatibilityMatrix,
        recommendations,
        errors: [],
      };
      
      const duration = Date.now() - startTime;
      metricsCollector.recordHistogram('measure_combination_time', duration);
      metricsCollector.incrementCounter('measures_combined');
      
      logger.info('Measures combined successfully', {
        measureCount: measureIds.length,
        duration,
        context,
      });
      
      return result;
    } catch (error) {
      metricsCollector.incrementCounter('measure_combination_errors');
      logger.error('Failed to combine measures', { error: error.message, measureIds, context });
      throw error;
    }
  }

  // Get measure by ID (placeholder - would query Neo4j)
  private async getMeasureById(id: string): Promise<any> {
    // Mock implementation - in production, query Neo4j
    return {
      id,
      name: `Measure ${id}`,
      category: 'INFORMATION_OPERATIONS',
      effectivenessRating: 0.7,
      riskLevel: 'MODERATE',
      compatibilityFactors: ['social_media', 'narrative_control'],
    };
  }

  // Analyze compatibility between measures
  private analyzeCompatibility(measures: any[]): any[] {
    const matrix = [];
    
    for (let i = 0; i < measures.length; i++) {
      for (let j = i + 1; j < measures.length; j++) {
        const measure1 = measures[i];
        const measure2 = measures[j];
        
        const compatibilityScore = this.calculateCompatibilityScore(measure1, measure2);
        const synergies = this.identifySynergies(measure1, measure2);
        const conflicts = this.identifyConflicts(measure1, measure2);
        
        matrix.push({
          measure1Id: measure1.id,
          measure2Id: measure2.id,
          compatibilityScore,
          synergies,
          conflicts,
        });
      }
    }
    
    return matrix;
  }

  // Calculate compatibility score between two measures
  private calculateCompatibilityScore(measure1: any, measure2: any): number {
    let score = 0.5; // Base compatibility
    
    // Category compatibility
    if (measure1.category === measure2.category) {
      score += 0.2;
    } else if (this.areRelatedCategories(measure1.category, measure2.category)) {
      score += 0.1;
    }
    
    // Risk level compatibility
    const riskDifference = Math.abs(
      this.calculateRiskPenalty(measure1.riskLevel) - 
      this.calculateRiskPenalty(measure2.riskLevel)
    );
    score += (1 - riskDifference) * 0.2;
    
    // Resource compatibility
    score += this.calculateResourceCompatibility(measure1, measure2) * 0.1;
    
    return Math.min(1, Math.max(0, score));
  }

  // Check if categories are related
  private areRelatedCategories(cat1: string, cat2: string): boolean {
    const relatedCategories = {
      'INFORMATION_OPERATIONS': ['PSYCHOLOGICAL_OPERATIONS', 'CULTURAL_OPERATIONS'],
      'CYBER_OPERATIONS': ['TECHNOLOGICAL_DISRUPTION'],
      'ECONOMIC_PRESSURE': ['DIPLOMATIC_INFLUENCE'],
    };
    
    return relatedCategories[cat1]?.includes(cat2) || relatedCategories[cat2]?.includes(cat1);
  }

  // Calculate resource compatibility
  private calculateResourceCompatibility(measure1: any, measure2: any): number {
    // Simplified resource compatibility calculation
    return 0.7; // Placeholder
  }

  // Identify synergies between measures
  private identifySynergies(measure1: any, measure2: any): string[] {
    const synergies = [];
    
    if (measure1.category === 'INFORMATION_OPERATIONS' && measure2.category === 'PSYCHOLOGICAL_OPERATIONS') {
      synergies.push('Coordinated narrative and psychological influence');
    }
    
    if (measure1.category === 'CYBER_OPERATIONS' && measure2.category === 'INFORMATION_OPERATIONS') {
      synergies.push('Technical and narrative disruption combination');
    }
    
    return synergies;
  }

  // Identify conflicts between measures
  private identifyConflicts(measure1: any, measure2: any): string[] {
    const conflicts = [];
    
    if (measure1.riskLevel === 'CRITICAL' && measure2.riskLevel === 'CRITICAL') {
      conflicts.push('Excessive risk accumulation');
    }
    
    if (measure1.category === 'ECONOMIC_PRESSURE' && measure2.category === 'DIPLOMATIC_INFLUENCE') {
      conflicts.push('Contradictory diplomatic and economic signals');
    }
    
    return conflicts;
  }

  // Generate operation plan from combined measures
  private generateOperationPlan(measures: any[], tuners: Partial<Tuners>, context: any): any {
    return {
      id: uuidv4(),
      name: `Combined Operation - ${measures.length} Measures`,
      graph: this.generateCytoscapeGraph(measures),
      resourceRequirements: this.calculateCombinedResourceRequirements(measures),
      ethicalAssessment: this.calculateCombinedEthicalAssessment(measures, tuners),
      timeline: this.generateCombinedTimeline(measures, context),
      auditTrail: [{
        timestamp: new Date().toISOString(),
        actor: 'system',
        action: 'GENERATE_OPERATION_PLAN',
        details: { measureCount: measures.length, context },
      }],
    };
  }

  // Generate Cytoscape-compatible graph representation
  private generateCytoscapeGraph(measures: any[]): any {
    const nodes = measures.map(measure => ({
      data: {
        id: measure.id,
        label: measure.name,
        category: measure.category,
        effectiveness: measure.effectivenessRating,
        risk: measure.riskLevel,
      },
    }));
    
    const edges = [];
    for (let i = 0; i < measures.length; i++) {
      for (let j = i + 1; j < measures.length; j++) {
        const compatibility = this.calculateCompatibilityScore(measures[i], measures[j]);
        if (compatibility > 0.6) {
          edges.push({
            data: {
              id: `${measures[i].id}-${measures[j].id}`,
              source: measures[i].id,
              target: measures[j].id,
              strength: compatibility,
            },
          });
        }
      }
    }
    
    return { nodes, edges };
  }

  // Calculate predicted effects of combined measures
  private calculatePredictedEffects(measures: any[], context: any): any[] {
    return [
      {
        metric: 'Target Influence',
        impact: measures.reduce((sum, m) => sum + m.effectivenessRating, 0) / measures.length,
        confidence: 0.7,
        feedbackLoop: 'Positive reinforcement through multiple vectors',
      },
      {
        metric: 'Attribution Risk',
        impact: 1 - (measures.reduce((sum, m) => sum + m.unattributabilityScore, 0) / measures.length),
        confidence: 0.8,
        feedbackLoop: 'Increased risk with measure proliferation',
      },
      {
        metric: 'Resource Efficiency',
        impact: this.calculateResourceEfficiency(measures),
        confidence: 0.6,
        feedbackLoop: 'Economies of scale in coordinated operations',
      },
    ];
  }

  // Calculate resource efficiency
  private calculateResourceEfficiency(measures: any[]): number {
    // Simplified efficiency calculation
    const totalEffectiveness = measures.reduce((sum, m) => sum + m.effectivenessRating, 0);
    const averageResourceRequirement = 0.6; // Placeholder
    return totalEffectiveness / (measures.length * averageResourceRequirement);
  }

  // Assess combined risks
  private assessCombinedRisks(measures: any[]): any {
    const individualRisks = measures.map(m => this.calculateRiskPenalty(m.riskLevel));
    const combinedRisk = Math.min(1, individualRisks.reduce((sum, risk) => sum + risk, 0) / measures.length * 1.2);
    
    return {
      overallRisk: combinedRisk > 0.8 ? 'CRITICAL' : combinedRisk > 0.6 ? 'HIGH' : combinedRisk > 0.4 ? 'MODERATE' : 'LOW',
      mitigationStrategies: [
        'Implement staggered execution timeline',
        'Establish multiple fallback options',
        'Enhance operational compartmentalization',
      ],
    };
  }

  // Generate combination recommendations
  private generateCombinationRecommendations(measures: any[], compatibilityMatrix: any[]): any[] {
    const recommendations = [];
    
    const lowCompatibilityPairs = compatibilityMatrix.filter(pair => pair.compatibilityScore < 0.4);
    if (lowCompatibilityPairs.length > 0) {
      recommendations.push({
        type: 'COMPATIBILITY_WARNING',
        description: `${lowCompatibilityPairs.length} measure pairs have low compatibility scores`,
        priority: 'HIGH',
        rationale: 'Low compatibility may reduce overall effectiveness or increase risk',
      });
    }
    
    const highSynergyPairs = compatibilityMatrix.filter(pair => pair.synergies.length > 0);
    if (highSynergyPairs.length > 0) {
      recommendations.push({
        type: 'SYNERGY_OPPORTUNITY',
        description: `${highSynergyPairs.length} synergistic measure combinations identified`,
        priority: 'MEDIUM',
        rationale: 'Leverage synergies for enhanced effectiveness',
      });
    }
    
    return recommendations;
  }

  // Calculate combined resource requirements
  private calculateCombinedResourceRequirements(measures: any[]): any {
    return {
      personnel: measures.length * 5, // Simplified calculation
      budget: measures.length * 100000, // Simplified calculation
      technology: ['secure_communications', 'data_analytics', 'operational_security'],
      timeframe: Math.max(...measures.map(() => 30)), // Simplified calculation
    };
  }

  // Calculate combined ethical assessment
  private calculateCombinedEthicalAssessment(measures: any[], tuners: Partial<Tuners>): any {
    const averageEthicalScore = measures.reduce((sum, m) => sum + (m.ethicalScore || 0.5), 0) / measures.length;
    
    return {
      score: averageEthicalScore,
      concerns: averageEthicalScore < 0.6 ? ['Potential ethical violations', 'Civilian impact risk'] : [],
      recommendations: [
        'Regular ethical review checkpoints',
        'Civilian protection protocols',
        'Proportionality assessments',
      ],
    };
  }

  // Generate combined timeline
  private generateCombinedTimeline(measures: any[], context: any): any {
    const phases = [
      { name: 'Preparation', duration: 7, activities: ['Intelligence gathering', 'Asset positioning'] },
      { name: 'Initial Execution', duration: 14, activities: ['Phase 1 operations', 'Monitoring'] },
      { name: 'Full Deployment', duration: 30, activities: ['Coordinated execution', 'Real-time adjustment'] },
      { name: 'Assessment', duration: 7, activities: ['Effect evaluation', 'Cleanup operations'] },
    ];
    
    return {
      totalDuration: phases.reduce((sum, phase) => sum + phase.duration, 0),
      phases,
      criticalPath: ['Preparation', 'Initial Execution'],
      contingencyBuffer: 14, // days
    };
  }
}

export default ActiveMeasuresEngine;