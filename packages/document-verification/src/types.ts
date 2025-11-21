/**
 * Document Verification Types
 *
 * Types for document authentication, forgery detection, MRZ parsing,
 * chip authentication, and cross-database validation.
 */

import { z } from 'zod';

// ============================================================================
// Document Types
// ============================================================================

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  NATIONAL_ID = 'NATIONAL_ID',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VISA = 'VISA',
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
  TRAVEL_DOCUMENT = 'TRAVEL_DOCUMENT',
  MILITARY_ID = 'MILITARY_ID',
  VOTER_ID = 'VOTER_ID',
  HEALTH_CARD = 'HEALTH_CARD',
  OTHER = 'OTHER'
}

// ============================================================================
// Document Record
// ============================================================================

export const DocumentRecordSchema = z.object({
  documentId: z.string().uuid(),
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string(),
  issuingCountry: z.string(),
  issuingAuthority: z.string().optional(),
  issueDate: z.string(),
  expiryDate: z.string(),
  holderData: z.object({
    firstName: z.string(),
    lastName: z.string(),
    middleName: z.string().optional(),
    fullName: z.string(),
    dateOfBirth: z.string(),
    placeOfBirth: z.string().optional(),
    nationality: z.string(),
    sex: z.enum(['M', 'F', 'X', 'UNKNOWN']),
    height: z.number().optional(),
    eyeColor: z.string().optional()
  }),
  biometricData: z.object({
    photo: z.string().optional(), // Base64
    fingerprints: z.array(z.string()).optional(),
    signature: z.string().optional()
  }).optional(),
  additionalData: z.record(z.unknown()).optional(),
  images: z.object({
    front: z.string().optional(),
    back: z.string().optional(),
    portrait: z.string().optional()
  }).optional(),
  metadata: z.object({
    captureDate: z.string().datetime(),
    captureDevice: z.string().optional(),
    captureLocation: z.string().optional()
  })
});

export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;

// ============================================================================
// MRZ (Machine Readable Zone)
// ============================================================================

export const MRZDataSchema = z.object({
  format: z.enum(['TD1', 'TD2', 'TD3', 'MRVA', 'MRVB']),
  lines: z.array(z.string()),
  parsed: z.object({
    documentType: z.string(),
    documentNumber: z.string(),
    issuingCountry: z.string(),
    nationality: z.string(),
    dateOfBirth: z.string(),
    sex: z.string(),
    expiryDate: z.string(),
    surname: z.string(),
    givenNames: z.string(),
    optionalData1: z.string().optional(),
    optionalData2: z.string().optional(),
    checkDigits: z.object({
      documentNumber: z.string(),
      dateOfBirth: z.string(),
      expiryDate: z.string(),
      optionalData: z.string().optional(),
      composite: z.string().optional()
    })
  }),
  valid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    error: z.string(),
    severity: z.enum(['ERROR', 'WARNING'])
  })).optional()
});

export type MRZData = z.infer<typeof MRZDataSchema>;

// ============================================================================
// Document Authentication
// ============================================================================

export const SecurityFeatureSchema = z.object({
  featureType: z.enum([
    'WATERMARK',
    'HOLOGRAM',
    'UV_FEATURE',
    'IR_FEATURE',
    'MICROPRINTING',
    'KINEGRAM',
    'OVI',
    'LASER_ENGRAVING',
    'SECURITY_THREAD',
    'GHOST_IMAGE',
    'OPTICALLY_VARIABLE_DEVICE',
    'BARCODE',
    'QR_CODE',
    'RFID_CHIP',
    'TACTILE_FEATURES'
  ]),
  detected: z.boolean(),
  authentic: z.boolean(),
  confidence: z.number().min(0).max(1),
  details: z.record(z.unknown()).optional()
});

export type SecurityFeature = z.infer<typeof SecurityFeatureSchema>;

export const AuthenticationResultSchema = z.object({
  authenticationId: z.string().uuid(),
  documentId: z.string().uuid(),
  authentic: z.boolean(),
  confidence: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(100),
  securityFeatures: z.array(SecurityFeatureSchema),
  visualInspection: z.object({
    printQuality: z.number().min(0).max(100),
    colorAccuracy: z.number().min(0).max(100),
    layoutCorrect: z.boolean(),
    fontCorrect: z.boolean(),
    issues: z.array(z.string()).optional()
  }).optional(),
  mrzValidation: z.object({
    valid: z.boolean(),
    checkDigitsValid: z.boolean(),
    errors: z.array(z.string()).optional()
  }).optional(),
  templateMatching: z.object({
    matched: z.boolean(),
    confidence: z.number().min(0).max(1),
    deviations: z.array(z.string()).optional()
  }).optional(),
  forgeryIndicators: z.array(z.object({
    type: z.enum([
      'PHOTO_SUBSTITUTION',
      'DATA_ALTERATION',
      'COUNTERFEIT',
      'FANTASY_DOCUMENT',
      'BLANK_DOCUMENT_THEFT',
      'CLONING'
    ]),
    detected: z.boolean(),
    confidence: z.number().min(0).max(1),
    details: z.string().optional()
  })).optional(),
  metadata: z.object({
    processingTime: z.number(),
    algorithmVersion: z.string(),
    timestamp: z.string().datetime()
  })
});

export type AuthenticationResult = z.infer<typeof AuthenticationResultSchema>;

// ============================================================================
// Chip Authentication (RFID/NFC)
// ============================================================================

export const ChipDataSchema = z.object({
  chipId: z.string(),
  dataGroups: z.object({
    dg1: z.object({ // MRZ data
      mrz: z.string()
    }).optional(),
    dg2: z.object({ // Face image
      image: z.string(),
      imageFormat: z.string()
    }).optional(),
    dg3: z.object({ // Fingerprints
      fingerprints: z.array(z.string())
    }).optional(),
    dg4: z.object({ // Iris
      irisImages: z.array(z.string())
    }).optional(),
    dg5: z.object({ // Portrait
      portraitImage: z.string()
    }).optional(),
    dg7: z.object({ // Signature
      signatureImage: z.string()
    }).optional(),
    dg11: z.object({ // Additional personal details
      additionalData: z.record(z.unknown())
    }).optional(),
    dg12: z.object({ // Additional document details
      documentData: z.record(z.unknown())
    }).optional(),
    dg13: z.object({ // Optional details
      optionalData: z.record(z.unknown())
    }).optional(),
    dg14: z.object({ // Security options
      securityData: z.record(z.unknown())
    }).optional(),
    dg15: z.object({ // Active authentication public key
      publicKey: z.string()
    }).optional()
  }),
  securityObject: z.object({
    signed: z.boolean(),
    signatureValid: z.boolean(),
    certificateChain: z.array(z.string()).optional()
  }),
  activeAuthentication: z.object({
    supported: z.boolean(),
    passed: z.boolean().optional()
  }).optional(),
  passiveAuthentication: z.object({
    supported: z.boolean(),
    passed: z.boolean().optional()
  }).optional(),
  bac: z.object({ // Basic Access Control
    required: z.boolean(),
    successful: z.boolean().optional()
  }).optional(),
  pace: z.object({ // Password Authenticated Connection Establishment
    supported: z.boolean(),
    successful: z.boolean().optional()
  }).optional()
});

export type ChipData = z.infer<typeof ChipDataSchema>;

export const ChipAuthenticationSchema = z.object({
  authenticationId: z.string().uuid(),
  documentId: z.string().uuid(),
  chipData: ChipDataSchema,
  authentic: z.boolean(),
  confidence: z.number().min(0).max(1),
  validations: z.array(z.object({
    type: z.enum([
      'SIGNATURE_VERIFICATION',
      'CERTIFICATE_VALIDATION',
      'ACTIVE_AUTHENTICATION',
      'PASSIVE_AUTHENTICATION',
      'DATA_INTEGRITY',
      'CHIP_GENUINE'
    ]),
    passed: z.boolean(),
    details: z.string().optional()
  })),
  metadata: z.object({
    readTime: z.number(),
    timestamp: z.string().datetime()
  })
});

export type ChipAuthentication = z.infer<typeof ChipAuthenticationSchema>;

// ============================================================================
// Template Matching
// ============================================================================

export const DocumentTemplateSchema = z.object({
  templateId: z.string().uuid(),
  documentType: z.nativeEnum(DocumentType),
  issuingCountry: z.string(),
  version: z.string(),
  validFrom: z.string(),
  validTo: z.string().optional(),
  specifications: z.object({
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
      unit: z.enum(['MM', 'INCH'])
    }),
    layout: z.record(z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      type: z.string()
    })),
    securityFeatures: z.array(z.object({
      name: z.string(),
      type: z.string(),
      location: z.object({
        x: z.number(),
        y: z.number()
      }).optional(),
      required: z.boolean()
    })),
    colors: z.array(z.string()).optional(),
    fonts: z.array(z.string()).optional()
  }),
  referenceImages: z.object({
    front: z.string().optional(),
    back: z.string().optional()
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>;

export const TemplateMatchResultSchema = z.object({
  matchId: z.string().uuid(),
  documentId: z.string().uuid(),
  templateId: z.string().uuid(),
  matched: z.boolean(),
  confidence: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
  fieldMatches: z.array(z.object({
    fieldName: z.string(),
    expectedValue: z.unknown().optional(),
    actualValue: z.unknown(),
    matched: z.boolean(),
    similarity: z.number().min(0).max(1).optional()
  })),
  deviations: z.array(z.object({
    type: z.enum(['LAYOUT', 'COLOR', 'FONT', 'SECURITY_FEATURE', 'DIMENSION', 'OTHER']),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    description: z.string(),
    location: z.object({
      x: z.number(),
      y: z.number()
    }).optional()
  })).optional(),
  metadata: z.object({
    processingTime: z.number(),
    timestamp: z.string().datetime()
  })
});

export type TemplateMatchResult = z.infer<typeof TemplateMatchResultSchema>;

// ============================================================================
// Tamper Detection
// ============================================================================

export const TamperDetectionSchema = z.object({
  detectionId: z.string().uuid(),
  documentId: z.string().uuid(),
  tampered: z.boolean(),
  confidence: z.number().min(0).max(1),
  tamperTypes: z.array(z.object({
    type: z.enum([
      'PHOTO_REPLACEMENT',
      'TEXT_ALTERATION',
      'DATE_MODIFICATION',
      'LAMINATE_SEPARATION',
      'ERASURE',
      'CHEMICAL_ALTERATION',
      'DIGITAL_MANIPULATION',
      'PHYSICAL_DAMAGE',
      'BLEACHING'
    ]),
    detected: z.boolean(),
    confidence: z.number().min(0).max(1),
    location: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional(),
    evidence: z.array(z.string()).optional()
  })),
  forensicAnalysis: z.object({
    illuminationAnalysis: z.record(z.unknown()).optional(),
    frequencyAnalysis: z.record(z.unknown()).optional(),
    noiseAnalysis: z.record(z.unknown()).optional(),
    compressionArtifacts: z.boolean().optional()
  }).optional(),
  metadata: z.object({
    processingTime: z.number(),
    timestamp: z.string().datetime()
  })
});

export type TamperDetection = z.infer<typeof TamperDetectionSchema>;

// ============================================================================
// Cross-Database Validation
// ============================================================================

export const ValidationSourceSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  sourceType: z.enum([
    'ISSUING_AUTHORITY',
    'INTERPOL',
    'GOVERNMENT_DATABASE',
    'COMMERCIAL_DATABASE',
    'WATCHLIST'
  ]),
  priority: z.number().int().min(1).max(10)
});

export type ValidationSource = z.infer<typeof ValidationSourceSchema>;

export const CrossDatabaseValidationSchema = z.object({
  validationId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentNumber: z.string(),
  sources: z.array(ValidationSourceSchema),
  results: z.array(z.object({
    sourceId: z.string(),
    found: z.boolean(),
    valid: z.boolean(),
    matchScore: z.number().min(0).max(100).optional(),
    status: z.enum([
      'VALID',
      'EXPIRED',
      'REVOKED',
      'REPORTED_LOST',
      'REPORTED_STOLEN',
      'FRAUDULENT',
      'NOT_FOUND'
    ]),
    additionalInfo: z.record(z.unknown()).optional(),
    responseTime: z.number()
  })),
  consolidated: z.object({
    valid: z.boolean(),
    confidence: z.number().min(0).max(1),
    status: z.string(),
    flags: z.array(z.string()).optional()
  }),
  metadata: z.object({
    totalResponseTime: z.number(),
    timestamp: z.string().datetime()
  })
});

export type CrossDatabaseValidation = z.infer<typeof CrossDatabaseValidationSchema>;

// ============================================================================
// Comprehensive Document Verification
// ============================================================================

export const DocumentVerificationSchema = z.object({
  verificationId: z.string().uuid(),
  document: DocumentRecordSchema,
  mrz: MRZDataSchema.optional(),
  authentication: AuthenticationResultSchema,
  chipAuthentication: ChipAuthenticationSchema.optional(),
  templateMatch: TemplateMatchResultSchema.optional(),
  tamperDetection: TamperDetectionSchema.optional(),
  crossDatabaseValidation: CrossDatabaseValidationSchema.optional(),
  biometricExtraction: z.object({
    faceExtracted: z.boolean(),
    faceQuality: z.number().min(0).max(100).optional(),
    fingerprintsExtracted: z.boolean(),
    signatureExtracted: z.boolean()
  }).optional(),
  overallResult: z.object({
    verified: z.boolean(),
    confidence: z.number().min(0).max(1),
    score: z.number().min(0).max(100),
    recommendation: z.enum(['ACCEPT', 'REJECT', 'MANUAL_REVIEW']),
    issues: z.array(z.object({
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      category: z.string(),
      description: z.string()
    })).optional()
  }),
  metadata: z.object({
    totalProcessingTime: z.number(),
    verificationDate: z.string().datetime(),
    verifiedBy: z.string().optional(),
    location: z.string().optional()
  })
});

export type DocumentVerification = z.infer<typeof DocumentVerificationSchema>;

// ============================================================================
// Document Forgery Detection
// ============================================================================

export const ForgeryAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  documentId: z.string().uuid(),
  forgeryLikelihood: z.number().min(0).max(1),
  forgeryType: z.enum([
    'GENUINE',
    'COUNTERFEIT',
    'ALTERED',
    'FANTASY',
    'SPECIMEN',
    'SIMULATED',
    'UNKNOWN'
  ]),
  detectionMethods: z.array(z.object({
    method: z.string(),
    result: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  forensicFindings: z.array(z.object({
    finding: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    evidence: z.string()
  })),
  expertReview: z.object({
    required: z.boolean(),
    reviewed: z.boolean(),
    reviewerComments: z.string().optional()
  }).optional(),
  metadata: z.object({
    analysisDate: z.string().datetime(),
    analyst: z.string().optional()
  })
});

export type ForgeryAnalysis = z.infer<typeof ForgeryAnalysisSchema>;
