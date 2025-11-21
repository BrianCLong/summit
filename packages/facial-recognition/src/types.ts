/**
 * Facial Recognition Types
 *
 * Comprehensive types for facial biometrics including detection, recognition,
 * age progression, emotion analysis, and advanced facial intelligence.
 */

import { z } from 'zod';
import { BiometricModality, BiometricQualitySchema, LivenessAssessmentSchema } from '@intelgraph/biometrics';

// ============================================================================
// Face Detection
// ============================================================================

export const FaceDetectionSchema = z.object({
  faceId: z.string().uuid(),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  confidence: z.number().min(0).max(1),
  landmarks: z.array(z.object({
    type: z.enum([
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
    x: z.number(),
    y: z.number(),
    confidence: z.number().min(0).max(1).optional()
  })),
  pose: z.object({
    roll: z.number(),
    pitch: z.number(),
    yaw: z.number()
  }),
  quality: BiometricQualitySchema
});

export type FaceDetection = z.infer<typeof FaceDetectionSchema>;

// ============================================================================
// Facial Attributes
// ============================================================================

export const FacialAttributesSchema = z.object({
  age: z.object({
    estimated: z.number().int().min(0).max(120),
    range: z.object({
      min: z.number().int(),
      max: z.number().int()
    }),
    confidence: z.number().min(0).max(1)
  }).optional(),
  gender: z.object({
    value: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
    confidence: z.number().min(0).max(1)
  }).optional(),
  ethnicity: z.object({
    primary: z.string(),
    probabilities: z.record(z.number()),
    confidence: z.number().min(0).max(1)
  }).optional(),
  facialHair: z.object({
    beard: z.boolean(),
    mustache: z.boolean(),
    sideburns: z.boolean(),
    confidence: z.number().min(0).max(1)
  }).optional(),
  glasses: z.object({
    present: z.boolean(),
    type: z.enum(['NONE', 'EYEGLASSES', 'SUNGLASSES', 'READING']),
    confidence: z.number().min(0).max(1)
  }).optional(),
  headCovering: z.object({
    present: z.boolean(),
    type: z.enum(['NONE', 'HAT', 'HIJAB', 'TURBAN', 'HOOD', 'HELMET', 'OTHER']),
    confidence: z.number().min(0).max(1)
  }).optional(),
  faceMask: z.object({
    present: z.boolean(),
    coverage: z.enum(['NONE', 'PARTIAL', 'FULL']),
    confidence: z.number().min(0).max(1)
  }).optional(),
  makeup: z.object({
    present: z.boolean(),
    intensity: z.enum(['NONE', 'LIGHT', 'MODERATE', 'HEAVY']),
    confidence: z.number().min(0).max(1)
  }).optional(),
  skinTone: z.object({
    value: z.string(),
    confidence: z.number().min(0).max(1)
  }).optional(),
  hairColor: z.object({
    primary: z.string(),
    confidence: z.number().min(0).max(1)
  }).optional(),
  eyeColor: z.object({
    left: z.string().optional(),
    right: z.string().optional(),
    confidence: z.number().min(0).max(1)
  }).optional()
});

export type FacialAttributes = z.infer<typeof FacialAttributesSchema>;

// ============================================================================
// Emotion and Expression Recognition
// ============================================================================

export const EmotionRecognitionSchema = z.object({
  primary: z.enum([
    'HAPPY',
    'SAD',
    'ANGRY',
    'SURPRISED',
    'DISGUSTED',
    'FEARFUL',
    'NEUTRAL',
    'CONTEMPT'
  ]),
  probabilities: z.record(z.number()),
  confidence: z.number().min(0).max(1),
  intensity: z.number().min(0).max(1),
  valence: z.number().min(-1).max(1), // Positive to negative
  arousal: z.number().min(0).max(1), // Calm to excited
  expressions: z.object({
    smile: z.number().min(0).max(1).optional(),
    frown: z.number().min(0).max(1).optional(),
    eyebrowRaise: z.number().min(0).max(1).optional(),
    eyebrowFurrow: z.number().min(0).max(1).optional(),
    eyesClosed: z.boolean().optional(),
    mouthOpen: z.boolean().optional(),
    headTilt: z.number().optional()
  }).optional()
});

export type EmotionRecognition = z.infer<typeof EmotionRecognitionSchema>;

// ============================================================================
// Face Recognition and Encoding
// ============================================================================

export const FaceEncodingSchema = z.object({
  encodingId: z.string().uuid(),
  algorithm: z.enum([
    'FACENET',
    'ARCFACE',
    'DLIB',
    'OPENFACE',
    'DEEPFACE',
    'INSIGHTFACE',
    'VGG_FACE',
    'FACE_RECOGNITION'
  ]),
  version: z.string(),
  vector: z.array(z.number()),
  dimensions: z.number().int().positive(),
  normalized: z.boolean(),
  quality: BiometricQualitySchema,
  metadata: z.object({
    extractionTime: z.number(),
    imageSize: z.object({
      width: z.number(),
      height: z.number()
    }).optional(),
    cropRegion: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional()
  }).optional()
});

export type FaceEncoding = z.infer<typeof FaceEncodingSchema>;

// ============================================================================
// Age Progression and Regression
// ============================================================================

export const AgeProgressionSchema = z.object({
  sourceAge: z.number().int().min(0),
  targetAge: z.number().int().min(0),
  sourceImage: z.string(), // Base64 or URL
  progressedImage: z.string(), // Base64 or URL
  method: z.enum(['GAN', 'NEURAL_STYLE', 'MORPHING', 'TEMPLATE_BASED']),
  confidence: z.number().min(0).max(1),
  accuracy: z.number().min(0).max(1).optional(),
  metadata: z.object({
    processingTime: z.number(),
    modelVersion: z.string(),
    intermediateAges: z.array(z.number()).optional()
  }).optional()
});

export type AgeProgression = z.infer<typeof AgeProgressionSchema>;

// ============================================================================
// Face Clustering
// ============================================================================

export const FaceClusterSchema = z.object({
  clusterId: z.string().uuid(),
  faceIds: z.array(z.string().uuid()),
  centroid: z.array(z.number()),
  size: z.number().int().positive(),
  cohesion: z.number().min(0).max(1),
  representative: z.string().uuid().optional(), // Representative face ID
  metadata: z.object({
    averageAge: z.number().optional(),
    gender: z.string().optional(),
    locations: z.array(z.string()).optional(),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional()
  }).optional()
});

export type FaceCluster = z.infer<typeof FaceClusterSchema>;

// ============================================================================
// Disguise and Occlusion Detection
// ============================================================================

export const DisguiseDetectionSchema = z.object({
  disguised: z.boolean(),
  confidence: z.number().min(0).max(1),
  disguiseTypes: z.array(z.enum([
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
  occlusionMap: z.object({
    forehead: z.number().min(0).max(1),
    eyes: z.number().min(0).max(1),
    nose: z.number().min(0).max(1),
    mouth: z.number().min(0).max(1),
    chin: z.number().min(0).max(1),
    cheeks: z.number().min(0).max(1)
  }),
  affectsRecognition: z.boolean(),
  estimatedImpact: z.number().min(0).max(1)
});

export type DisguiseDetection = z.infer<typeof DisguiseDetectionSchema>;

// ============================================================================
// 3D Face Reconstruction
// ============================================================================

export const Face3DModelSchema = z.object({
  modelId: z.string().uuid(),
  format: z.enum(['OBJ', 'PLY', 'STL', 'FBX', 'GLTF']),
  vertices: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  })),
  faces: z.array(z.array(z.number().int())),
  texture: z.string().optional(), // Base64 or URL
  normals: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  })).optional(),
  metadata: z.object({
    reconstructionMethod: z.enum(['PHOTOGRAMMETRY', 'STEREO', 'DEPTH_SENSOR', 'SINGLE_IMAGE']),
    accuracy: z.number().min(0).max(1),
    sourceImages: z.number().int().optional()
  }).optional()
});

export type Face3DModel = z.infer<typeof Face3DModelSchema>;

// ============================================================================
// Cross-Age Face Matching
// ============================================================================

export const CrossAgeMatchSchema = z.object({
  matchId: z.string().uuid(),
  probe: z.object({
    faceId: z.string().uuid(),
    age: z.number().int(),
    captureDate: z.string().datetime()
  }),
  candidate: z.object({
    faceId: z.string().uuid(),
    age: z.number().int(),
    captureDate: z.string().datetime()
  }),
  ageDifference: z.number().int(),
  baselineScore: z.number().min(0).max(100),
  ageCompensatedScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  isMatch: z.boolean(),
  method: z.enum(['AGE_INVARIANT_MODEL', 'AGE_PROGRESSION', 'FEATURE_COMPENSATION']),
  metadata: z.record(z.unknown()).optional()
});

export type CrossAgeMatch = z.infer<typeof CrossAgeMatchSchema>;

// ============================================================================
// Comprehensive Face Profile
// ============================================================================

export const FaceProfileSchema = z.object({
  profileId: z.string().uuid(),
  detection: FaceDetectionSchema,
  encoding: FaceEncodingSchema,
  attributes: FacialAttributesSchema,
  emotion: EmotionRecognitionSchema.optional(),
  liveness: LivenessAssessmentSchema.optional(),
  disguise: DisguiseDetectionSchema.optional(),
  model3d: Face3DModelSchema.optional(),
  quality: BiometricQualitySchema,
  sourceImage: z.object({
    id: z.string(),
    url: z.string().optional(),
    format: z.string(),
    width: z.number().int(),
    height: z.number().int(),
    captureDate: z.string().datetime(),
    captureDevice: z.string().optional(),
    location: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().optional()
    }).optional()
  }),
  metadata: z.record(z.unknown()).optional(),
  processingTime: z.number(),
  timestamp: z.string().datetime()
});

export type FaceProfile = z.infer<typeof FaceProfileSchema>;

// ============================================================================
// Face Database Operations
// ============================================================================

export const FaceDatabaseQuerySchema = z.object({
  queryId: z.string().uuid(),
  encoding: FaceEncodingSchema,
  threshold: z.number().min(0).max(100).default(70),
  maxResults: z.number().int().positive().default(10),
  filters: z.object({
    ageRange: z.object({
      min: z.number().int().optional(),
      max: z.number().int().optional()
    }).optional(),
    gender: z.array(z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'])).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    locations: z.array(z.string()).optional(),
    minQuality: z.number().min(0).max(100).optional(),
    clusterId: z.string().uuid().optional()
  }).optional(),
  sortBy: z.enum(['SCORE', 'DATE', 'QUALITY']).default('SCORE'),
  includeLowQuality: z.boolean().default(false)
});

export type FaceDatabaseQuery = z.infer<typeof FaceDatabaseQuerySchema>;

// ============================================================================
// Face Comparison
// ============================================================================

export const FaceComparisonSchema = z.object({
  comparisonId: z.string().uuid(),
  face1: FaceEncodingSchema,
  face2: FaceEncodingSchema,
  similarityScore: z.number().min(0).max(100),
  distance: z.number().nonnegative(),
  threshold: z.number(),
  isMatch: z.boolean(),
  confidence: z.number().min(0).max(1),
  method: z.enum(['EUCLIDEAN', 'COSINE', 'MANHATTAN', 'MAHALANOBIS']),
  componentScores: z.object({
    eyes: z.number().optional(),
    nose: z.number().optional(),
    mouth: z.number().optional(),
    jawline: z.number().optional(),
    overall: z.number()
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime()
});

export type FaceComparison = z.infer<typeof FaceComparisonSchema>;
