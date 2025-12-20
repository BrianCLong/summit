/**
 * Behavioral Analysis Types
 *
 * Comprehensive types for behavioral biometrics including gait analysis,
 * keystroke dynamics, mouse patterns, and behavioral profiling.
 */

import { z } from 'zod';

// ============================================================================
// Gait Analysis
// ============================================================================

export const GaitFeatureSchema = z.object({
  featureId: z.string().uuid(),
  timestamp: z.string().datetime(),
  spatialFeatures: z.object({
    strideLength: z.number(),
    stepWidth: z.number(),
    stepLength: z.number(),
    cadence: z.number(),
    velocity: z.number(),
    acceleration: z.number()
  }),
  temporalFeatures: z.object({
    swingTime: z.number(),
    stanceTime: z.number(),
    doubleSupportTime: z.number(),
    singleSupportTime: z.number(),
    stepTime: z.number()
  }),
  kinematicFeatures: z.object({
    hipAngle: z.number(),
    kneeAngle: z.number(),
    ankleAngle: z.number(),
    trunkTilt: z.number(),
    armSwing: z.number()
  }),
  silhouetteFeatures: z.object({
    height: z.number(),
    width: z.number(),
    aspectRatio: z.number(),
    centroidPath: z.array(z.object({ x: z.number(), y: z.number() }))
  }).optional(),
  quality: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1)
});

export type GaitFeature = z.infer<typeof GaitFeatureSchema>;

export const GaitSignatureSchema = z.object({
  signatureId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  features: z.array(GaitFeatureSchema),
  summary: z.object({
    averageVelocity: z.number(),
    averageCadence: z.number(),
    gaitPattern: z.enum(['NORMAL', 'LIMPING', 'SHUFFLING', 'RUNNING', 'HURRIED', 'CASUAL']),
    asymmetry: z.number().min(0).max(1),
    stability: z.number().min(0).max(1)
  }),
  conditions: z.object({
    surface: z.enum(['FLAT', 'INCLINE', 'DECLINE', 'STAIRS', 'UNEVEN']).optional(),
    footwear: z.string().optional(),
    carrying: z.boolean().optional(),
    crowdDensity: z.enum(['EMPTY', 'SPARSE', 'MODERATE', 'DENSE']).optional()
  }).optional(),
  captureInfo: z.object({
    duration: z.number(),
    distance: z.number(),
    viewAngle: z.number(),
    cameraHeight: z.number().optional(),
    resolution: z.string().optional()
  }),
  metadata: z.record(z.unknown()).optional()
});

export type GaitSignature = z.infer<typeof GaitSignatureSchema>;

// ============================================================================
// Keystroke Dynamics
// ============================================================================

export const KeystrokeEventSchema = z.object({
  key: z.string(),
  keyCode: z.number().int(),
  timestamp: z.number(),
  pressTime: z.number(),
  releaseTime: z.number(),
  dwellTime: z.number(), // Time key is held down
  flightTime: z.number().optional(), // Time between key releases
  pressure: z.number().min(0).max(1).optional()
});

export type KeystrokeEvent = z.infer<typeof KeystrokeEventSchema>;

export const KeystrokeProfileSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  events: z.array(KeystrokeEventSchema),
  statistics: z.object({
    averageDwellTime: z.number(),
    dwellTimeStdDev: z.number(),
    averageFlightTime: z.number(),
    flightTimeStdDev: z.number(),
    typingSpeed: z.number(), // WPM
    errorRate: z.number().min(0).max(1),
    backspaceFrequency: z.number(),
    pausePatterns: z.array(z.object({
      duration: z.number(),
      frequency: z.number()
    }))
  }),
  digraphs: z.array(z.object({
    pair: z.string(),
    latency: z.number(),
    frequency: z.number()
  })).optional(),
  trigraphs: z.array(z.object({
    triple: z.string(),
    latency: z.number(),
    frequency: z.number()
  })).optional(),
  metadata: z.object({
    keyboard: z.string().optional(),
    language: z.string().optional(),
    device: z.string().optional(),
    captureDate: z.string().datetime()
  }).optional()
});

export type KeystrokeProfile = z.infer<typeof KeystrokeProfileSchema>;

// ============================================================================
// Mouse Movement Patterns
// ============================================================================

export const MouseEventSchema = z.object({
  type: z.enum(['MOVE', 'CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'SCROLL', 'DRAG']),
  timestamp: z.number(),
  x: z.number(),
  y: z.number(),
  velocity: z.number().optional(),
  acceleration: z.number().optional(),
  pressure: z.number().min(0).max(1).optional(),
  button: z.number().int().optional()
});

export type MouseEvent = z.infer<typeof MouseEventSchema>;

export const MouseProfileSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  events: z.array(MouseEventSchema),
  statistics: z.object({
    averageVelocity: z.number(),
    velocityStdDev: z.number(),
    averageAcceleration: z.number(),
    accelerationStdDev: z.number(),
    clickRate: z.number(),
    doubleClickSpeed: z.number(),
    scrollSpeed: z.number(),
    movementSmothness: z.number().min(0).max(1),
    curvature: z.number(),
    angularVelocity: z.number()
  }),
  patterns: z.object({
    preferredDirection: z.number(), // Angle in degrees
    movementStyle: z.enum(['SMOOTH', 'JERKY', 'PRECISE', 'ERRATIC']),
    clickPatterns: z.array(z.string()),
    idleTime: z.number(),
    activeRegions: z.array(z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      frequency: z.number()
    }))
  }).optional(),
  metadata: z.object({
    screenResolution: z.string().optional(),
    device: z.string().optional(),
    captureDate: z.string().datetime()
  }).optional()
});

export type MouseProfile = z.infer<typeof MouseProfileSchema>;

// ============================================================================
// Touch Screen Behavior
// ============================================================================

export const TouchEventSchema = z.object({
  type: z.enum(['TAP', 'DOUBLE_TAP', 'LONG_PRESS', 'SWIPE', 'PINCH', 'ROTATE']),
  timestamp: z.number(),
  touches: z.array(z.object({
    id: z.number().int(),
    x: z.number(),
    y: z.number(),
    force: z.number().min(0).max(1).optional(),
    radius: z.number().optional()
  })),
  duration: z.number(),
  velocity: z.number().optional(),
  direction: z.number().optional(), // Angle in degrees
  distance: z.number().optional()
});

export type TouchEvent = z.infer<typeof TouchEventSchema>;

export const TouchProfileSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  events: z.array(TouchEventSchema),
  statistics: z.object({
    averagePressure: z.number(),
    pressureStdDev: z.number(),
    averageTapDuration: z.number(),
    tapRate: z.number(),
    swipeVelocity: z.number(),
    touchSize: z.number(),
    handedness: z.enum(['LEFT', 'RIGHT', 'AMBIDEXTROUS', 'UNKNOWN'])
  }),
  patterns: z.object({
    tapAccuracy: z.number().min(0).max(1),
    multiTouchFrequency: z.number(),
    gesturePreferences: z.array(z.string()),
    scrollingBehavior: z.enum(['SLOW', 'MODERATE', 'FAST', 'FLINGING']),
    errorRate: z.number().min(0).max(1)
  }).optional(),
  metadata: z.object({
    deviceModel: z.string().optional(),
    screenSize: z.string().optional(),
    captureDate: z.string().datetime()
  }).optional()
});

export type TouchProfile = z.infer<typeof TouchProfileSchema>;

// ============================================================================
// Signature Dynamics
// ============================================================================

export const SignatureStrokeSchema = z.object({
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
    timestamp: z.number(),
    pressure: z.number().min(0).max(1).optional(),
    altitude: z.number().optional(), // Pen angle
    azimuth: z.number().optional() // Pen rotation
  })),
  velocity: z.array(z.number()),
  acceleration: z.array(z.number()),
  duration: z.number()
});

export type SignatureStroke = z.infer<typeof SignatureStrokeSchema>;

export const SignatureProfileSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  strokes: z.array(SignatureStrokeSchema),
  features: z.object({
    totalDuration: z.number(),
    totalLength: z.number(),
    averageVelocity: z.number(),
    averagePressure: z.number(),
    numberOfStrokes: z.number().int(),
    penUps: z.number().int(),
    aspectRatio: z.number(),
    slant: z.number(),
    baseline: z.number()
  }),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  image: z.string().optional(), // Base64 encoded
  metadata: z.object({
    device: z.string().optional(),
    captureDate: z.string().datetime()
  }).optional()
});

export type SignatureProfile = z.infer<typeof SignatureProfileSchema>;

// ============================================================================
// Voice Patterns
// ============================================================================

export const VoiceProfileSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  features: z.object({
    fundamentalFrequency: z.number(),
    formants: z.array(z.number()),
    pitchRange: z.object({
      min: z.number(),
      max: z.number(),
      mean: z.number()
    }),
    speakingRate: z.number(), // Words per minute
    articulationRate: z.number(),
    pausePattern: z.array(z.object({
      duration: z.number(),
      location: z.enum(['INTRA_WORD', 'INTER_WORD', 'SENTENCE', 'PARAGRAPH'])
    })),
    intensity: z.object({
      mean: z.number(),
      stdDev: z.number()
    }),
    jitter: z.number(),
    shimmer: z.number(),
    harmonicToNoiseRatio: z.number()
  }),
  prosody: z.object({
    intonation: z.array(z.number()),
    stress: z.array(z.number()),
    rhythm: z.string(),
    tempo: z.number()
  }).optional(),
  metadata: z.object({
    duration: z.number(),
    sampleRate: z.number().int(),
    language: z.string().optional(),
    accent: z.string().optional(),
    recordingQuality: z.number().min(0).max(100),
    captureDate: z.string().datetime()
  }).optional()
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

// ============================================================================
// Writing Style Analysis
// ============================================================================

export const WritingStyleSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid().optional(),
  stylometricFeatures: z.object({
    averageSentenceLength: z.number(),
    averageWordLength: z.number(),
    vocabularyRichness: z.number(),
    lexicalDensity: z.number(),
    functionWordFrequency: z.record(z.number()),
    punctuationPattern: z.record(z.number()),
    capitalizationPattern: z.string()
  }),
  syntacticFeatures: z.object({
    posTagDistribution: z.record(z.number()),
    parseTreeDepth: z.number(),
    dependencyPatterns: z.array(z.string())
  }).optional(),
  semanticFeatures: z.object({
    topicDistribution: z.record(z.number()).optional(),
    sentiment: z.object({
      polarity: z.number().min(-1).max(1),
      subjectivity: z.number().min(0).max(1)
    }).optional(),
    emotionProfile: z.record(z.number()).optional()
  }).optional(),
  idiosyncrasies: z.array(z.object({
    type: z.string(),
    pattern: z.string(),
    frequency: z.number()
  })).optional(),
  metadata: z.object({
    sampleSize: z.number().int(),
    language: z.string(),
    genre: z.string().optional(),
    captureDate: z.string().datetime()
  }).optional()
});

export type WritingStyle = z.infer<typeof WritingStyleSchema>;

// ============================================================================
// Behavioral Profiling
// ============================================================================

export const BehavioralProfileSchema = z.object({
  profileId: z.string().uuid(),
  personId: z.string().uuid(),
  modalities: z.object({
    gait: z.array(GaitSignatureSchema).optional(),
    keystroke: z.array(KeystrokeProfileSchema).optional(),
    mouse: z.array(MouseProfileSchema).optional(),
    touch: z.array(TouchProfileSchema).optional(),
    signature: z.array(SignatureProfileSchema).optional(),
    voice: z.array(VoiceProfileSchema).optional(),
    writing: z.array(WritingStyleSchema).optional()
  }),
  fusedProfile: z.object({
    confidence: z.number().min(0).max(1),
    distinctiveness: z.number().min(0).max(1),
    consistency: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1)
  }),
  temporalPatterns: z.object({
    activityPeaks: z.array(z.object({
      hour: z.number().int().min(0).max(23),
      frequency: z.number()
    })),
    dayOfWeekPattern: z.record(z.number()),
    sessionDuration: z.object({
      average: z.number(),
      stdDev: z.number()
    })
  }).optional(),
  metadata: z.object({
    createdDate: z.string().datetime(),
    lastUpdated: z.string().datetime(),
    sampleCount: z.number().int(),
    qualityScore: z.number().min(0).max(100)
  })
});

export type BehavioralProfile = z.infer<typeof BehavioralProfileSchema>;

// ============================================================================
// Activity Pattern Analysis
// ============================================================================

export const ActivityPatternSchema = z.object({
  patternId: z.string().uuid(),
  personId: z.string().uuid(),
  activities: z.array(z.object({
    type: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    duration: z.number(),
    location: z.string().optional(),
    intensity: z.enum(['LOW', 'MODERATE', 'HIGH']).optional(),
    metadata: z.record(z.unknown()).optional()
  })),
  patterns: z.object({
    routines: z.array(z.object({
      name: z.string(),
      frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'IRREGULAR']),
      confidence: z.number().min(0).max(1),
      description: z.string()
    })),
    anomalies: z.array(z.object({
      timestamp: z.string().datetime(),
      type: z.string(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      description: z.string()
    }))
  }),
  temporalAnalysis: z.object({
    periodicity: z.array(z.object({
      period: z.string(),
      strength: z.number().min(0).max(1)
    })),
    trends: z.array(z.object({
      variable: z.string(),
      direction: z.enum(['INCREASING', 'DECREASING', 'STABLE']),
      significance: z.number().min(0).max(1)
    }))
  }).optional()
});

export type ActivityPattern = z.infer<typeof ActivityPatternSchema>;

// ============================================================================
// Behavioral Anomaly Detection
// ============================================================================

export const BehavioralAnomalySchema = z.object({
  anomalyId: z.string().uuid(),
  personId: z.string().uuid(),
  detectedAt: z.string().datetime(),
  modality: z.enum(['GAIT', 'KEYSTROKE', 'MOUSE', 'TOUCH', 'SIGNATURE', 'VOICE', 'WRITING', 'ACTIVITY']),
  anomalyType: z.enum([
    'UNUSUAL_PATTERN',
    'PROFILE_DEVIATION',
    'TEMPORAL_ANOMALY',
    'STATISTICAL_OUTLIER',
    'BEHAVIORAL_SHIFT',
    'MULTIPLE_USERS'
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  details: z.object({
    deviationMetrics: z.record(z.number()),
    baselineComparison: z.record(z.unknown()),
    affectedFeatures: z.array(z.string())
  }),
  possibleCauses: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type BehavioralAnomaly = z.infer<typeof BehavioralAnomalySchema>;
