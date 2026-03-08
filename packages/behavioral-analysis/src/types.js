"use strict";
/**
 * Behavioral Analysis Types
 *
 * Comprehensive types for behavioral biometrics including gait analysis,
 * keystroke dynamics, mouse patterns, and behavioral profiling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralAnomalySchema = exports.ActivityPatternSchema = exports.BehavioralProfileSchema = exports.WritingStyleSchema = exports.VoiceProfileSchema = exports.SignatureProfileSchema = exports.SignatureStrokeSchema = exports.TouchProfileSchema = exports.TouchEventSchema = exports.MouseProfileSchema = exports.MouseEventSchema = exports.KeystrokeProfileSchema = exports.KeystrokeEventSchema = exports.GaitSignatureSchema = exports.GaitFeatureSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Gait Analysis
// ============================================================================
exports.GaitFeatureSchema = zod_1.z.object({
    featureId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    spatialFeatures: zod_1.z.object({
        strideLength: zod_1.z.number(),
        stepWidth: zod_1.z.number(),
        stepLength: zod_1.z.number(),
        cadence: zod_1.z.number(),
        velocity: zod_1.z.number(),
        acceleration: zod_1.z.number()
    }),
    temporalFeatures: zod_1.z.object({
        swingTime: zod_1.z.number(),
        stanceTime: zod_1.z.number(),
        doubleSupportTime: zod_1.z.number(),
        singleSupportTime: zod_1.z.number(),
        stepTime: zod_1.z.number()
    }),
    kinematicFeatures: zod_1.z.object({
        hipAngle: zod_1.z.number(),
        kneeAngle: zod_1.z.number(),
        ankleAngle: zod_1.z.number(),
        trunkTilt: zod_1.z.number(),
        armSwing: zod_1.z.number()
    }),
    silhouetteFeatures: zod_1.z.object({
        height: zod_1.z.number(),
        width: zod_1.z.number(),
        aspectRatio: zod_1.z.number(),
        centroidPath: zod_1.z.array(zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }))
    }).optional(),
    quality: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1)
});
exports.GaitSignatureSchema = zod_1.z.object({
    signatureId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    features: zod_1.z.array(exports.GaitFeatureSchema),
    summary: zod_1.z.object({
        averageVelocity: zod_1.z.number(),
        averageCadence: zod_1.z.number(),
        gaitPattern: zod_1.z.enum(['NORMAL', 'LIMPING', 'SHUFFLING', 'RUNNING', 'HURRIED', 'CASUAL']),
        asymmetry: zod_1.z.number().min(0).max(1),
        stability: zod_1.z.number().min(0).max(1)
    }),
    conditions: zod_1.z.object({
        surface: zod_1.z.enum(['FLAT', 'INCLINE', 'DECLINE', 'STAIRS', 'UNEVEN']).optional(),
        footwear: zod_1.z.string().optional(),
        carrying: zod_1.z.boolean().optional(),
        crowdDensity: zod_1.z.enum(['EMPTY', 'SPARSE', 'MODERATE', 'DENSE']).optional()
    }).optional(),
    captureInfo: zod_1.z.object({
        duration: zod_1.z.number(),
        distance: zod_1.z.number(),
        viewAngle: zod_1.z.number(),
        cameraHeight: zod_1.z.number().optional(),
        resolution: zod_1.z.string().optional()
    }),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Keystroke Dynamics
// ============================================================================
exports.KeystrokeEventSchema = zod_1.z.object({
    key: zod_1.z.string(),
    keyCode: zod_1.z.number().int(),
    timestamp: zod_1.z.number(),
    pressTime: zod_1.z.number(),
    releaseTime: zod_1.z.number(),
    dwellTime: zod_1.z.number(), // Time key is held down
    flightTime: zod_1.z.number().optional(), // Time between key releases
    pressure: zod_1.z.number().min(0).max(1).optional()
});
exports.KeystrokeProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    sessionId: zod_1.z.string().uuid(),
    events: zod_1.z.array(exports.KeystrokeEventSchema),
    statistics: zod_1.z.object({
        averageDwellTime: zod_1.z.number(),
        dwellTimeStdDev: zod_1.z.number(),
        averageFlightTime: zod_1.z.number(),
        flightTimeStdDev: zod_1.z.number(),
        typingSpeed: zod_1.z.number(), // WPM
        errorRate: zod_1.z.number().min(0).max(1),
        backspaceFrequency: zod_1.z.number(),
        pausePatterns: zod_1.z.array(zod_1.z.object({
            duration: zod_1.z.number(),
            frequency: zod_1.z.number()
        }))
    }),
    digraphs: zod_1.z.array(zod_1.z.object({
        pair: zod_1.z.string(),
        latency: zod_1.z.number(),
        frequency: zod_1.z.number()
    })).optional(),
    trigraphs: zod_1.z.array(zod_1.z.object({
        triple: zod_1.z.string(),
        latency: zod_1.z.number(),
        frequency: zod_1.z.number()
    })).optional(),
    metadata: zod_1.z.object({
        keyboard: zod_1.z.string().optional(),
        language: zod_1.z.string().optional(),
        device: zod_1.z.string().optional(),
        captureDate: zod_1.z.string().datetime()
    }).optional()
});
// ============================================================================
// Mouse Movement Patterns
// ============================================================================
exports.MouseEventSchema = zod_1.z.object({
    type: zod_1.z.enum(['MOVE', 'CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'SCROLL', 'DRAG']),
    timestamp: zod_1.z.number(),
    x: zod_1.z.number(),
    y: zod_1.z.number(),
    velocity: zod_1.z.number().optional(),
    acceleration: zod_1.z.number().optional(),
    pressure: zod_1.z.number().min(0).max(1).optional(),
    button: zod_1.z.number().int().optional()
});
exports.MouseProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    sessionId: zod_1.z.string().uuid(),
    events: zod_1.z.array(exports.MouseEventSchema),
    statistics: zod_1.z.object({
        averageVelocity: zod_1.z.number(),
        velocityStdDev: zod_1.z.number(),
        averageAcceleration: zod_1.z.number(),
        accelerationStdDev: zod_1.z.number(),
        clickRate: zod_1.z.number(),
        doubleClickSpeed: zod_1.z.number(),
        scrollSpeed: zod_1.z.number(),
        movementSmothness: zod_1.z.number().min(0).max(1),
        curvature: zod_1.z.number(),
        angularVelocity: zod_1.z.number()
    }),
    patterns: zod_1.z.object({
        preferredDirection: zod_1.z.number(), // Angle in degrees
        movementStyle: zod_1.z.enum(['SMOOTH', 'JERKY', 'PRECISE', 'ERRATIC']),
        clickPatterns: zod_1.z.array(zod_1.z.string()),
        idleTime: zod_1.z.number(),
        activeRegions: zod_1.z.array(zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            width: zod_1.z.number(),
            height: zod_1.z.number(),
            frequency: zod_1.z.number()
        }))
    }).optional(),
    metadata: zod_1.z.object({
        screenResolution: zod_1.z.string().optional(),
        device: zod_1.z.string().optional(),
        captureDate: zod_1.z.string().datetime()
    }).optional()
});
// ============================================================================
// Touch Screen Behavior
// ============================================================================
exports.TouchEventSchema = zod_1.z.object({
    type: zod_1.z.enum(['TAP', 'DOUBLE_TAP', 'LONG_PRESS', 'SWIPE', 'PINCH', 'ROTATE']),
    timestamp: zod_1.z.number(),
    touches: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number().int(),
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        force: zod_1.z.number().min(0).max(1).optional(),
        radius: zod_1.z.number().optional()
    })),
    duration: zod_1.z.number(),
    velocity: zod_1.z.number().optional(),
    direction: zod_1.z.number().optional(), // Angle in degrees
    distance: zod_1.z.number().optional()
});
exports.TouchProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    sessionId: zod_1.z.string().uuid(),
    events: zod_1.z.array(exports.TouchEventSchema),
    statistics: zod_1.z.object({
        averagePressure: zod_1.z.number(),
        pressureStdDev: zod_1.z.number(),
        averageTapDuration: zod_1.z.number(),
        tapRate: zod_1.z.number(),
        swipeVelocity: zod_1.z.number(),
        touchSize: zod_1.z.number(),
        handedness: zod_1.z.enum(['LEFT', 'RIGHT', 'AMBIDEXTROUS', 'UNKNOWN'])
    }),
    patterns: zod_1.z.object({
        tapAccuracy: zod_1.z.number().min(0).max(1),
        multiTouchFrequency: zod_1.z.number(),
        gesturePreferences: zod_1.z.array(zod_1.z.string()),
        scrollingBehavior: zod_1.z.enum(['SLOW', 'MODERATE', 'FAST', 'FLINGING']),
        errorRate: zod_1.z.number().min(0).max(1)
    }).optional(),
    metadata: zod_1.z.object({
        deviceModel: zod_1.z.string().optional(),
        screenSize: zod_1.z.string().optional(),
        captureDate: zod_1.z.string().datetime()
    }).optional()
});
// ============================================================================
// Signature Dynamics
// ============================================================================
exports.SignatureStrokeSchema = zod_1.z.object({
    points: zod_1.z.array(zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        timestamp: zod_1.z.number(),
        pressure: zod_1.z.number().min(0).max(1).optional(),
        altitude: zod_1.z.number().optional(), // Pen angle
        azimuth: zod_1.z.number().optional() // Pen rotation
    })),
    velocity: zod_1.z.array(zod_1.z.number()),
    acceleration: zod_1.z.array(zod_1.z.number()),
    duration: zod_1.z.number()
});
exports.SignatureProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    strokes: zod_1.z.array(exports.SignatureStrokeSchema),
    features: zod_1.z.object({
        totalDuration: zod_1.z.number(),
        totalLength: zod_1.z.number(),
        averageVelocity: zod_1.z.number(),
        averagePressure: zod_1.z.number(),
        numberOfStrokes: zod_1.z.number().int(),
        penUps: zod_1.z.number().int(),
        aspectRatio: zod_1.z.number(),
        slant: zod_1.z.number(),
        baseline: zod_1.z.number()
    }),
    boundingBox: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        width: zod_1.z.number(),
        height: zod_1.z.number()
    }),
    image: zod_1.z.string().optional(), // Base64 encoded
    metadata: zod_1.z.object({
        device: zod_1.z.string().optional(),
        captureDate: zod_1.z.string().datetime()
    }).optional()
});
// ============================================================================
// Voice Patterns
// ============================================================================
exports.VoiceProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    features: zod_1.z.object({
        fundamentalFrequency: zod_1.z.number(),
        formants: zod_1.z.array(zod_1.z.number()),
        pitchRange: zod_1.z.object({
            min: zod_1.z.number(),
            max: zod_1.z.number(),
            mean: zod_1.z.number()
        }),
        speakingRate: zod_1.z.number(), // Words per minute
        articulationRate: zod_1.z.number(),
        pausePattern: zod_1.z.array(zod_1.z.object({
            duration: zod_1.z.number(),
            location: zod_1.z.enum(['INTRA_WORD', 'INTER_WORD', 'SENTENCE', 'PARAGRAPH'])
        })),
        intensity: zod_1.z.object({
            mean: zod_1.z.number(),
            stdDev: zod_1.z.number()
        }),
        jitter: zod_1.z.number(),
        shimmer: zod_1.z.number(),
        harmonicToNoiseRatio: zod_1.z.number()
    }),
    prosody: zod_1.z.object({
        intonation: zod_1.z.array(zod_1.z.number()),
        stress: zod_1.z.array(zod_1.z.number()),
        rhythm: zod_1.z.string(),
        tempo: zod_1.z.number()
    }).optional(),
    metadata: zod_1.z.object({
        duration: zod_1.z.number(),
        sampleRate: zod_1.z.number().int(),
        language: zod_1.z.string().optional(),
        accent: zod_1.z.string().optional(),
        recordingQuality: zod_1.z.number().min(0).max(100),
        captureDate: zod_1.z.string().datetime()
    }).optional()
});
// ============================================================================
// Writing Style Analysis
// ============================================================================
exports.WritingStyleSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid().optional(),
    stylometricFeatures: zod_1.z.object({
        averageSentenceLength: zod_1.z.number(),
        averageWordLength: zod_1.z.number(),
        vocabularyRichness: zod_1.z.number(),
        lexicalDensity: zod_1.z.number(),
        functionWordFrequency: zod_1.z.record(zod_1.z.number()),
        punctuationPattern: zod_1.z.record(zod_1.z.number()),
        capitalizationPattern: zod_1.z.string()
    }),
    syntacticFeatures: zod_1.z.object({
        posTagDistribution: zod_1.z.record(zod_1.z.number()),
        parseTreeDepth: zod_1.z.number(),
        dependencyPatterns: zod_1.z.array(zod_1.z.string())
    }).optional(),
    semanticFeatures: zod_1.z.object({
        topicDistribution: zod_1.z.record(zod_1.z.number()).optional(),
        sentiment: zod_1.z.object({
            polarity: zod_1.z.number().min(-1).max(1),
            subjectivity: zod_1.z.number().min(0).max(1)
        }).optional(),
        emotionProfile: zod_1.z.record(zod_1.z.number()).optional()
    }).optional(),
    idiosyncrasies: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        pattern: zod_1.z.string(),
        frequency: zod_1.z.number()
    })).optional(),
    metadata: zod_1.z.object({
        sampleSize: zod_1.z.number().int(),
        language: zod_1.z.string(),
        genre: zod_1.z.string().optional(),
        captureDate: zod_1.z.string().datetime()
    }).optional()
});
// ============================================================================
// Behavioral Profiling
// ============================================================================
exports.BehavioralProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid(),
    modalities: zod_1.z.object({
        gait: zod_1.z.array(exports.GaitSignatureSchema).optional(),
        keystroke: zod_1.z.array(exports.KeystrokeProfileSchema).optional(),
        mouse: zod_1.z.array(exports.MouseProfileSchema).optional(),
        touch: zod_1.z.array(exports.TouchProfileSchema).optional(),
        signature: zod_1.z.array(exports.SignatureProfileSchema).optional(),
        voice: zod_1.z.array(exports.VoiceProfileSchema).optional(),
        writing: zod_1.z.array(exports.WritingStyleSchema).optional()
    }),
    fusedProfile: zod_1.z.object({
        confidence: zod_1.z.number().min(0).max(1),
        distinctiveness: zod_1.z.number().min(0).max(1),
        consistency: zod_1.z.number().min(0).max(1),
        completeness: zod_1.z.number().min(0).max(1)
    }),
    temporalPatterns: zod_1.z.object({
        activityPeaks: zod_1.z.array(zod_1.z.object({
            hour: zod_1.z.number().int().min(0).max(23),
            frequency: zod_1.z.number()
        })),
        dayOfWeekPattern: zod_1.z.record(zod_1.z.number()),
        sessionDuration: zod_1.z.object({
            average: zod_1.z.number(),
            stdDev: zod_1.z.number()
        })
    }).optional(),
    metadata: zod_1.z.object({
        createdDate: zod_1.z.string().datetime(),
        lastUpdated: zod_1.z.string().datetime(),
        sampleCount: zod_1.z.number().int(),
        qualityScore: zod_1.z.number().min(0).max(100)
    })
});
// ============================================================================
// Activity Pattern Analysis
// ============================================================================
exports.ActivityPatternSchema = zod_1.z.object({
    patternId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid(),
    activities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        startTime: zod_1.z.string().datetime(),
        endTime: zod_1.z.string().datetime(),
        duration: zod_1.z.number(),
        location: zod_1.z.string().optional(),
        intensity: zod_1.z.enum(['LOW', 'MODERATE', 'HIGH']).optional(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional()
    })),
    patterns: zod_1.z.object({
        routines: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            frequency: zod_1.z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'IRREGULAR']),
            confidence: zod_1.z.number().min(0).max(1),
            description: zod_1.z.string()
        })),
        anomalies: zod_1.z.array(zod_1.z.object({
            timestamp: zod_1.z.string().datetime(),
            type: zod_1.z.string(),
            severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
            description: zod_1.z.string()
        }))
    }),
    temporalAnalysis: zod_1.z.object({
        periodicity: zod_1.z.array(zod_1.z.object({
            period: zod_1.z.string(),
            strength: zod_1.z.number().min(0).max(1)
        })),
        trends: zod_1.z.array(zod_1.z.object({
            variable: zod_1.z.string(),
            direction: zod_1.z.enum(['INCREASING', 'DECREASING', 'STABLE']),
            significance: zod_1.z.number().min(0).max(1)
        }))
    }).optional()
});
// ============================================================================
// Behavioral Anomaly Detection
// ============================================================================
exports.BehavioralAnomalySchema = zod_1.z.object({
    anomalyId: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid(),
    detectedAt: zod_1.z.string().datetime(),
    modality: zod_1.z.enum(['GAIT', 'KEYSTROKE', 'MOUSE', 'TOUCH', 'SIGNATURE', 'VOICE', 'WRITING', 'ACTIVITY']),
    anomalyType: zod_1.z.enum([
        'UNUSUAL_PATTERN',
        'PROFILE_DEVIATION',
        'TEMPORAL_ANOMALY',
        'STATISTICAL_OUTLIER',
        'BEHAVIORAL_SHIFT',
        'MULTIPLE_USERS'
    ]),
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    score: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    details: zod_1.z.object({
        deviationMetrics: zod_1.z.record(zod_1.z.number()),
        baselineComparison: zod_1.z.record(zod_1.z.unknown()),
        affectedFeatures: zod_1.z.array(zod_1.z.string())
    }),
    possibleCauses: zod_1.z.array(zod_1.z.string()).optional(),
    recommendations: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
