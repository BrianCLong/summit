/**
 * Ethical AI Model Registry
 *
 * Registers and tracks all AI models with ethical assessments,
 * bias audits, and compliance certifications.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AIModelRegistration,
  EthicalPrinciple,
  ComplianceAssessment,
  ComplianceStandard,
} from './types.js';

export interface EthicalAIRegistryConfig {
  auditService?: { log: (event: unknown) => Promise<void> };
}

// Built-in compliance standards for government AI
const GOVERNMENT_AI_STANDARDS: ComplianceStandard[] = [
  {
    standardId: 'nist-ai-rmf-1.0',
    name: 'NIST AI Risk Management Framework',
    version: '1.0',
    jurisdiction: 'United States',
    requirements: [
      { requirementId: 'govern-1', description: 'Establish AI governance structure', mandatory: true, category: 'accountability' },
      { requirementId: 'map-1', description: 'Document intended purposes and contexts', mandatory: true, category: 'documentation' },
      { requirementId: 'measure-1', description: 'Assess risks and impacts', mandatory: true, category: 'testing' },
      { requirementId: 'manage-1', description: 'Implement risk treatments', mandatory: true, category: 'security' },
    ],
  },
  {
    standardId: 'eu-ai-act-2024',
    name: 'EU AI Act',
    version: '2024',
    jurisdiction: 'European Union',
    requirements: [
      { requirementId: 'art-9', description: 'Risk management system', mandatory: true, category: 'accountability' },
      { requirementId: 'art-10', description: 'Data governance', mandatory: true, category: 'privacy' },
      { requirementId: 'art-13', description: 'Transparency and information', mandatory: true, category: 'transparency' },
      { requirementId: 'art-14', description: 'Human oversight', mandatory: true, category: 'human_oversight' },
      { requirementId: 'art-15', description: 'Accuracy, robustness, cybersecurity', mandatory: true, category: 'security' },
    ],
  },
  {
    standardId: 'eo-14110-2023',
    name: 'Executive Order 14110 on Safe AI',
    version: '2023',
    jurisdiction: 'United States',
    requirements: [
      { requirementId: 'sec-4.1', description: 'Safety and security guidelines', mandatory: true, category: 'security' },
      { requirementId: 'sec-4.2', description: 'Privacy protections', mandatory: true, category: 'privacy' },
      { requirementId: 'sec-5', description: 'Equity and civil rights', mandatory: true, category: 'fairness' },
      { requirementId: 'sec-7', description: 'Government use standards', mandatory: true, category: 'accountability' },
    ],
  },
];

const ETHICAL_PRINCIPLES: EthicalPrinciple[] = [
  'fairness',
  'accountability',
  'transparency',
  'privacy',
  'security',
  'human_oversight',
  'non_discrimination',
  'explainability',
  'proportionality',
  'lawfulness',
];

export class EthicalAIRegistry {
  private models: Map<string, AIModelRegistration> = new Map();
  private assessments: Map<string, ComplianceAssessment[]> = new Map();
  private standards: Map<string, ComplianceStandard> = new Map();
  private auditService?: { log: (event: unknown) => Promise<void> };

  constructor(config: EthicalAIRegistryConfig = {}) {
    this.auditService = config.auditService;

    // Load built-in standards
    for (const standard of GOVERNMENT_AI_STANDARDS) {
      this.standards.set(standard.standardId, standard);
    }
  }

  /**
   * Register an AI model with ethical review
   */
  async registerModel(
    registration: Omit<AIModelRegistration, 'modelId' | 'registeredAt'>,
  ): Promise<AIModelRegistration> {
    // Validate ethical review covers all principles
    const reviewedPrinciples = new Set(registration.ethicalReview.principlesAssessed);
    const missingPrinciples = ETHICAL_PRINCIPLES.filter((p) => !reviewedPrinciples.has(p));

    if (missingPrinciples.length > 0) {
      throw new Error(`Ethical review incomplete. Missing principles: ${missingPrinciples.join(', ')}`);
    }

    // Check for unacceptable risk
    if (registration.riskLevel === 'unacceptable') {
      throw new Error('Models with unacceptable risk level cannot be registered');
    }

    // High-risk models require human oversight
    if (registration.riskLevel === 'high' && !registration.humanOversightRequired) {
      throw new Error('High-risk models must have human oversight enabled');
    }

    const fullRegistration: AIModelRegistration = {
      ...registration,
      modelId: uuidv4(),
      registeredAt: new Date().toISOString(),
    };

    this.models.set(fullRegistration.modelId, fullRegistration);
    await this.audit('model_registered', fullRegistration.modelId, { model: fullRegistration });
    return fullRegistration;
  }

  /**
   * Get model registration details
   */
  async getModel(modelId: string): Promise<AIModelRegistration | null> {
    return this.models.get(modelId) ?? null;
  }

  /**
   * List all registered models
   */
  async listModels(filters?: {
    riskLevel?: string;
    deploymentEnvironment?: string;
  }): Promise<AIModelRegistration[]> {
    let models = Array.from(this.models.values());

    if (filters?.riskLevel) {
      models = models.filter((m) => m.riskLevel === filters.riskLevel);
    }

    if (filters?.deploymentEnvironment) {
      models = models.filter((m) =>
        m.deploymentEnvironments.includes(filters.deploymentEnvironment as never),
      );
    }

    return models;
  }

  /**
   * Perform compliance assessment against a standard
   */
  async assessCompliance(
    modelId: string,
    standardId: string,
    assessorId: string,
    results: Array<{
      requirementId: string;
      status: 'met' | 'partially_met' | 'not_met' | 'not_applicable';
      evidence?: string;
      remediation?: string;
    }>,
  ): Promise<ComplianceAssessment> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const standard = this.standards.get(standardId);
    if (!standard) {
      throw new Error(`Standard ${standardId} not found`);
    }

    // Calculate compliance percentage
    const applicableRequirements = results.filter((r) => r.status !== 'not_applicable');
    const metRequirements = applicableRequirements.filter((r) => r.status === 'met');
    const overallCompliance = applicableRequirements.length > 0
      ? Math.round((metRequirements.length / applicableRequirements.length) * 100)
      : 100;

    const assessment: ComplianceAssessment = {
      assessmentId: uuidv4(),
      modelId,
      standardId,
      assessedAt: new Date().toISOString(),
      assessedBy: assessorId,
      results,
      overallCompliance,
      nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days
    };

    const existing = this.assessments.get(modelId) ?? [];
    existing.push(assessment);
    this.assessments.set(modelId, existing);

    await this.audit('compliance_assessed', modelId, { assessment });
    return assessment;
  }

  /**
   * Get compliance assessments for a model
   */
  async getAssessments(modelId: string): Promise<ComplianceAssessment[]> {
    return this.assessments.get(modelId) ?? [];
  }

  /**
   * Get available compliance standards
   */
  getStandards(): ComplianceStandard[] {
    return Array.from(this.standards.values());
  }

  /**
   * Update bias assessment for a model
   */
  async updateBiasAssessment(
    modelId: string,
    biasAssessment: NonNullable<AIModelRegistration['biasAssessment']>,
  ): Promise<AIModelRegistration | null> {
    const model = this.models.get(modelId);
    if (!model) return null;

    const updated: AIModelRegistration = {
      ...model,
      biasAssessment,
      lastAuditedAt: new Date().toISOString(),
    };

    this.models.set(modelId, updated);
    await this.audit('bias_assessment_updated', modelId, { biasAssessment });
    return updated;
  }

  /**
   * Deploy model to environment (with governance checks)
   */
  async deployModel(
    modelId: string,
    environment: 'development' | 'staging' | 'production',
  ): Promise<{ success: boolean; blockers: string[] }> {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, blockers: ['Model not found'] };
    }

    const blockers: string[] = [];

    // Check ethical review status
    if (model.ethicalReview.overallStatus !== 'approved') {
      blockers.push(`Ethical review status: ${model.ethicalReview.overallStatus}`);
    }

    // Production requires compliance assessment
    if (environment === 'production') {
      const assessments = await this.getAssessments(modelId);
      const recentAssessment = assessments.find(
        (a) => new Date(a.nextReviewDate) > new Date(),
      );

      if (!recentAssessment) {
        blockers.push('No valid compliance assessment');
      } else if (recentAssessment.overallCompliance < 80) {
        blockers.push(`Compliance score ${recentAssessment.overallCompliance}% below 80% threshold`);
      }

      // Production requires bias assessment for high-risk models
      if (model.riskLevel === 'high' && !model.biasAssessment) {
        blockers.push('High-risk model requires bias assessment');
      }
    }

    if (blockers.length > 0) {
      return { success: false, blockers };
    }

    // Update deployment environments
    if (!model.deploymentEnvironments.includes(environment)) {
      model.deploymentEnvironments.push(environment);
      this.models.set(modelId, model);
    }

    await this.audit('model_deployed', modelId, { environment });
    return { success: true, blockers: [] };
  }

  private async audit(eventType: string, resourceId: string, details: Record<string, unknown>): Promise<void> {
    if (this.auditService) {
      await this.auditService.log({
        eventType,
        actorType: 'system',
        resourceType: 'ai_model',
        resourceId,
        timestamp: new Date().toISOString(),
        details,
      });
    }
  }
}
