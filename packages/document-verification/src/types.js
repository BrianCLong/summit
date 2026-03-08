"use strict";
/**
 * Document Verification Types
 *
 * Types for document authentication, forgery detection, MRZ parsing,
 * chip authentication, and cross-database validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForgeryAnalysisSchema = exports.DocumentVerificationSchema = exports.CrossDatabaseValidationSchema = exports.ValidationSourceSchema = exports.TamperDetectionSchema = exports.TemplateMatchResultSchema = exports.DocumentTemplateSchema = exports.ChipAuthenticationSchema = exports.ChipDataSchema = exports.AuthenticationResultSchema = exports.SecurityFeatureSchema = exports.MRZDataSchema = exports.DocumentRecordSchema = exports.DocumentType = void 0;
const zod_1 = require("zod");
// ============================================================================
// Document Types
// ============================================================================
var DocumentType;
(function (DocumentType) {
    DocumentType["PASSPORT"] = "PASSPORT";
    DocumentType["NATIONAL_ID"] = "NATIONAL_ID";
    DocumentType["DRIVERS_LICENSE"] = "DRIVERS_LICENSE";
    DocumentType["VISA"] = "VISA";
    DocumentType["RESIDENCE_PERMIT"] = "RESIDENCE_PERMIT";
    DocumentType["TRAVEL_DOCUMENT"] = "TRAVEL_DOCUMENT";
    DocumentType["MILITARY_ID"] = "MILITARY_ID";
    DocumentType["VOTER_ID"] = "VOTER_ID";
    DocumentType["HEALTH_CARD"] = "HEALTH_CARD";
    DocumentType["OTHER"] = "OTHER";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
// ============================================================================
// Document Record
// ============================================================================
exports.DocumentRecordSchema = zod_1.z.object({
    documentId: zod_1.z.string().uuid(),
    documentType: zod_1.z.nativeEnum(DocumentType),
    documentNumber: zod_1.z.string(),
    issuingCountry: zod_1.z.string(),
    issuingAuthority: zod_1.z.string().optional(),
    issueDate: zod_1.z.string(),
    expiryDate: zod_1.z.string(),
    holderData: zod_1.z.object({
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
        middleName: zod_1.z.string().optional(),
        fullName: zod_1.z.string(),
        dateOfBirth: zod_1.z.string(),
        placeOfBirth: zod_1.z.string().optional(),
        nationality: zod_1.z.string(),
        sex: zod_1.z.enum(['M', 'F', 'X', 'UNKNOWN']),
        height: zod_1.z.number().optional(),
        eyeColor: zod_1.z.string().optional()
    }),
    biometricData: zod_1.z.object({
        photo: zod_1.z.string().optional(), // Base64
        fingerprints: zod_1.z.array(zod_1.z.string()).optional(),
        signature: zod_1.z.string().optional()
    }).optional(),
    additionalData: zod_1.z.record(zod_1.z.unknown()).optional(),
    images: zod_1.z.object({
        front: zod_1.z.string().optional(),
        back: zod_1.z.string().optional(),
        portrait: zod_1.z.string().optional()
    }).optional(),
    metadata: zod_1.z.object({
        captureDate: zod_1.z.string().datetime(),
        captureDevice: zod_1.z.string().optional(),
        captureLocation: zod_1.z.string().optional()
    })
});
// ============================================================================
// MRZ (Machine Readable Zone)
// ============================================================================
exports.MRZDataSchema = zod_1.z.object({
    format: zod_1.z.enum(['TD1', 'TD2', 'TD3', 'MRVA', 'MRVB']),
    lines: zod_1.z.array(zod_1.z.string()),
    parsed: zod_1.z.object({
        documentType: zod_1.z.string(),
        documentNumber: zod_1.z.string(),
        issuingCountry: zod_1.z.string(),
        nationality: zod_1.z.string(),
        dateOfBirth: zod_1.z.string(),
        sex: zod_1.z.string(),
        expiryDate: zod_1.z.string(),
        surname: zod_1.z.string(),
        givenNames: zod_1.z.string(),
        optionalData1: zod_1.z.string().optional(),
        optionalData2: zod_1.z.string().optional(),
        checkDigits: zod_1.z.object({
            documentNumber: zod_1.z.string(),
            dateOfBirth: zod_1.z.string(),
            expiryDate: zod_1.z.string(),
            optionalData: zod_1.z.string().optional(),
            composite: zod_1.z.string().optional()
        })
    }),
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        error: zod_1.z.string(),
        severity: zod_1.z.enum(['ERROR', 'WARNING'])
    })).optional()
});
// ============================================================================
// Document Authentication
// ============================================================================
exports.SecurityFeatureSchema = zod_1.z.object({
    featureType: zod_1.z.enum([
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
    detected: zod_1.z.boolean(),
    authentic: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    details: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.AuthenticationResultSchema = zod_1.z.object({
    authenticationId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    authentic: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    overallScore: zod_1.z.number().min(0).max(100),
    securityFeatures: zod_1.z.array(exports.SecurityFeatureSchema),
    visualInspection: zod_1.z.object({
        printQuality: zod_1.z.number().min(0).max(100),
        colorAccuracy: zod_1.z.number().min(0).max(100),
        layoutCorrect: zod_1.z.boolean(),
        fontCorrect: zod_1.z.boolean(),
        issues: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    mrzValidation: zod_1.z.object({
        valid: zod_1.z.boolean(),
        checkDigitsValid: zod_1.z.boolean(),
        errors: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    templateMatching: zod_1.z.object({
        matched: zod_1.z.boolean(),
        confidence: zod_1.z.number().min(0).max(1),
        deviations: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    forgeryIndicators: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'PHOTO_SUBSTITUTION',
            'DATA_ALTERATION',
            'COUNTERFEIT',
            'FANTASY_DOCUMENT',
            'BLANK_DOCUMENT_THEFT',
            'CLONING'
        ]),
        detected: zod_1.z.boolean(),
        confidence: zod_1.z.number().min(0).max(1),
        details: zod_1.z.string().optional()
    })).optional(),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        algorithmVersion: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Chip Authentication (RFID/NFC)
// ============================================================================
exports.ChipDataSchema = zod_1.z.object({
    chipId: zod_1.z.string(),
    dataGroups: zod_1.z.object({
        dg1: zod_1.z.object({
            mrz: zod_1.z.string()
        }).optional(),
        dg2: zod_1.z.object({
            image: zod_1.z.string(),
            imageFormat: zod_1.z.string()
        }).optional(),
        dg3: zod_1.z.object({
            fingerprints: zod_1.z.array(zod_1.z.string())
        }).optional(),
        dg4: zod_1.z.object({
            irisImages: zod_1.z.array(zod_1.z.string())
        }).optional(),
        dg5: zod_1.z.object({
            portraitImage: zod_1.z.string()
        }).optional(),
        dg7: zod_1.z.object({
            signatureImage: zod_1.z.string()
        }).optional(),
        dg11: zod_1.z.object({
            additionalData: zod_1.z.record(zod_1.z.unknown())
        }).optional(),
        dg12: zod_1.z.object({
            documentData: zod_1.z.record(zod_1.z.unknown())
        }).optional(),
        dg13: zod_1.z.object({
            optionalData: zod_1.z.record(zod_1.z.unknown())
        }).optional(),
        dg14: zod_1.z.object({
            securityData: zod_1.z.record(zod_1.z.unknown())
        }).optional(),
        dg15: zod_1.z.object({
            publicKey: zod_1.z.string()
        }).optional()
    }),
    securityObject: zod_1.z.object({
        signed: zod_1.z.boolean(),
        signatureValid: zod_1.z.boolean(),
        certificateChain: zod_1.z.array(zod_1.z.string()).optional()
    }),
    activeAuthentication: zod_1.z.object({
        supported: zod_1.z.boolean(),
        passed: zod_1.z.boolean().optional()
    }).optional(),
    passiveAuthentication: zod_1.z.object({
        supported: zod_1.z.boolean(),
        passed: zod_1.z.boolean().optional()
    }).optional(),
    bac: zod_1.z.object({
        required: zod_1.z.boolean(),
        successful: zod_1.z.boolean().optional()
    }).optional(),
    pace: zod_1.z.object({
        supported: zod_1.z.boolean(),
        successful: zod_1.z.boolean().optional()
    }).optional()
});
exports.ChipAuthenticationSchema = zod_1.z.object({
    authenticationId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    chipData: exports.ChipDataSchema,
    authentic: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    validations: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'SIGNATURE_VERIFICATION',
            'CERTIFICATE_VALIDATION',
            'ACTIVE_AUTHENTICATION',
            'PASSIVE_AUTHENTICATION',
            'DATA_INTEGRITY',
            'CHIP_GENUINE'
        ]),
        passed: zod_1.z.boolean(),
        details: zod_1.z.string().optional()
    })),
    metadata: zod_1.z.object({
        readTime: zod_1.z.number(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Template Matching
// ============================================================================
exports.DocumentTemplateSchema = zod_1.z.object({
    templateId: zod_1.z.string().uuid(),
    documentType: zod_1.z.nativeEnum(DocumentType),
    issuingCountry: zod_1.z.string(),
    version: zod_1.z.string(),
    validFrom: zod_1.z.string(),
    validTo: zod_1.z.string().optional(),
    specifications: zod_1.z.object({
        dimensions: zod_1.z.object({
            width: zod_1.z.number(),
            height: zod_1.z.number(),
            unit: zod_1.z.enum(['MM', 'INCH'])
        }),
        layout: zod_1.z.record(zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            width: zod_1.z.number(),
            height: zod_1.z.number(),
            type: zod_1.z.string()
        })),
        securityFeatures: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            type: zod_1.z.string(),
            location: zod_1.z.object({
                x: zod_1.z.number(),
                y: zod_1.z.number()
            }).optional(),
            required: zod_1.z.boolean()
        })),
        colors: zod_1.z.array(zod_1.z.string()).optional(),
        fonts: zod_1.z.array(zod_1.z.string()).optional()
    }),
    referenceImages: zod_1.z.object({
        front: zod_1.z.string().optional(),
        back: zod_1.z.string().optional()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
exports.TemplateMatchResultSchema = zod_1.z.object({
    matchId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    templateId: zod_1.z.string().uuid(),
    matched: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    score: zod_1.z.number().min(0).max(100),
    fieldMatches: zod_1.z.array(zod_1.z.object({
        fieldName: zod_1.z.string(),
        expectedValue: zod_1.z.unknown().optional(),
        actualValue: zod_1.z.unknown(),
        matched: zod_1.z.boolean(),
        similarity: zod_1.z.number().min(0).max(1).optional()
    })),
    deviations: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['LAYOUT', 'COLOR', 'FONT', 'SECURITY_FEATURE', 'DIMENSION', 'OTHER']),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
        description: zod_1.z.string(),
        location: zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number()
        }).optional()
    })).optional(),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Tamper Detection
// ============================================================================
exports.TamperDetectionSchema = zod_1.z.object({
    detectionId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    tampered: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    tamperTypes: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
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
        detected: zod_1.z.boolean(),
        confidence: zod_1.z.number().min(0).max(1),
        location: zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            width: zod_1.z.number(),
            height: zod_1.z.number()
        }).optional(),
        evidence: zod_1.z.array(zod_1.z.string()).optional()
    })),
    forensicAnalysis: zod_1.z.object({
        illuminationAnalysis: zod_1.z.record(zod_1.z.unknown()).optional(),
        frequencyAnalysis: zod_1.z.record(zod_1.z.unknown()).optional(),
        noiseAnalysis: zod_1.z.record(zod_1.z.unknown()).optional(),
        compressionArtifacts: zod_1.z.boolean().optional()
    }).optional(),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Cross-Database Validation
// ============================================================================
exports.ValidationSourceSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    sourceName: zod_1.z.string(),
    sourceType: zod_1.z.enum([
        'ISSUING_AUTHORITY',
        'INTERPOL',
        'GOVERNMENT_DATABASE',
        'COMMERCIAL_DATABASE',
        'WATCHLIST'
    ]),
    priority: zod_1.z.number().int().min(1).max(10)
});
exports.CrossDatabaseValidationSchema = zod_1.z.object({
    validationId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    documentNumber: zod_1.z.string(),
    sources: zod_1.z.array(exports.ValidationSourceSchema),
    results: zod_1.z.array(zod_1.z.object({
        sourceId: zod_1.z.string(),
        found: zod_1.z.boolean(),
        valid: zod_1.z.boolean(),
        matchScore: zod_1.z.number().min(0).max(100).optional(),
        status: zod_1.z.enum([
            'VALID',
            'EXPIRED',
            'REVOKED',
            'REPORTED_LOST',
            'REPORTED_STOLEN',
            'FRAUDULENT',
            'NOT_FOUND'
        ]),
        additionalInfo: zod_1.z.record(zod_1.z.unknown()).optional(),
        responseTime: zod_1.z.number()
    })),
    consolidated: zod_1.z.object({
        valid: zod_1.z.boolean(),
        confidence: zod_1.z.number().min(0).max(1),
        status: zod_1.z.string(),
        flags: zod_1.z.array(zod_1.z.string()).optional()
    }),
    metadata: zod_1.z.object({
        totalResponseTime: zod_1.z.number(),
        timestamp: zod_1.z.string().datetime()
    })
});
// ============================================================================
// Comprehensive Document Verification
// ============================================================================
exports.DocumentVerificationSchema = zod_1.z.object({
    verificationId: zod_1.z.string().uuid(),
    document: exports.DocumentRecordSchema,
    mrz: exports.MRZDataSchema.optional(),
    authentication: exports.AuthenticationResultSchema,
    chipAuthentication: exports.ChipAuthenticationSchema.optional(),
    templateMatch: exports.TemplateMatchResultSchema.optional(),
    tamperDetection: exports.TamperDetectionSchema.optional(),
    crossDatabaseValidation: exports.CrossDatabaseValidationSchema.optional(),
    biometricExtraction: zod_1.z.object({
        faceExtracted: zod_1.z.boolean(),
        faceQuality: zod_1.z.number().min(0).max(100).optional(),
        fingerprintsExtracted: zod_1.z.boolean(),
        signatureExtracted: zod_1.z.boolean()
    }).optional(),
    overallResult: zod_1.z.object({
        verified: zod_1.z.boolean(),
        confidence: zod_1.z.number().min(0).max(1),
        score: zod_1.z.number().min(0).max(100),
        recommendation: zod_1.z.enum(['ACCEPT', 'REJECT', 'MANUAL_REVIEW']),
        issues: zod_1.z.array(zod_1.z.object({
            severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            category: zod_1.z.string(),
            description: zod_1.z.string()
        })).optional()
    }),
    metadata: zod_1.z.object({
        totalProcessingTime: zod_1.z.number(),
        verificationDate: zod_1.z.string().datetime(),
        verifiedBy: zod_1.z.string().optional(),
        location: zod_1.z.string().optional()
    })
});
// ============================================================================
// Document Forgery Detection
// ============================================================================
exports.ForgeryAnalysisSchema = zod_1.z.object({
    analysisId: zod_1.z.string().uuid(),
    documentId: zod_1.z.string().uuid(),
    forgeryLikelihood: zod_1.z.number().min(0).max(1),
    forgeryType: zod_1.z.enum([
        'GENUINE',
        'COUNTERFEIT',
        'ALTERED',
        'FANTASY',
        'SPECIMEN',
        'SIMULATED',
        'UNKNOWN'
    ]),
    detectionMethods: zod_1.z.array(zod_1.z.object({
        method: zod_1.z.string(),
        result: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1)
    })),
    forensicFindings: zod_1.z.array(zod_1.z.object({
        finding: zod_1.z.string(),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
        evidence: zod_1.z.string()
    })),
    expertReview: zod_1.z.object({
        required: zod_1.z.boolean(),
        reviewed: zod_1.z.boolean(),
        reviewerComments: zod_1.z.string().optional()
    }).optional(),
    metadata: zod_1.z.object({
        analysisDate: zod_1.z.string().datetime(),
        analyst: zod_1.z.string().optional()
    })
});
