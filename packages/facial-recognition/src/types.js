"use strict";
/**
 * Facial Recognition Types
 *
 * Comprehensive types for facial biometrics including detection, recognition,
 * age progression, emotion analysis, and advanced facial intelligence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceComparisonSchema = exports.FaceDatabaseQuerySchema = exports.FaceProfileSchema = exports.CrossAgeMatchSchema = exports.Face3DModelSchema = exports.DisguiseDetectionSchema = exports.FaceClusterSchema = exports.AgeProgressionSchema = exports.FaceEncodingSchema = exports.EmotionRecognitionSchema = exports.FacialAttributesSchema = exports.FaceDetectionSchema = void 0;
const zod_1 = require("zod");
const biometrics_1 = require("@intelgraph/biometrics");
// ============================================================================
// Face Detection
// ============================================================================
exports.FaceDetectionSchema = zod_1.z.object({
    faceId: zod_1.z.string().uuid(),
    boundingBox: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        width: zod_1.z.number(),
        height: zod_1.z.number()
    }),
    confidence: zod_1.z.number().min(0).max(1),
    landmarks: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'LEFT_EYE',
            'RIGHT_EYE',
            'NOSE_TIP',
            'LEFT_MOUTH_CORNER',
            'RIGHT_MOUTH_CORNER',
            'LEFT_EYE_OUTER',
            'LEFT_EYE_INNER',
            'RIGHT_EYE_INNER',
            'RIGHT_EYE_OUTER',
            'LEFT_EYEBROW_INNER',
            'LEFT_EYEBROW_OUTER',
            'RIGHT_EYEBROW_INNER',
            'RIGHT_EYEBROW_OUTER',
            'NOSE_BRIDGE',
            'NOSE_BASE',
            'CHIN',
            'JAW_LEFT',
            'JAW_RIGHT'
        ]),
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(1).optional()
    })),
    pose: zod_1.z.object({
        roll: zod_1.z.number(),
        pitch: zod_1.z.number(),
        yaw: zod_1.z.number()
    }),
    quality: biometrics_1.BiometricQualitySchema
});
// ============================================================================
// Facial Attributes
// ============================================================================
exports.FacialAttributesSchema = zod_1.z.object({
    age: zod_1.z.object({
        estimated: zod_1.z.number().int().min(0).max(120),
        range: zod_1.z.object({
            min: zod_1.z.number().int(),
            max: zod_1.z.number().int()
        }),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    gender: zod_1.z.object({
        value: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    ethnicity: zod_1.z.object({
        primary: zod_1.z.string(),
        probabilities: zod_1.z.record(zod_1.z.number()),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    facialHair: zod_1.z.object({
        beard: zod_1.z.boolean(),
        mustache: zod_1.z.boolean(),
        sideburns: zod_1.z.boolean(),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    glasses: zod_1.z.object({
        present: zod_1.z.boolean(),
        type: zod_1.z.enum(['NONE', 'EYEGLASSES', 'SUNGLASSES', 'READING']),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    headCovering: zod_1.z.object({
        present: zod_1.z.boolean(),
        type: zod_1.z.enum(['NONE', 'HAT', 'HIJAB', 'TURBAN', 'HOOD', 'HELMET', 'OTHER']),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    faceMask: zod_1.z.object({
        present: zod_1.z.boolean(),
        coverage: zod_1.z.enum(['NONE', 'PARTIAL', 'FULL']),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    makeup: zod_1.z.object({
        present: zod_1.z.boolean(),
        intensity: zod_1.z.enum(['NONE', 'LIGHT', 'MODERATE', 'HEAVY']),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    skinTone: zod_1.z.object({
        value: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    hairColor: zod_1.z.object({
        primary: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional(),
    eyeColor: zod_1.z.object({
        left: zod_1.z.string().optional(),
        right: zod_1.z.string().optional(),
        confidence: zod_1.z.number().min(0).max(1)
    }).optional()
});
// ============================================================================
// Emotion and Expression Recognition
// ============================================================================
exports.EmotionRecognitionSchema = zod_1.z.object({
    primary: zod_1.z.enum([
        'HAPPY',
        'SAD',
        'ANGRY',
        'SURPRISED',
        'DISGUSTED',
        'FEARFUL',
        'NEUTRAL',
        'CONTEMPT'
    ]),
    probabilities: zod_1.z.record(zod_1.z.number()),
    confidence: zod_1.z.number().min(0).max(1),
    intensity: zod_1.z.number().min(0).max(1),
    valence: zod_1.z.number().min(-1).max(1), // Positive to negative
    arousal: zod_1.z.number().min(0).max(1), // Calm to excited
    expressions: zod_1.z.object({
        smile: zod_1.z.number().min(0).max(1).optional(),
        frown: zod_1.z.number().min(0).max(1).optional(),
        eyebrowRaise: zod_1.z.number().min(0).max(1).optional(),
        eyebrowFurrow: zod_1.z.number().min(0).max(1).optional(),
        eyesClosed: zod_1.z.boolean().optional(),
        mouthOpen: zod_1.z.boolean().optional(),
        headTilt: zod_1.z.number().optional()
    }).optional()
});
// ============================================================================
// Face Recognition and Encoding
// ============================================================================
exports.FaceEncodingSchema = zod_1.z.object({
    encodingId: zod_1.z.string().uuid(),
    algorithm: zod_1.z.enum([
        'FACENET',
        'ARCFACE',
        'DLIB',
        'OPENFACE',
        'DEEPFACE',
        'INSIGHTFACE',
        'VGG_FACE',
        'FACE_RECOGNITION'
    ]),
    version: zod_1.z.string(),
    vector: zod_1.z.array(zod_1.z.number()),
    dimensions: zod_1.z.number().int().positive(),
    normalized: zod_1.z.boolean(),
    quality: biometrics_1.BiometricQualitySchema,
    metadata: zod_1.z.object({
        extractionTime: zod_1.z.number(),
        imageSize: zod_1.z.object({
            width: zod_1.z.number(),
            height: zod_1.z.number()
        }).optional(),
        cropRegion: zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            width: zod_1.z.number(),
            height: zod_1.z.number()
        }).optional()
    }).optional()
});
// ============================================================================
// Age Progression and Regression
// ============================================================================
exports.AgeProgressionSchema = zod_1.z.object({
    sourceAge: zod_1.z.number().int().min(0),
    targetAge: zod_1.z.number().int().min(0),
    sourceImage: zod_1.z.string(), // Base64 or URL
    progressedImage: zod_1.z.string(), // Base64 or URL
    method: zod_1.z.enum(['GAN', 'NEURAL_STYLE', 'MORPHING', 'TEMPLATE_BASED']),
    confidence: zod_1.z.number().min(0).max(1),
    accuracy: zod_1.z.number().min(0).max(1).optional(),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        modelVersion: zod_1.z.string(),
        intermediateAges: zod_1.z.array(zod_1.z.number()).optional()
    }).optional()
});
// ============================================================================
// Face Clustering
// ============================================================================
exports.FaceClusterSchema = zod_1.z.object({
    clusterId: zod_1.z.string().uuid(),
    faceIds: zod_1.z.array(zod_1.z.string().uuid()),
    centroid: zod_1.z.array(zod_1.z.number()),
    size: zod_1.z.number().int().positive(),
    cohesion: zod_1.z.number().min(0).max(1),
    representative: zod_1.z.string().uuid().optional(), // Representative face ID
    metadata: zod_1.z.object({
        averageAge: zod_1.z.number().optional(),
        gender: zod_1.z.string().optional(),
        locations: zod_1.z.array(zod_1.z.string()).optional(),
        timeRange: zod_1.z.object({
            start: zod_1.z.string().datetime(),
            end: zod_1.z.string().datetime()
        }).optional()
    }).optional()
});
// ============================================================================
// Disguise and Occlusion Detection
// ============================================================================
exports.DisguiseDetectionSchema = zod_1.z.object({
    disguised: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    disguiseTypes: zod_1.z.array(zod_1.z.enum([
        'SUNGLASSES',
        'MASK',
        'SCARF',
        'HEAVY_MAKEUP',
        'WIG',
        'FAKE_BEARD',
        'PROSTHETICS',
        'FACE_PAINT',
        'PLASTIC_SURGERY',
        'OTHER'
    ])),
    occlusionMap: zod_1.z.object({
        forehead: zod_1.z.number().min(0).max(1),
        eyes: zod_1.z.number().min(0).max(1),
        nose: zod_1.z.number().min(0).max(1),
        mouth: zod_1.z.number().min(0).max(1),
        chin: zod_1.z.number().min(0).max(1),
        cheeks: zod_1.z.number().min(0).max(1)
    }),
    affectsRecognition: zod_1.z.boolean(),
    estimatedImpact: zod_1.z.number().min(0).max(1)
});
// ============================================================================
// 3D Face Reconstruction
// ============================================================================
exports.Face3DModelSchema = zod_1.z.object({
    modelId: zod_1.z.string().uuid(),
    format: zod_1.z.enum(['OBJ', 'PLY', 'STL', 'FBX', 'GLTF']),
    vertices: zod_1.z.array(zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        z: zod_1.z.number()
    })),
    faces: zod_1.z.array(zod_1.z.array(zod_1.z.number().int())),
    texture: zod_1.z.string().optional(), // Base64 or URL
    normals: zod_1.z.array(zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        z: zod_1.z.number()
    })).optional(),
    metadata: zod_1.z.object({
        reconstructionMethod: zod_1.z.enum(['PHOTOGRAMMETRY', 'STEREO', 'DEPTH_SENSOR', 'SINGLE_IMAGE']),
        accuracy: zod_1.z.number().min(0).max(1),
        sourceImages: zod_1.z.number().int().optional()
    }).optional()
});
// ============================================================================
// Cross-Age Face Matching
// ============================================================================
exports.CrossAgeMatchSchema = zod_1.z.object({
    matchId: zod_1.z.string().uuid(),
    probe: zod_1.z.object({
        faceId: zod_1.z.string().uuid(),
        age: zod_1.z.number().int(),
        captureDate: zod_1.z.string().datetime()
    }),
    candidate: zod_1.z.object({
        faceId: zod_1.z.string().uuid(),
        age: zod_1.z.number().int(),
        captureDate: zod_1.z.string().datetime()
    }),
    ageDifference: zod_1.z.number().int(),
    baselineScore: zod_1.z.number().min(0).max(100),
    ageCompensatedScore: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    isMatch: zod_1.z.boolean(),
    method: zod_1.z.enum(['AGE_INVARIANT_MODEL', 'AGE_PROGRESSION', 'FEATURE_COMPENSATION']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
// ============================================================================
// Comprehensive Face Profile
// ============================================================================
exports.FaceProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().uuid(),
    detection: exports.FaceDetectionSchema,
    encoding: exports.FaceEncodingSchema,
    attributes: exports.FacialAttributesSchema,
    emotion: exports.EmotionRecognitionSchema.optional(),
    liveness: biometrics_1.LivenessAssessmentSchema.optional(),
    disguise: exports.DisguiseDetectionSchema.optional(),
    model3d: exports.Face3DModelSchema.optional(),
    quality: biometrics_1.BiometricQualitySchema,
    sourceImage: zod_1.z.object({
        id: zod_1.z.string(),
        url: zod_1.z.string().optional(),
        format: zod_1.z.string(),
        width: zod_1.z.number().int(),
        height: zod_1.z.number().int(),
        captureDate: zod_1.z.string().datetime(),
        captureDevice: zod_1.z.string().optional(),
        location: zod_1.z.object({
            latitude: zod_1.z.number().optional(),
            longitude: zod_1.z.number().optional(),
            address: zod_1.z.string().optional()
        }).optional()
    }),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    processingTime: zod_1.z.number(),
    timestamp: zod_1.z.string().datetime()
});
// ============================================================================
// Face Database Operations
// ============================================================================
exports.FaceDatabaseQuerySchema = zod_1.z.object({
    queryId: zod_1.z.string().uuid(),
    encoding: exports.FaceEncodingSchema,
    threshold: zod_1.z.number().min(0).max(100).default(70),
    maxResults: zod_1.z.number().int().positive().default(10),
    filters: zod_1.z.object({
        ageRange: zod_1.z.object({
            min: zod_1.z.number().int().optional(),
            max: zod_1.z.number().int().optional()
        }).optional(),
        gender: zod_1.z.array(zod_1.z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'])).optional(),
        dateRange: zod_1.z.object({
            start: zod_1.z.string().datetime(),
            end: zod_1.z.string().datetime()
        }).optional(),
        locations: zod_1.z.array(zod_1.z.string()).optional(),
        minQuality: zod_1.z.number().min(0).max(100).optional(),
        clusterId: zod_1.z.string().uuid().optional()
    }).optional(),
    sortBy: zod_1.z.enum(['SCORE', 'DATE', 'QUALITY']).default('SCORE'),
    includeLowQuality: zod_1.z.boolean().default(false)
});
// ============================================================================
// Face Comparison
// ============================================================================
exports.FaceComparisonSchema = zod_1.z.object({
    comparisonId: zod_1.z.string().uuid(),
    face1: exports.FaceEncodingSchema,
    face2: exports.FaceEncodingSchema,
    similarityScore: zod_1.z.number().min(0).max(100),
    distance: zod_1.z.number().nonnegative(),
    threshold: zod_1.z.number(),
    isMatch: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    method: zod_1.z.enum(['EUCLIDEAN', 'COSINE', 'MANHATTAN', 'MAHALANOBIS']),
    componentScores: zod_1.z.object({
        eyes: zod_1.z.number().optional(),
        nose: zod_1.z.number().optional(),
        mouth: zod_1.z.number().optional(),
        jawline: zod_1.z.number().optional(),
        overall: zod_1.z.number()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    timestamp: zod_1.z.string().datetime()
});
