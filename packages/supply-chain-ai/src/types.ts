import { z } from 'zod';

/**
 * Deep Learning Models
 */
export const ModelTypeSchema = z.enum([
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

export const ModelArchitectureSchema = z.enum([
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

export const AIModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelType: ModelTypeSchema,
  architecture: ModelArchitectureSchema,
  version: z.string(),

  // Model metadata
  trainingData: z.object({
    datasetSize: z.number(),
    features: z.array(z.string()),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
  }),

  // Performance metrics
  performance: z.object({
    accuracy: z.number().optional(),
    precision: z.number().optional(),
    recall: z.number().optional(),
    f1Score: z.number().optional(),
    mape: z.number().optional(), // Mean Absolute Percentage Error
    rmse: z.number().optional(), // Root Mean Squared Error
    auc: z.number().optional(), // Area Under Curve
  }),

  // Model status
  status: z.enum(['training', 'ready', 'deployed', 'deprecated']),
  lastTrainedAt: z.string().datetime(),
  nextRetrainingDue: z.string().datetime(),

  // Deployment
  endpoint: z.string().optional(),
  inferenceLatency: z.number().optional(), // milliseconds

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AIModel = z.infer<typeof AIModelSchema>;
export type ModelType = z.infer<typeof ModelTypeSchema>;
export type ModelArchitecture = z.infer<typeof ModelArchitectureSchema>;

/**
 * Demand Forecasting
 */
export const DemandForecastSchema = z.object({
  id: z.string(),
  productId: z.string(),
  componentId: z.string().optional(),
  tenantId: z.string(),

  // Forecast period
  forecastHorizon: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
  periodsAhead: z.number(),

  // Predictions
  predictions: z.array(z.object({
    period: z.string().datetime(),
    predictedDemand: z.number(),
    lowerBound: z.number(), // 95% confidence interval
    upperBound: z.number(),
    confidence: z.number().min(0).max(100),
  })),

  // Influencing factors
  factors: z.array(z.object({
    factor: z.string(),
    impact: z.number(), // -100 to 100
    description: z.string(),
  })),

  // Model info
  modelId: z.string(),
  modelConfidence: z.number().min(0).max(100),

  // Accuracy tracking
  actualVsPredicted: z.array(z.object({
    period: z.string().datetime(),
    predicted: z.number(),
    actual: z.number(),
    error: z.number(),
  })).optional(),

  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type DemandForecast = z.infer<typeof DemandForecastSchema>;

/**
 * Predictive Quality Analysis
 */
export const QualityPredictionSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  componentId: z.string().optional(),
  productId: z.string().optional(),
  tenantId: z.string(),

  // Prediction
  predictedDefectRate: z.number(), // PPM
  confidence: z.number().min(0).max(100),
  predictionWindow: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),

  // Risk factors
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    likelihood: z.number().min(0).max(100),
    description: z.string(),
    recommendation: z.string(),
  })),

  // Historical analysis
  trend: z.enum(['improving', 'stable', 'degrading', 'volatile']),
  historicalDefectRate: z.number(),

  // Recommendations
  recommendations: z.array(z.object({
    action: z.string(),
    expectedImprovement: z.number(), // % reduction in defects
    implementationCost: z.string().optional(),
    timeline: z.string(),
  })),

  modelId: z.string(),
  generatedAt: z.string().datetime(),
});

export type QualityPrediction = z.infer<typeof QualityPredictionSchema>;

/**
 * Computer Vision Quality Inspection
 */
export const VisualInspectionSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  tenantId: z.string(),

  // Image data
  imageId: z.string(),
  imageUrl: z.string().optional(),
  captureTimestamp: z.string().datetime(),

  // Detection results
  defectsDetected: z.array(z.object({
    defectType: z.string(),
    severity: z.enum(['critical', 'major', 'minor', 'cosmetic']),
    location: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
    confidence: z.number().min(0).max(100),
    description: z.string(),
  })),

  // Overall assessment
  overallQuality: z.enum(['pass', 'conditional', 'fail']),
  qualityScore: z.number().min(0).max(100),

  // Processing info
  modelId: z.string(),
  processingTime: z.number(), // milliseconds

  // Actions
  disposition: z.enum(['accepted', 'rework', 'rejected', 'further_inspection']),
  actionTaken: z.string().optional(),

  inspectedBy: z.enum(['ai', 'human', 'hybrid']),
  verifiedBy: z.string().optional(),

  createdAt: z.string().datetime(),
});

export type VisualInspection = z.infer<typeof VisualInspectionSchema>;

/**
 * Natural Language Contract Analysis
 */
export const ContractAnalysisSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  // Document info
  documentUrl: z.string().optional(),
  documentType: z.string(),

  // Key terms extracted
  keyTerms: z.array(z.object({
    term: z.string(),
    category: z.enum([
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
    value: z.string(),
    location: z.object({
      page: z.number(),
      section: z.string(),
    }),
    importance: z.enum(['critical', 'high', 'medium', 'low']),
  })),

  // Risk analysis
  risks: z.array(z.object({
    riskType: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    clause: z.string(),
    recommendation: z.string(),
  })),

  // Opportunities
  opportunities: z.array(z.object({
    type: z.string(),
    description: z.string(),
    potentialValue: z.string().optional(),
    negotiationStrategy: z.string(),
  })),

  // Compliance
  complianceChecks: z.array(z.object({
    requirement: z.string(),
    met: z.boolean(),
    evidence: z.string().optional(),
    recommendation: z.string().optional(),
  })),

  // Summary
  overallRiskScore: z.number().min(0).max(100),
  favorability: z.enum(['highly_favorable', 'favorable', 'neutral', 'unfavorable', 'highly_unfavorable']),

  // Recommendations
  negotiationPoints: z.array(z.string()),
  missingClauses: z.array(z.string()),

  modelId: z.string(),
  analyzedAt: z.string().datetime(),
});

export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;

/**
 * Sentiment Analysis
 */
export const SentimentAnalysisSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['news', 'social_media', 'review', 'survey', 'email', 'report']),
  sourceId: z.string(),
  entityId: z.string(), // Supplier, product, etc.
  tenantId: z.string(),

  // Text content
  text: z.string(),
  language: z.string(),

  // Sentiment scores
  overallSentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
  sentimentScore: z.number().min(-1).max(1), // -1 (very negative) to 1 (very positive)
  confidence: z.number().min(0).max(100),

  // Aspect-based sentiment
  aspects: z.array(z.object({
    aspect: z.string(), // quality, delivery, service, price, etc.
    sentiment: z.number().min(-1).max(1),
    mentions: z.number(),
    keyPhrases: z.array(z.string()),
  })),

  // Entities and topics
  entities: z.array(z.object({
    entity: z.string(),
    type: z.string(),
    sentiment: z.number().min(-1).max(1),
  })),

  topics: z.array(z.string()),

  // Emotional analysis
  emotions: z.object({
    joy: z.number().min(0).max(1),
    anger: z.number().min(0).max(1),
    fear: z.number().min(0).max(1),
    sadness: z.number().min(0).max(1),
    surprise: z.number().min(0).max(1),
  }).optional(),

  // Urgency and priority
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  requiresAction: z.boolean(),

  modelId: z.string(),
  analyzedAt: z.string().datetime(),
});

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;

/**
 * Anomaly Detection
 */
export const AnomalyDetectionSchema = z.object({
  id: z.string(),
  entityType: z.enum(['supplier', 'component', 'shipment', 'process', 'transaction']),
  entityId: z.string(),
  tenantId: z.string(),

  // Anomaly details
  anomalyType: z.enum([
    'statistical',
    'behavioral',
    'temporal',
    'contextual',
    'collective',
  ]),

  // Detection
  isAnomaly: z.boolean(),
  anomalyScore: z.number().min(0).max(100),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  confidence: z.number().min(0).max(100),

  // Affected metrics
  affectedMetrics: z.array(z.object({
    metric: z.string(),
    expectedValue: z.number(),
    actualValue: z.number(),
    deviation: z.number(), // % or absolute
    deviationType: z.enum(['statistical', 'threshold', 'pattern']),
  })),

  // Context
  contextFactors: z.array(z.object({
    factor: z.string(),
    value: z.string(),
    contribution: z.number(), // % contribution to anomaly
  })),

  // Similar historical anomalies
  similarIncidents: z.array(z.object({
    incidentId: z.string(),
    similarity: z.number().min(0).max(100),
    outcome: z.string(),
    resolution: z.string(),
  })).optional(),

  // Root cause analysis
  possibleCauses: z.array(z.object({
    cause: z.string(),
    likelihood: z.number().min(0).max(100),
    evidence: z.array(z.string()),
    recommendation: z.string(),
  })),

  // Actions
  recommendedActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['immediate', 'urgent', 'high', 'medium', 'low']),
    expectedOutcome: z.string(),
  })),

  // Investigation
  investigationStatus: z.enum(['new', 'investigating', 'resolved', 'false_positive']),
  investigationNotes: z.string().optional(),

  modelId: z.string(),
  detectedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});

export type AnomalyDetection = z.infer<typeof AnomalyDetectionSchema>;

/**
 * Reinforcement Learning Optimization
 */
export const RLOptimizationSchema = z.object({
  id: z.string(),
  optimizationType: z.enum([
    'inventory_optimization',
    'route_optimization',
    'pricing_optimization',
    'capacity_planning',
    'order_allocation',
    'production_scheduling',
  ]),
  tenantId: z.string(),

  // State
  currentState: z.object({
    stateId: z.string(),
    features: z.record(z.string(), z.number()),
    timestamp: z.string().datetime(),
  }),

  // Action recommendations
  recommendedActions: z.array(z.object({
    actionId: z.string(),
    action: z.string(),
    expectedReward: z.number(),
    confidence: z.number().min(0).max(100),
    risk: z.number().min(0).max(100),

    // Impact prediction
    predictedOutcome: z.object({
      metric: z.string(),
      currentValue: z.number(),
      predictedValue: z.number(),
      improvement: z.number(), // %
    }),

    // Constraints
    constraints: z.array(z.string()),
    feasibility: z.number().min(0).max(100),
  })),

  // Best action
  optimalAction: z.object({
    actionId: z.string(),
    description: z.string(),
    expectedBenefit: z.string(),
    implementationSteps: z.array(z.string()),
  }),

  // Learning metrics
  modelPerformance: z.object({
    episodeReward: z.number(),
    cumulativeReward: z.number(),
    explorationRate: z.number(),
    learningRate: z.number(),
  }),

  // Simulation results
  simulationResults: z.array(z.object({
    scenario: z.string(),
    outcome: z.string(),
    probability: z.number(),
    reward: z.number(),
  })).optional(),

  modelId: z.string(),
  generatedAt: z.string().datetime(),
});

export type RLOptimization = z.infer<typeof RLOptimizationSchema>;

/**
 * Causal Inference Analysis
 */
export const CausalAnalysisSchema = z.object({
  id: z.string(),
  analysisType: z.string(),
  tenantId: z.string(),

  // Cause-effect relationship
  cause: z.object({
    variable: z.string(),
    value: z.string(),
    changeType: z.enum(['increase', 'decrease', 'change']),
  }),

  effect: z.object({
    variable: z.string(),
    expectedChange: z.number(),
    unit: z.string(),
    confidence: z.number().min(0).max(100),
  }),

  // Causal strength
  causalEffect: z.number(),
  pValue: z.number(),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
    level: z.number(), // e.g., 95
  }),

  // Confounders and mediators
  confounders: z.array(z.object({
    variable: z.string(),
    impact: z.string(),
    controlled: z.boolean(),
  })),

  mediators: z.array(z.object({
    variable: z.string(),
    mediationEffect: z.number(),
    directEffect: z.number(),
    indirectEffect: z.number(),
  })).optional(),

  // Counterfactual analysis
  counterfactual: z.object({
    scenario: z.string(),
    predictedOutcome: z.number(),
    actualOutcome: z.number(),
    treatment Effect: z.number(),
  }).optional(),

  // Recommendations
  insights: z.array(z.string()),
  actionableRecommendations: z.array(z.object({
    recommendation: z.string(),
    expectedImpact: z.number(),
    confidence: z.number().min(0).max(100),
  })),

  // Methodology
  method: z.enum([
    'randomized_control_trial',
    'propensity_score_matching',
    'instrumental_variables',
    'difference_in_differences',
    'regression_discontinuity',
    'causal_forest',
  ]),

  modelId: z.string(),
  analyzedAt: z.string().datetime(),
});

export type CausalAnalysis = z.infer<typeof CausalAnalysisSchema>;

/**
 * Explainable AI (XAI) Output
 */
export const ExplainableAISchema = z.object({
  predictionId: z.string(),
  modelId: z.string(),

  // Prediction
  prediction: z.any(),
  confidence: z.number().min(0).max(100),

  // Feature importance
  featureImportance: z.array(z.object({
    feature: z.string(),
    importance: z.number(),
    contribution: z.number(), // To this specific prediction
    direction: z.enum(['positive', 'negative', 'neutral']),
  })),

  // SHAP values (SHapley Additive exPlanations)
  shapValues: z.array(z.object({
    feature: z.string(),
    shapValue: z.number(),
    baseValue: z.number(),
    featureValue: z.any(),
  })).optional(),

  // Local interpretable model
  localExplanation: z.string(),

  // Similar examples
  similarExamples: z.array(z.object({
    exampleId: z.string(),
    similarity: z.number(),
    outcome: z.any(),
    explanation: z.string(),
  })).optional(),

  // Counterfactual explanations
  counterfactuals: z.array(z.object({
    scenario: z.string(),
    changes: z.record(z.string(), z.any()),
    resultingPrediction: z.any(),
  })).optional(),

  // Plain language explanation
  humanExplanation: z.string(),

  // Confidence factors
  uncertaintyFactors: z.array(z.object({
    factor: z.string(),
    impact: z.string(),
  })).optional(),

  generatedAt: z.string().datetime(),
});

export type ExplainableAI = z.infer<typeof ExplainableAISchema>;
