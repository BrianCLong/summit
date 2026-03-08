"use strict";
// @ts-nocheck - zod v4 z.record API change
/**
 * Decision Support Systems
 *
 * Advanced decision support with predictive analytics, course of action analysis,
 * risk assessment, impact analysis, and executive briefing generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionSupport = exports.DecisionRecordSchema = exports.ExecutiveBriefingSchema = exports.PredictionSchema = exports.PredictionModelSchema = exports.ImpactAnalysisSchema = exports.RiskAssessmentSchema = exports.COAComparisonSchema = exports.CourseOfActionSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Course of Action (COA) Analysis
// ============================================================================
exports.CourseOfActionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    operationId: zod_1.z.string(),
    // Objectives
    objectives: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        description: zod_1.z.string(),
        priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        measurable: zod_1.z.boolean(),
        metrics: zod_1.z.array(zod_1.z.string())
    })),
    // Resources required
    resources: zod_1.z.object({
        personnel: zod_1.z.number(),
        equipment: zod_1.z.array(zod_1.z.string()),
        budget: zod_1.z.number(),
        time: zod_1.z.number(), // days
        specialCapabilities: zod_1.z.array(zod_1.z.string())
    }),
    // Timeline
    timeline: zod_1.z.object({
        planning: zod_1.z.number(), // days
        preparation: zod_1.z.number(),
        execution: zod_1.z.number(),
        assessment: zod_1.z.number(),
        total: zod_1.z.number()
    }),
    // Risks
    risks: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        description: zod_1.z.string(),
        probability: zod_1.z.number(), // 0-100
        impact: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        mitigation: zod_1.z.string()
    })),
    // Advantages
    advantages: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        significance: zod_1.z.enum(['MAJOR', 'MODERATE', 'MINOR'])
    })),
    // Disadvantages
    disadvantages: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        significance: zod_1.z.enum(['MAJOR', 'MODERATE', 'MINOR'])
    })),
    // Feasibility assessment
    feasibility: zod_1.z.object({
        technical: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        operational: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        political: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        legal: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        overall: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW'])
    }),
    // Success probability
    successProbability: zod_1.z.number(), // 0-100
    // Score
    overallScore: zod_1.z.number(), // 0-100
    metadata: zod_1.z.record(zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.COAComparisonSchema = zod_1.z.object({
    id: zod_1.z.string(),
    operationId: zod_1.z.string(),
    coas: zod_1.z.array(zod_1.z.string()), // COA IDs
    // Comparison criteria
    criteria: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        weight: zod_1.z.number(), // 0-1
        scores: zod_1.z.record(zod_1.z.number()) // COA ID -> score
    })),
    // Rankings
    ranking: zod_1.z.array(zod_1.z.object({
        coaId: zod_1.z.string(),
        rank: zod_1.z.number(),
        totalScore: zod_1.z.number(),
        strengths: zod_1.z.array(zod_1.z.string()),
        weaknesses: zod_1.z.array(zod_1.z.string())
    })),
    recommendation: zod_1.z.object({
        recommendedCOA: zod_1.z.string(),
        rationale: zod_1.z.string(),
        conditions: zod_1.z.array(zod_1.z.string()),
        alternatives: zod_1.z.array(zod_1.z.string())
    }),
    comparedBy: zod_1.z.string(),
    comparedAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Risk Assessment
// ============================================================================
exports.RiskAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    operationId: zod_1.z.string().optional(),
    coaId: zod_1.z.string().optional(),
    // Risk categories
    risks: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        category: zod_1.z.enum([
            'OPERATIONAL',
            'SECURITY',
            'TECHNICAL',
            'POLITICAL',
            'LEGAL',
            'ENVIRONMENTAL',
            'REPUTATIONAL',
            'FINANCIAL'
        ]),
        description: zod_1.z.string(),
        likelihood: zod_1.z.enum(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
        impact: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC']),
        riskLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        // Mitigation
        mitigation: zod_1.z.object({
            strategies: zod_1.z.array(zod_1.z.string()),
            residualRisk: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            cost: zod_1.z.number().optional(),
            timeline: zod_1.z.string().optional()
        }),
        // Monitoring
        indicators: zod_1.z.array(zod_1.z.string()),
        triggers: zod_1.z.array(zod_1.z.string()),
        owner: zod_1.z.string()
    })),
    // Overall assessment
    overallRisk: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    // Risk matrix
    matrix: zod_1.z.object({
        low: zod_1.z.number(),
        medium: zod_1.z.number(),
        high: zod_1.z.number(),
        critical: zod_1.z.number()
    }),
    recommendations: zod_1.z.array(zod_1.z.string()),
    assessedBy: zod_1.z.string(),
    assessedAt: zod_1.z.string(),
    validUntil: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Impact Analysis
// ============================================================================
exports.ImpactAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    scenario: zod_1.z.string(),
    // Impacts
    impacts: zod_1.z.object({
        operational: zod_1.z.object({
            description: zod_1.z.string(),
            magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            affectedAssets: zod_1.z.array(zod_1.z.string()),
            duration: zod_1.z.string(),
            mitigationOptions: zod_1.z.array(zod_1.z.string())
        }),
        strategic: zod_1.z.object({
            description: zod_1.z.string(),
            magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            objectives: zod_1.z.array(zod_1.z.string()),
            longTermEffects: zod_1.z.array(zod_1.z.string())
        }),
        political: zod_1.z.object({
            description: zod_1.z.string(),
            magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            stakeholders: zod_1.z.array(zod_1.z.string()),
            publicPerception: zod_1.z.enum(['VERY_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'VERY_POSITIVE'])
        }),
        economic: zod_1.z.object({
            description: zod_1.z.string(),
            magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            estimatedCost: zod_1.z.number(),
            economicSectors: zod_1.z.array(zod_1.z.string())
        }),
        humanitarian: zod_1.z.object({
            description: zod_1.z.string(),
            magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            affectedPopulation: zod_1.z.number(),
            casualties: zod_1.z.object({
                estimated: zod_1.z.number(),
                civilian: zod_1.z.number(),
                military: zod_1.z.number()
            }).optional()
        }),
        environmental: zod_1.z.object({
            description: zod_1.z.string(),
            magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
            affectedArea: zod_1.z.number(), // sq km
            duration: zod_1.z.string(),
            reversibility: zod_1.z.enum(['REVERSIBLE', 'PARTIALLY_REVERSIBLE', 'IRREVERSIBLE'])
        })
    }),
    // Overall impact
    overallImpact: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE']),
    // Cascading effects
    cascadingEffects: zod_1.z.array(zod_1.z.object({
        effect: zod_1.z.string(),
        probability: zod_1.z.number(), // 0-100
        timeframe: zod_1.z.string(),
        magnitude: zod_1.z.enum(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE'])
    })),
    recommendations: zod_1.z.array(zod_1.z.string()),
    analyzedBy: zod_1.z.string(),
    analyzedAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Predictive Analytics
// ============================================================================
exports.PredictionModelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    type: zod_1.z.enum([
        'THREAT_FORECAST',
        'BEHAVIOR_PREDICTION',
        'TREND_ANALYSIS',
        'OUTCOME_PROBABILITY',
        'RESOURCE_DEMAND',
        'TIMELINE_ESTIMATION'
    ]),
    // Model parameters
    parameters: zod_1.z.object({
        algorithm: zod_1.z.string(),
        features: zod_1.z.array(zod_1.z.string()),
        trainingData: zod_1.z.object({
            size: zod_1.z.number(),
            period: zod_1.z.string(),
            sources: zod_1.z.array(zod_1.z.string())
        }),
        confidence: zod_1.z.number(), // 0-100
        accuracy: zod_1.z.number().optional() // 0-100
    }),
    // Input requirements
    inputs: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        required: zod_1.z.boolean(),
        description: zod_1.z.string()
    })),
    // Output format
    outputs: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        description: zod_1.z.string()
    })),
    metadata: zod_1.z.record(zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.PredictionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    modelId: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    // Prediction
    prediction: zod_1.z.object({
        outcome: zod_1.z.string(),
        probability: zod_1.z.number(), // 0-100
        confidence: zod_1.z.number(), // 0-100
        timeframe: zod_1.z.string(),
        // Supporting data
        factors: zod_1.z.array(zod_1.z.object({
            factor: zod_1.z.string(),
            weight: zod_1.z.number(),
            value: zod_1.z.unknown()
        })),
        // Uncertainty
        uncertaintyRange: zod_1.z.object({
            lower: zod_1.z.number(),
            upper: zod_1.z.number()
        }).optional(),
        // Alternative outcomes
        alternatives: zod_1.z.array(zod_1.z.object({
            outcome: zod_1.z.string(),
            probability: zod_1.z.number()
        }))
    }),
    // Recommendations
    recommendations: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        rationale: zod_1.z.string(),
        priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        timeframe: zod_1.z.string()
    })),
    validUntil: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Executive Briefing
// ============================================================================
exports.ExecutiveBriefingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    classification: zod_1.z.string(),
    audience: zod_1.z.array(zod_1.z.string()),
    // Summary
    executiveSummary: zod_1.z.string(),
    // Situation
    situation: zod_1.z.object({
        overview: zod_1.z.string(),
        keyPoints: zod_1.z.array(zod_1.z.string()),
        timeline: zod_1.z.array(zod_1.z.object({
            timestamp: zod_1.z.string(),
            event: zod_1.z.string()
        })),
        context: zod_1.z.string()
    }),
    // Assessment
    assessment: zod_1.z.object({
        currentState: zod_1.z.string(),
        trends: zod_1.z.array(zod_1.z.object({
            trend: zod_1.z.string(),
            direction: zod_1.z.enum(['IMPROVING', 'STABLE', 'DETERIORATING']),
            significance: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
        })),
        threats: zod_1.z.array(zod_1.z.string()),
        opportunities: zod_1.z.array(zod_1.z.string())
    }),
    // Options
    options: zod_1.z.array(zod_1.z.object({
        option: zod_1.z.string(),
        description: zod_1.z.string(),
        pros: zod_1.z.array(zod_1.z.string()),
        cons: zod_1.z.array(zod_1.z.string()),
        risk: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        resources: zod_1.z.string(),
        timeline: zod_1.z.string()
    })),
    // Recommendation
    recommendation: zod_1.z.object({
        recommendedOption: zod_1.z.string(),
        rationale: zod_1.z.string(),
        nextSteps: zod_1.z.array(zod_1.z.string()),
        decisionRequired: zod_1.z.boolean(),
        deadline: zod_1.z.string().optional()
    }),
    // Supporting materials
    attachments: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['MAP', 'CHART', 'TABLE', 'DOCUMENT', 'IMAGE']),
        title: zod_1.z.string(),
        url: zod_1.z.string(),
        description: zod_1.z.string()
    })),
    // Intelligence sources
    sources: zod_1.z.array(zod_1.z.object({
        source: zod_1.z.string(),
        reliability: zod_1.z.string(),
        date: zod_1.z.string()
    })),
    preparedBy: zod_1.z.string(),
    preparedAt: zod_1.z.string(),
    validUntil: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Decision Audit Trail
// ============================================================================
exports.DecisionRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    operationId: zod_1.z.string().optional(),
    // Decision
    decision: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        type: zod_1.z.enum([
            'STRATEGIC',
            'OPERATIONAL',
            'TACTICAL',
            'ADMINISTRATIVE',
            'APPROVAL',
            'AUTHORIZATION'
        ]),
        options: zod_1.z.array(zod_1.z.string()),
        selected: zod_1.z.string()
    }),
    // Context
    context: zod_1.z.object({
        situation: zod_1.z.string(),
        constraints: zod_1.z.array(zod_1.z.string()),
        pressures: zod_1.z.array(zod_1.z.string()),
        timeAvailable: zod_1.z.string()
    }),
    // Decision maker
    decisionMaker: zod_1.z.object({
        userId: zod_1.z.string(),
        role: zod_1.z.string(),
        authority: zod_1.z.string()
    }),
    // Analysis
    analysis: zod_1.z.object({
        coaId: zod_1.z.string().optional(),
        riskAssessmentId: zod_1.z.string().optional(),
        impactAnalysisId: zod_1.z.string().optional(),
        supportingDocuments: zod_1.z.array(zod_1.z.string())
    }),
    // Rationale
    rationale: zod_1.z.string(),
    assumptions: zod_1.z.array(zod_1.z.string()),
    // Approvals
    approvals: zod_1.z.array(zod_1.z.object({
        approver: zod_1.z.string(),
        role: zod_1.z.string(),
        timestamp: zod_1.z.string(),
        status: zod_1.z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
        comments: zod_1.z.string()
    })),
    // Outcome tracking
    outcome: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'MIXED']),
        results: zod_1.z.string().optional(),
        lessonsLearned: zod_1.z.array(zod_1.z.string())
    }).optional(),
    timestamp: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown())
});
// ============================================================================
// Decision Support Service
// ============================================================================
class DecisionSupport {
    coas = new Map();
    comparisons = new Map();
    riskAssessments = new Map();
    impactAnalyses = new Map();
    predictions = new Map();
    models = new Map();
    briefings = new Map();
    decisions = new Map();
    /**
     * Create course of action
     */
    createCOA(coa) {
        const validated = exports.CourseOfActionSchema.parse(coa);
        this.coas.set(validated.id, validated);
        return validated;
    }
    /**
     * Compare courses of action
     */
    compareCOAs(coaIds, criteria) {
        const coas = coaIds.map(id => this.coas.get(id)).filter((c) => c !== undefined);
        if (coas.length === 0) {
            throw new Error('No valid COAs found');
        }
        // Score each COA
        const rankings = coas.map(coa => {
            let totalScore = 0;
            const strengths = [];
            const weaknesses = [];
            // Calculate weighted score
            for (const criterion of criteria) {
                const score = criterion.scores[coa.id] || 0;
                totalScore += score * criterion.weight;
                if (score > 80) {
                    strengths.push(criterion.name);
                }
                else if (score < 40) {
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
        const comparison = {
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
        const validated = exports.COAComparisonSchema.parse(comparison);
        this.comparisons.set(validated.id, validated);
        return validated;
    }
    /**
     * Create risk assessment
     */
    createRiskAssessment(assessment) {
        const validated = exports.RiskAssessmentSchema.parse(assessment);
        this.riskAssessments.set(validated.id, validated);
        return validated;
    }
    /**
     * Create impact analysis
     */
    createImpactAnalysis(analysis) {
        const validated = exports.ImpactAnalysisSchema.parse(analysis);
        this.impactAnalyses.set(validated.id, validated);
        return validated;
    }
    /**
     * Generate prediction
     */
    generatePrediction(modelId, inputs) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }
        // Simplified prediction logic
        const prediction = {
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
        const validated = exports.PredictionSchema.parse(prediction);
        this.predictions.set(validated.id, validated);
        return validated;
    }
    /**
     * Generate executive briefing
     */
    generateBriefing(data) {
        const briefing = {
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
        const validated = exports.ExecutiveBriefingSchema.parse(briefing);
        this.briefings.set(validated.id, validated);
        return validated;
    }
    /**
     * Record decision
     */
    recordDecision(decision) {
        const validated = exports.DecisionRecordSchema.parse(decision);
        this.decisions.set(validated.id, validated);
        return validated;
    }
    /**
     * Get decision history for operation
     */
    getDecisionHistory(operationId) {
        return Array.from(this.decisions.values())
            .filter(d => d.operationId === operationId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
}
exports.DecisionSupport = DecisionSupport;
