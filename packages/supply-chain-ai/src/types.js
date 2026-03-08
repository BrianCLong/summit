"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainableAISchema = exports.CausalAnalysisSchema = exports.RLOptimizationSchema = exports.AnomalyDetectionSchema = exports.SentimentAnalysisSchema = exports.ContractAnalysisSchema = exports.VisualInspectionSchema = exports.QualityPredictionSchema = exports.DemandForecastSchema = exports.AIModelSchema = exports.ModelArchitectureSchema = exports.ModelTypeSchema = void 0;
const zod_1 = require("zod");
/**
 * Deep Learning Models
 */
exports.ModelTypeSchema = zod_1.z.enum([
    'demand_forecasting',
    'price_prediction',
    'risk_prediction',
    'anomaly_detection',
    'quality_prediction',
    'lead_time_prediction',
    'churn_prediction',
    'sentiment_analysis',
    'image_classification',
    'object_detection',
]);
exports.ModelArchitectureSchema = zod_1.z.enum([
    'lstm',
    'gru',
    'transformer',
    'cnn',
    'resnet',
    'yolo',
    'bert',
    'gpt',
    'gan',
    'vae',
]);
exports.AIModelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    modelType: exports.ModelTypeSchema,
    architecture: exports.ModelArchitectureSchema,
    version: zod_1.z.string(),
    // Model metadata
    trainingData: zod_1.z.object({
        datasetSize: zod_1.z.number(),
        features: zod_1.z.array(zod_1.z.string()),
        dateRange: zod_1.z.object({
            start: zod_1.z.string().datetime(),
            end: zod_1.z.string().datetime(),
        }),
    }),
    // Performance metrics
    performance: zod_1.z.object({
        accuracy: zod_1.z.number().optional(),
        precision: zod_1.z.number().optional(),
        recall: zod_1.z.number().optional(),
        f1Score: zod_1.z.number().optional(),
        mape: zod_1.z.number().optional(), // Mean Absolute Percentage Error
        rmse: zod_1.z.number().optional(), // Root Mean Squared Error
        auc: zod_1.z.number().optional(), // Area Under Curve
    }),
    // Model status
    status: zod_1.z.enum(['training', 'ready', 'deployed', 'deprecated']),
    lastTrainedAt: zod_1.z.string().datetime(),
    nextRetrainingDue: zod_1.z.string().datetime(),
    // Deployment
    endpoint: zod_1.z.string().optional(),
    inferenceLatency: zod_1.z.number().optional(), // milliseconds
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Demand Forecasting
 */
exports.DemandForecastSchema = zod_1.z.object({
    id: zod_1.z.string(),
    productId: zod_1.z.string(),
    componentId: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    // Forecast period
    forecastHorizon: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
    periodsAhead: zod_1.z.number(),
    // Predictions
    predictions: zod_1.z.array(zod_1.z.object({
        period: zod_1.z.string().datetime(),
        predictedDemand: zod_1.z.number(),
        lowerBound: zod_1.z.number(), // 95% confidence interval
        upperBound: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(100),
    })),
    // Influencing factors
    factors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        impact: zod_1.z.number(), // -100 to 100
        description: zod_1.z.string(),
    })),
    // Model info
    modelId: zod_1.z.string(),
    modelConfidence: zod_1.z.number().min(0).max(100),
    // Accuracy tracking
    actualVsPredicted: zod_1.z.array(zod_1.z.object({
        period: zod_1.z.string().datetime(),
        predicted: zod_1.z.number(),
        actual: zod_1.z.number(),
        error: zod_1.z.number(),
    })).optional(),
    generatedAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime(),
});
/**
 * Predictive Quality Analysis
 */
exports.QualityPredictionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    supplierId: zod_1.z.string(),
    componentId: zod_1.z.string().optional(),
    productId: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    // Prediction
    predictedDefectRate: zod_1.z.number(), // PPM
    confidence: zod_1.z.number().min(0).max(100),
    predictionWindow: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }),
    // Risk factors
    riskFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
        likelihood: zod_1.z.number().min(0).max(100),
        description: zod_1.z.string(),
        recommendation: zod_1.z.string(),
    })),
    // Historical analysis
    trend: zod_1.z.enum(['improving', 'stable', 'degrading', 'volatile']),
    historicalDefectRate: zod_1.z.number(),
    // Recommendations
    recommendations: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        expectedImprovement: zod_1.z.number(), // % reduction in defects
        implementationCost: zod_1.z.string().optional(),
        timeline: zod_1.z.string(),
    })),
    modelId: zod_1.z.string(),
    generatedAt: zod_1.z.string().datetime(),
});
/**
 * Computer Vision Quality Inspection
 */
exports.VisualInspectionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    componentId: zod_1.z.string(),
    lotNumber: zod_1.z.string().optional(),
    serialNumber: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    // Image data
    imageId: zod_1.z.string(),
    imageUrl: zod_1.z.string().optional(),
    captureTimestamp: zod_1.z.string().datetime(),
    // Detection results
    defectsDetected: zod_1.z.array(zod_1.z.object({
        defectType: zod_1.z.string(),
        severity: zod_1.z.enum(['critical', 'major', 'minor', 'cosmetic']),
        location: zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            width: zod_1.z.number(),
            height: zod_1.z.number(),
        }),
        confidence: zod_1.z.number().min(0).max(100),
        description: zod_1.z.string(),
    })),
    // Overall assessment
    overallQuality: zod_1.z.enum(['pass', 'conditional', 'fail']),
    qualityScore: zod_1.z.number().min(0).max(100),
    // Processing info
    modelId: zod_1.z.string(),
    processingTime: zod_1.z.number(), // milliseconds
    // Actions
    disposition: zod_1.z.enum(['accepted', 'rework', 'rejected', 'further_inspection']),
    actionTaken: zod_1.z.string().optional(),
    inspectedBy: zod_1.z.enum(['ai', 'human', 'hybrid']),
    verifiedBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
});
/**
 * Natural Language Contract Analysis
 */
exports.ContractAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contractId: zod_1.z.string(),
    vendorId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    // Document info
    documentUrl: zod_1.z.string().optional(),
    documentType: zod_1.z.string(),
    // Key terms extracted
    keyTerms: zod_1.z.array(zod_1.z.object({
        term: zod_1.z.string(),
        category: zod_1.z.enum([
            'pricing',
            'delivery',
            'quality',
            'liability',
            'termination',
            'warranty',
            'intellectual_property',
            'confidentiality',
            'payment_terms',
            'dispute_resolution',
        ]),
        value: zod_1.z.string(),
        location: zod_1.z.object({
            page: zod_1.z.number(),
            section: zod_1.z.string(),
        }),
        importance: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
    })),
    // Risk analysis
    risks: zod_1.z.array(zod_1.z.object({
        riskType: zod_1.z.string(),
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
        description: zod_1.z.string(),
        clause: zod_1.z.string(),
        recommendation: zod_1.z.string(),
    })),
    // Opportunities
    opportunities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        potentialValue: zod_1.z.string().optional(),
        negotiationStrategy: zod_1.z.string(),
    })),
    // Compliance
    complianceChecks: zod_1.z.array(zod_1.z.object({
        requirement: zod_1.z.string(),
        met: zod_1.z.boolean(),
        evidence: zod_1.z.string().optional(),
        recommendation: zod_1.z.string().optional(),
    })),
    // Summary
    overallRiskScore: zod_1.z.number().min(0).max(100),
    favorability: zod_1.z.enum(['highly_favorable', 'favorable', 'neutral', 'unfavorable', 'highly_unfavorable']),
    // Recommendations
    negotiationPoints: zod_1.z.array(zod_1.z.string()),
    missingClauses: zod_1.z.array(zod_1.z.string()),
    modelId: zod_1.z.string(),
    analyzedAt: zod_1.z.string().datetime(),
});
/**
 * Sentiment Analysis
 */
exports.SentimentAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sourceType: zod_1.z.enum(['news', 'social_media', 'review', 'survey', 'email', 'report']),
    sourceId: zod_1.z.string(),
    entityId: zod_1.z.string(), // Supplier, product, etc.
    tenantId: zod_1.z.string(),
    // Text content
    text: zod_1.z.string(),
    language: zod_1.z.string(),
    // Sentiment scores
    overallSentiment: zod_1.z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
    sentimentScore: zod_1.z.number().min(-1).max(1), // -1 (very negative) to 1 (very positive)
    confidence: zod_1.z.number().min(0).max(100),
    // Aspect-based sentiment
    aspects: zod_1.z.array(zod_1.z.object({
        aspect: zod_1.z.string(), // quality, delivery, service, price, etc.
        sentiment: zod_1.z.number().min(-1).max(1),
        mentions: zod_1.z.number(),
        keyPhrases: zod_1.z.array(zod_1.z.string()),
    })),
    // Entities and topics
    entities: zod_1.z.array(zod_1.z.object({
        entity: zod_1.z.string(),
        type: zod_1.z.string(),
        sentiment: zod_1.z.number().min(-1).max(1),
    })),
    topics: zod_1.z.array(zod_1.z.string()),
    // Emotional analysis
    emotions: zod_1.z.object({
        joy: zod_1.z.number().min(0).max(1),
        anger: zod_1.z.number().min(0).max(1),
        fear: zod_1.z.number().min(0).max(1),
        sadness: zod_1.z.number().min(0).max(1),
        surprise: zod_1.z.number().min(0).max(1),
    }).optional(),
    // Urgency and priority
    urgency: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
    requiresAction: zod_1.z.boolean(),
    modelId: zod_1.z.string(),
    analyzedAt: zod_1.z.string().datetime(),
});
/**
 * Anomaly Detection
 */
exports.AnomalyDetectionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    entityType: zod_1.z.enum(['supplier', 'component', 'shipment', 'process', 'transaction']),
    entityId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    // Anomaly details
    anomalyType: zod_1.z.enum([
        'statistical',
        'behavioral',
        'temporal',
        'contextual',
        'collective',
    ]),
    // Detection
    isAnomaly: zod_1.z.boolean(),
    anomalyScore: zod_1.z.number().min(0).max(100),
    severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
    confidence: zod_1.z.number().min(0).max(100),
    // Affected metrics
    affectedMetrics: zod_1.z.array(zod_1.z.object({
        metric: zod_1.z.string(),
        expectedValue: zod_1.z.number(),
        actualValue: zod_1.z.number(),
        deviation: zod_1.z.number(), // % or absolute
        deviationType: zod_1.z.enum(['statistical', 'threshold', 'pattern']),
    })),
    // Context
    contextFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        value: zod_1.z.string(),
        contribution: zod_1.z.number(), // % contribution to anomaly
    })),
    // Similar historical anomalies
    similarIncidents: zod_1.z.array(zod_1.z.object({
        incidentId: zod_1.z.string(),
        similarity: zod_1.z.number().min(0).max(100),
        outcome: zod_1.z.string(),
        resolution: zod_1.z.string(),
    })).optional(),
    // Root cause analysis
    possibleCauses: zod_1.z.array(zod_1.z.object({
        cause: zod_1.z.string(),
        likelihood: zod_1.z.number().min(0).max(100),
        evidence: zod_1.z.array(zod_1.z.string()),
        recommendation: zod_1.z.string(),
    })),
    // Actions
    recommendedActions: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        priority: zod_1.z.enum(['immediate', 'urgent', 'high', 'medium', 'low']),
        expectedOutcome: zod_1.z.string(),
    })),
    // Investigation
    investigationStatus: zod_1.z.enum(['new', 'investigating', 'resolved', 'false_positive']),
    investigationNotes: zod_1.z.string().optional(),
    modelId: zod_1.z.string(),
    detectedAt: zod_1.z.string().datetime(),
    resolvedAt: zod_1.z.string().datetime().optional(),
});
/**
 * Reinforcement Learning Optimization
 */
exports.RLOptimizationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    optimizationType: zod_1.z.enum([
        'inventory_optimization',
        'route_optimization',
        'pricing_optimization',
        'capacity_planning',
        'order_allocation',
        'production_scheduling',
    ]),
    tenantId: zod_1.z.string(),
    // State
    currentState: zod_1.z.object({
        stateId: zod_1.z.string(),
        features: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        timestamp: zod_1.z.string().datetime(),
    }),
    // Action recommendations
    recommendedActions: zod_1.z.array(zod_1.z.object({
        actionId: zod_1.z.string(),
        action: zod_1.z.string(),
        expectedReward: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(100),
        risk: zod_1.z.number().min(0).max(100),
        // Impact prediction
        predictedOutcome: zod_1.z.object({
            metric: zod_1.z.string(),
            currentValue: zod_1.z.number(),
            predictedValue: zod_1.z.number(),
            improvement: zod_1.z.number(), // %
        }),
        // Constraints
        constraints: zod_1.z.array(zod_1.z.string()),
        feasibility: zod_1.z.number().min(0).max(100),
    })),
    // Best action
    optimalAction: zod_1.z.object({
        actionId: zod_1.z.string(),
        description: zod_1.z.string(),
        expectedBenefit: zod_1.z.string(),
        implementationSteps: zod_1.z.array(zod_1.z.string()),
    }),
    // Learning metrics
    modelPerformance: zod_1.z.object({
        episodeReward: zod_1.z.number(),
        cumulativeReward: zod_1.z.number(),
        explorationRate: zod_1.z.number(),
        learningRate: zod_1.z.number(),
    }),
    // Simulation results
    simulationResults: zod_1.z.array(zod_1.z.object({
        scenario: zod_1.z.string(),
        outcome: zod_1.z.string(),
        probability: zod_1.z.number(),
        reward: zod_1.z.number(),
    })).optional(),
    modelId: zod_1.z.string(),
    generatedAt: zod_1.z.string().datetime(),
});
/**
 * Causal Inference Analysis
 */
exports.CausalAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string(),
    analysisType: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    // Cause-effect relationship
    cause: zod_1.z.object({
        variable: zod_1.z.string(),
        value: zod_1.z.string(),
        changeType: zod_1.z.enum(['increase', 'decrease', 'change']),
    }),
    effect: zod_1.z.object({
        variable: zod_1.z.string(),
        expectedChange: zod_1.z.number(),
        unit: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(100),
    }),
    // Causal strength
    causalEffect: zod_1.z.number(),
    pValue: zod_1.z.number(),
    confidenceInterval: zod_1.z.object({
        lower: zod_1.z.number(),
        upper: zod_1.z.number(),
        level: zod_1.z.number(), // e.g., 95
    }),
    // Confounders and mediators
    confounders: zod_1.z.array(zod_1.z.object({
        variable: zod_1.z.string(),
        impact: zod_1.z.string(),
        controlled: zod_1.z.boolean(),
    })),
    mediators: zod_1.z.array(zod_1.z.object({
        variable: zod_1.z.string(),
        mediationEffect: zod_1.z.number(),
        directEffect: zod_1.z.number(),
        indirectEffect: zod_1.z.number(),
    })).optional(),
    // Counterfactual analysis
    counterfactual: zod_1.z.object({
        scenario: zod_1.z.string(),
        predictedOutcome: zod_1.z.number(),
        actualOutcome: zod_1.z.number(),
        treatment, Effect: zod_1.z.number(),
    }).optional(),
    // Recommendations
    insights: zod_1.z.array(zod_1.z.string()),
    actionableRecommendations: zod_1.z.array(zod_1.z.object({
        recommendation: zod_1.z.string(),
        expectedImpact: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(100),
    })),
    // Methodology
    method: zod_1.z.enum([
        'randomized_control_trial',
        'propensity_score_matching',
        'instrumental_variables',
        'difference_in_differences',
        'regression_discontinuity',
        'causal_forest',
    ]),
    modelId: zod_1.z.string(),
    analyzedAt: zod_1.z.string().datetime(),
});
/**
 * Explainable AI (XAI) Output
 */
exports.ExplainableAISchema = zod_1.z.object({
    predictionId: zod_1.z.string(),
    modelId: zod_1.z.string(),
    // Prediction
    prediction: zod_1.z.any(),
    confidence: zod_1.z.number().min(0).max(100),
    // Feature importance
    featureImportance: zod_1.z.array(zod_1.z.object({
        feature: zod_1.z.string(),
        importance: zod_1.z.number(),
        contribution: zod_1.z.number(), // To this specific prediction
        direction: zod_1.z.enum(['positive', 'negative', 'neutral']),
    })),
    // SHAP values (SHapley Additive exPlanations)
    shapValues: zod_1.z.array(zod_1.z.object({
        feature: zod_1.z.string(),
        shapValue: zod_1.z.number(),
        baseValue: zod_1.z.number(),
        featureValue: zod_1.z.any(),
    })).optional(),
    // Local interpretable model
    localExplanation: zod_1.z.string(),
    // Similar examples
    similarExamples: zod_1.z.array(zod_1.z.object({
        exampleId: zod_1.z.string(),
        similarity: zod_1.z.number(),
        outcome: zod_1.z.any(),
        explanation: zod_1.z.string(),
    })).optional(),
    // Counterfactual explanations
    counterfactuals: zod_1.z.array(zod_1.z.object({
        scenario: zod_1.z.string(),
        changes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        resultingPrediction: zod_1.z.any(),
    })).optional(),
    // Plain language explanation
    humanExplanation: zod_1.z.string(),
    // Confidence factors
    uncertaintyFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        impact: zod_1.z.string(),
    })).optional(),
    generatedAt: zod_1.z.string().datetime(),
});
