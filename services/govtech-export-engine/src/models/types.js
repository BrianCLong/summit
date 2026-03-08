"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportPackageSchema = exports.CountryProfileSchema = exports.DigitalServiceSchema = exports.ServiceCategorySchema = void 0;
const zod_1 = require("zod");
// Digital Service Categories
exports.ServiceCategorySchema = zod_1.z.enum([
    'identity', // e-ID, digital signatures
    'voting', // i-Voting systems
    'taxation', // e-Tax filing
    'healthcare', // e-Health records
    'education', // e-School systems
    'business', // e-Business registration
    'residency', // e-Residency programs
    'governance', // e-Governance portals
    'justice', // e-Court, e-Justice
    'land_registry', // Property registration
    'customs', // e-Customs
    'social_services', // Benefits, pensions
    'transportation', // Vehicle registration, licenses
    'banking', // Open banking, payments
    'cybersecurity', // Security infrastructure
]);
// Digital Service Definition
exports.DigitalServiceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    category: exports.ServiceCategorySchema,
    description: zod_1.z.string(),
    sourceCountry: zod_1.z.string().default('EE'), // Estonia as default
    version: zod_1.z.string(),
    maturityLevel: zod_1.z.enum(['pilot', 'production', 'legacy']),
    // Technical specifications
    techStack: zod_1.z.object({
        backend: zod_1.z.array(zod_1.z.string()),
        frontend: zod_1.z.array(zod_1.z.string()),
        databases: zod_1.z.array(zod_1.z.string()),
        infrastructure: zod_1.z.array(zod_1.z.string()),
        security: zod_1.z.array(zod_1.z.string()),
    }),
    // Integration requirements
    integrations: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.enum(['required', 'optional', 'recommended']),
        protocol: zod_1.z.string(),
    })),
    // Compliance frameworks
    compliance: zod_1.z.array(zod_1.z.string()),
    // Dependencies on other services
    dependencies: zod_1.z.array(zod_1.z.string()),
    // Metrics
    metrics: zod_1.z.object({
        activeUsers: zod_1.z.number().optional(),
        transactionsPerYear: zod_1.z.number().optional(),
        costSavingsEur: zod_1.z.number().optional(),
        timeSavedHours: zod_1.z.number().optional(),
    }).optional(),
});
// Target Country Profile
exports.CountryProfileSchema = zod_1.z.object({
    code: zod_1.z.string().length(2),
    name: zod_1.z.string(),
    region: zod_1.z.string(),
    population: zod_1.z.number(),
    gdpPerCapita: zod_1.z.number().optional(),
    // Existing digital infrastructure
    infrastructure: zod_1.z.object({
        internetPenetration: zod_1.z.number().min(0).max(100),
        mobileSubscriptions: zod_1.z.number(),
        digitalLiteracy: zod_1.z.enum(['low', 'medium', 'high']),
        existingEgov: zod_1.z.array(zod_1.z.string()),
    }),
    // Legal/regulatory environment
    regulatory: zod_1.z.object({
        dataProtectionLaw: zod_1.z.string().optional(),
        eSignatureLaw: zod_1.z.boolean(),
        cloudPolicy: zod_1.z.enum(['local_only', 'regional', 'flexible']),
        gdprCompliant: zod_1.z.boolean(),
    }),
    // Language and localization
    localization: zod_1.z.object({
        officialLanguages: zod_1.z.array(zod_1.z.string()),
        currencyCode: zod_1.z.string(),
        dateFormat: zod_1.z.string(),
        timezone: zod_1.z.string(),
    }),
    // Priority areas for digitalization
    priorities: zod_1.z.array(exports.ServiceCategorySchema),
});
// Export Package
exports.ExportPackageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    targetCountry: exports.CountryProfileSchema,
    services: zod_1.z.array(zod_1.z.object({
        service: exports.DigitalServiceSchema,
        adaptations: zod_1.z.array(zod_1.z.string()),
        estimatedCost: zod_1.z.number(),
        implementationMonths: zod_1.z.number(),
    })),
    branding: zod_1.z.object({
        primaryColor: zod_1.z.string(),
        secondaryColor: zod_1.z.string(),
        logoUrl: zod_1.z.string().optional(),
        countryPrefix: zod_1.z.string(), // e.g., "m-" for Malta
    }),
    totalCost: zod_1.z.number(),
    totalDuration: zod_1.z.number(),
    createdAt: zod_1.z.date(),
    status: zod_1.z.enum(['draft', 'approved', 'in_progress', 'deployed']),
});
