/**
 * Decision Support Systems
 *
 * Advanced decision support with predictive analytics, course of action analysis,
 * risk assessment, impact analysis, and executive briefing generation.
 */

import { z } from 'zod';

// ============================================================================
// Course of Action (COA) Analysis
// ============================================================================

export const CourseOfActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  operationId: z.string(),

  // Objectives
  objectives: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    measurable: z.boolean(),
    metrics: z.array(z.string())
  })),

  // Resources required
  resources: z.object({
    personnel: z.number(),
    equipment: z.array(z.string()),
    budget: z.number(),
    time: z.number(), // days
    specialCapabilities: z.array(z.string())
  }),

  // Timeline
  timeline: z.object({
    planning: z.number(), // days
    preparation: z.number(),
    execution: z.number(),
    assessment: z.number(),
    total: z.number()
  }),

  // Risks
  risks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    probability: z.number(), // 0-100
    impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    mitigation: z.string()
  })),

  // Advantages
  advantages: z.array(z.object({
    description: z.string(),
    significance: z.enum(['MAJOR', 'MODERATE', 'MINOR'])
  })),

  // Disadvantages
  disadvantages: z.array(z.object({
    description: z.string(),
    significance: z.enum(['MAJOR', 'MODERATE', 'MINOR'])
  })),

  // Feasibility assessment
  feasibility: z.object({
    technical: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    operational: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    political: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    legal: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    overall: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  }),

  // Success probability
  successProbability: z.number(), // 0-100

  // Score
  overallScore: z.number(), // 0-100

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const COAComparisonSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  coas: z.array(z.string()), // COA IDs

  // Comparison criteria
  criteria: z.array(z.object({
    name: z.string(),
    weight: z.number(), // 0-1
    scores: z.record(z.number()) // COA ID -> score
  })),

  // Rankings
  ranking: z.array(z.object({
    coaId: z.string(),
    rank: z.number(),
    totalScore: z.number(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string())
  })),

  recommendation: z.object({
    recommendedCOA: z.string(),
    rationale: z.string(),
    conditions: z.array(z.string()),
    alternatives: z.array(z.string())
  }),

  comparedBy: z.string(),
  comparedAt: z.string(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Risk Assessment
// ============================================================================

export const RiskAssessmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  operationId: z.string().optional(),
  coaId: z.string().optional(),

  // Risk categories
  risks: z.array(z.object({
    id: z.string(),
    category: z.enum([
      'OPERATIONAL',
      'SECURITY',
      'TECHNICAL',
      'POLITICAL',
      'LEGAL',
      'ENVIRONMENTAL',
      'REPUTATIONAL',
      'FINANCIAL'
    ]),
    description: z.string(),
    likelihood: z.enum(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
    impact: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

    // Mitigation
    mitigation: z.object({
      strategies: z.array(z.string()),
      residualRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      cost: z.number().optional(),
      timeline: z.string().optional()
    }),

    // Monitoring
    indicators: z.array(z.string()),
    triggers: z.array(z.string()),
    owner: z.string()
  })),

  // Overall assessment
  overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

  // Risk matrix
  matrix: z.object({
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    critical: z.number()
  }),

  recommendations: z.array(z.string()),

  assessedBy: z.string(),
  assessedAt: z.string(),
  validUntil: z.string().optional(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Impact Analysis
// ============================================================================

export const ImpactAnalysisSchema = z.object({
  id: z.string(),
  name: z.string(),
  scenario: z.string(),

  // Impacts
  impacts: z.object({
    operational: z.object({
      description: z.string(),
      magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
      affectedAssets: z.array(z.string()),
      duration: z.string(),
      mitigationOptions: z.array(z.string())
    }),

    strategic: z.object({
      description: z.string(),
      magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
      objectives: z.array(z.string()),
      longTermEffects: z.array(z.string())
    }),

    political: z.object({
      description: z.string(),
      magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
      stakeholders: z.array(z.string()),
      publicPerception: z.enum(['VERY_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'VERY_POSITIVE'])
    }),

    economic: z.object({
      description: z.string(),
      magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
      estimatedCost: z.number(),
      economicSectors: z.array(z.string())
    }),

    humanitarian: z.object({
      description: z.string(),
      magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
      affectedPopulation: z.number(),
      casualties: z.object({
        estimated: z.number(),
        civilian: z.number(),
        military: z.number()
      }).optional()
    }),

    environmental: z.object({
      description: z.string(),
      magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
      affectedArea: z.number(), // sq km
      duration: z.string(),
      reversibility: z.enum(['REVERSIBLE', 'PARTIALLY_REVERSIBLE', 'IRREVERSIBLE'])
    })
  }),

  // Overall impact
  overallImpact: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),

  // Cascading effects
  cascadingEffects: z.array(z.object({
    effect: z.string(),
    probability: z.number(), // 0-100
    timeframe: z.string(),
    magnitude: z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE'])
  })),

  recommendations: z.array(z.string()),

  analyzedBy: z.string(),
  analyzedAt: z.string(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Predictive Analytics
// ============================================================================

export const PredictionModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum([
    'THREAT_FORECAST',
    'BEHAVIOR_PREDICTION',
    'TREND_ANALYSIS',
    'OUTCOME_PROBABILITY',
    'RESOURCE_DEMAND',
    'TIMELINE_ESTIMATION'
  ]),

  // Model parameters
  parameters: z.object({
    algorithm: z.string(),
    features: z.array(z.string()),
    trainingData: z.object({
      size: z.number(),
      period: z.string(),
      sources: z.array(z.string())
    }),
    confidence: z.number(), // 0-100
    accuracy: z.number().optional() // 0-100
  }),

  // Input requirements
  inputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string()
  })),

  // Output format
  outputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string()
  })),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const PredictionSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  timestamp: z.string(),

  // Prediction
  prediction: z.object({
    outcome: z.string(),
    probability: z.number(), // 0-100
    confidence: z.number(), // 0-100
    timeframe: z.string(),

    // Supporting data
    factors: z.array(z.object({
      factor: z.string(),
      weight: z.number(),
      value: z.unknown()
    })),

    // Uncertainty
    uncertaintyRange: z.object({
      lower: z.number(),
      upper: z.number()
    }).optional(),

    // Alternative outcomes
    alternatives: z.array(z.object({
      outcome: z.string(),
      probability: z.number()
    }))
  }),

  // Recommendations
  recommendations: z.array(z.object({
    action: z.string(),
    rationale: z.string(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    timeframe: z.string()
  })),

  validUntil: z.string(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Executive Briefing
// ============================================================================

export const ExecutiveBriefingSchema = z.object({
  id: z.string(),
  title: z.string(),
  classification: z.string(),
  audience: z.array(z.string()),

  // Summary
  executiveSummary: z.string(),

  // Situation
  situation: z.object({
    overview: z.string(),
    keyPoints: z.array(z.string()),
    timeline: z.array(z.object({
      timestamp: z.string(),
      event: z.string()
    })),
    context: z.string()
  }),

  // Assessment
  assessment: z.object({
    currentState: z.string(),
    trends: z.array(z.object({
      trend: z.string(),
      direction: z.enum(['IMPROVING', 'STABLE', 'DETERIORATING']),
      significance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    })),
    threats: z.array(z.string()),
    opportunities: z.array(z.string())
  }),

  // Options
  options: z.array(z.object({
    option: z.string(),
    description: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    risk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    resources: z.string(),
    timeline: z.string()
  })),

  // Recommendation
  recommendation: z.object({
    recommendedOption: z.string(),
    rationale: z.string(),
    nextSteps: z.array(z.string()),
    decisionRequired: z.boolean(),
    deadline: z.string().optional()
  }),

  // Supporting materials
  attachments: z.array(z.object({
    type: z.enum(['MAP', 'CHART', 'TABLE', 'DOCUMENT', 'IMAGE']),
    title: z.string(),
    url: z.string(),
    description: z.string()
  })),

  // Intelligence sources
  sources: z.array(z.object({
    source: z.string(),
    reliability: z.string(),
    date: z.string()
  })),

  preparedBy: z.string(),
  preparedAt: z.string(),
  validUntil: z.string().optional(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Decision Audit Trail
// ============================================================================

export const DecisionRecordSchema = z.object({
  id: z.string(),
  operationId: z.string().optional(),

  // Decision
  decision: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum([
      'STRATEGIC',
      'OPERATIONAL',
      'TACTICAL',
      'ADMINISTRATIVE',
      'APPROVAL',
      'AUTHORIZATION'
    ]),
    options: z.array(z.string()),
    selected: z.string()
  }),

  // Context
  context: z.object({
    situation: z.string(),
    constraints: z.array(z.string()),
    pressures: z.array(z.string()),
    timeAvailable: z.string()
  }),

  // Decision maker
  decisionMaker: z.object({
    userId: z.string(),
    role: z.string(),
    authority: z.string()
  }),

  // Analysis
  analysis: z.object({
    coaId: z.string().optional(),
    riskAssessmentId: z.string().optional(),
    impactAnalysisId: z.string().optional(),
    supportingDocuments: z.array(z.string())
  }),

  // Rationale
  rationale: z.string(),
  assumptions: z.array(z.string()),

  // Approvals
  approvals: z.array(z.object({
    approver: z.string(),
    role: z.string(),
    timestamp: z.string(),
    status: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
    comments: z.string()
  })),

  // Outcome tracking
  outcome: z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'MIXED']),
    results: z.string().optional(),
    lessonsLearned: z.array(z.string())
  }).optional(),

  timestamp: z.string(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Type Exports
// ============================================================================

export type CourseOfAction = z.infer<typeof CourseOfActionSchema>;
export type COAComparison = z.infer<typeof COAComparisonSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type ImpactAnalysis = z.infer<typeof ImpactAnalysisSchema>;
export type PredictionModel = z.infer<typeof PredictionModelSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type ExecutiveBriefing = z.infer<typeof ExecutiveBriefingSchema>;
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

// ============================================================================
// Decision Support Service
// ============================================================================

export class DecisionSupport {
  private coas: Map<string, CourseOfAction> = new Map();
  private comparisons: Map<string, COAComparison> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private impactAnalyses: Map<string, ImpactAnalysis> = new Map();
  private predictions: Map<string, Prediction> = new Map();
  private models: Map<string, PredictionModel> = new Map();
  private briefings: Map<string, ExecutiveBriefing> = new Map();
  private decisions: Map<string, DecisionRecord> = new Map();

  /**
   * Create course of action
   */
  createCOA(coa: CourseOfAction): CourseOfAction {
    const validated = CourseOfActionSchema.parse(coa);
    this.coas.set(validated.id, validated);
    return validated;
  }

  /**
   * Compare courses of action
   */
  compareCOAs(coaIds: string[], criteria: any[]): COAComparison {
    const coas = coaIds.map(id => this.coas.get(id)).filter((c): c is CourseOfAction => c !== undefined);

    if (coas.length === 0) {
      throw new Error('No valid COAs found');
    }

    // Score each COA
    const rankings = coas.map(coa => {
      let totalScore = 0;
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      // Calculate weighted score
      for (const criterion of criteria) {
        const score = criterion.scores[coa.id] || 0;
        totalScore += score * criterion.weight;

        if (score > 80) {
          strengths.push(criterion.name);
        } else if (score < 40) {
          weaknesses.push(criterion.name);
        }
      }

      return {
        coaId: coa.id,
        rank: 0, // Will be set after sorting
        totalScore,
        strengths,
        weaknesses
      };
    });

    // Sort by score and assign ranks
    rankings.sort((a, b) => b.totalScore - a.totalScore);
    rankings.forEach((r, i) => r.rank = i + 1);

    const comparison: COAComparison = {
      id: `comp-${Date.now()}`,
      operationId: coas[0].operationId,
      coas: coaIds,
      criteria,
      ranking: rankings,
      recommendation: {
        recommendedCOA: rankings[0].coaId,
        rationale: `Highest overall score (${rankings[0].totalScore.toFixed(1)})`,
        conditions: [],
        alternatives: rankings.slice(1, 3).map(r => r.coaId)
      },
      comparedBy: 'system',
      comparedAt: new Date().toISOString(),
      metadata: {}
    };

    const validated = COAComparisonSchema.parse(comparison);
    this.comparisons.set(validated.id, validated);
    return validated;
  }

  /**
   * Create risk assessment
   */
  createRiskAssessment(assessment: RiskAssessment): RiskAssessment {
    const validated = RiskAssessmentSchema.parse(assessment);
    this.riskAssessments.set(validated.id, validated);
    return validated;
  }

  /**
   * Create impact analysis
   */
  createImpactAnalysis(analysis: ImpactAnalysis): ImpactAnalysis {
    const validated = ImpactAnalysisSchema.parse(analysis);
    this.impactAnalyses.set(validated.id, validated);
    return validated;
  }

  /**
   * Generate prediction
   */
  generatePrediction(modelId: string, inputs: Record<string, any>): Prediction {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Simplified prediction logic
    const prediction: Prediction = {
      id: `pred-${Date.now()}`,
      modelId,
      timestamp: new Date().toISOString(),
      prediction: {
        outcome: 'Predicted outcome based on inputs',
        probability: 75,
        confidence: model.parameters.confidence,
        timeframe: '7 days',
        factors: Object.entries(inputs).map(([factor, value]) => ({
          factor,
          weight: 1 / Object.keys(inputs).length,
          value
        })),
        alternatives: []
      },
      recommendations: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {}
    };

    const validated = PredictionSchema.parse(prediction);
    this.predictions.set(validated.id, validated);
    return validated;
  }

  /**
   * Generate executive briefing
   */
  generateBriefing(data: Partial<ExecutiveBriefing>): ExecutiveBriefing {
    const briefing: ExecutiveBriefing = {
      id: `brief-${Date.now()}`,
      title: data.title || 'Executive Briefing',
      classification: data.classification || 'SECRET',
      audience: data.audience || [],
      executiveSummary: data.executiveSummary || '',
      situation: data.situation || {
        overview: '',
        keyPoints: [],
        timeline: [],
        context: ''
      },
      assessment: data.assessment || {
        currentState: '',
        trends: [],
        threats: [],
        opportunities: []
      },
      options: data.options || [],
      recommendation: data.recommendation || {
        recommendedOption: '',
        rationale: '',
        nextSteps: [],
        decisionRequired: false
      },
      attachments: data.attachments || [],
      sources: data.sources || [],
      preparedBy: data.preparedBy || 'system',
      preparedAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };

    const validated = ExecutiveBriefingSchema.parse(briefing);
    this.briefings.set(validated.id, validated);
    return validated;
  }

  /**
   * Record decision
   */
  recordDecision(decision: DecisionRecord): DecisionRecord {
    const validated = DecisionRecordSchema.parse(decision);
    this.decisions.set(validated.id, validated);
    return validated;
  }

  /**
   * Get decision history for operation
   */
  getDecisionHistory(operationId: string): DecisionRecord[] {
    return Array.from(this.decisions.values())
      .filter(d => d.operationId === operationId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
