import { z } from 'zod';

// Digital Service Categories
export const ServiceCategorySchema = z.enum([
  'identity',           // e-ID, digital signatures
  'voting',             // i-Voting systems
  'taxation',           // e-Tax filing
  'healthcare',         // e-Health records
  'education',          // e-School systems
  'business',           // e-Business registration
  'residency',          // e-Residency programs
  'governance',         // e-Governance portals
  'justice',            // e-Court, e-Justice
  'land_registry',      // Property registration
  'customs',            // e-Customs
  'social_services',    // Benefits, pensions
  'transportation',     // Vehicle registration, licenses
  'banking',            // Open banking, payments
  'cybersecurity',      // Security infrastructure
]);

export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

// Digital Service Definition
export const DigitalServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: ServiceCategorySchema,
  description: z.string(),
  sourceCountry: z.string().default('EE'), // Estonia as default
  version: z.string(),
  maturityLevel: z.enum(['pilot', 'production', 'legacy']),

  // Technical specifications
  techStack: z.object({
    backend: z.array(z.string()),
    frontend: z.array(z.string()),
    databases: z.array(z.string()),
    infrastructure: z.array(z.string()),
    security: z.array(z.string()),
  }),

  // Integration requirements
  integrations: z.array(z.object({
    name: z.string(),
    type: z.enum(['required', 'optional', 'recommended']),
    protocol: z.string(),
  })),

  // Compliance frameworks
  compliance: z.array(z.string()),

  // Dependencies on other services
  dependencies: z.array(z.string()),

  // Metrics
  metrics: z.object({
    activeUsers: z.number().optional(),
    transactionsPerYear: z.number().optional(),
    costSavingsEur: z.number().optional(),
    timeSavedHours: z.number().optional(),
  }).optional(),
});

export type DigitalService = z.infer<typeof DigitalServiceSchema>;

// Target Country Profile
export const CountryProfileSchema = z.object({
  code: z.string().length(2),
  name: z.string(),
  region: z.string(),
  population: z.number(),
  gdpPerCapita: z.number().optional(),

  // Existing digital infrastructure
  infrastructure: z.object({
    internetPenetration: z.number().min(0).max(100),
    mobileSubscriptions: z.number(),
    digitalLiteracy: z.enum(['low', 'medium', 'high']),
    existingEgov: z.array(z.string()),
  }),

  // Legal/regulatory environment
  regulatory: z.object({
    dataProtectionLaw: z.string().optional(),
    eSignatureLaw: z.boolean(),
    cloudPolicy: z.enum(['local_only', 'regional', 'flexible']),
    gdprCompliant: z.boolean(),
  }),

  // Language and localization
  localization: z.object({
    officialLanguages: z.array(z.string()),
    currencyCode: z.string(),
    dateFormat: z.string(),
    timezone: z.string(),
  }),

  // Priority areas for digitalization
  priorities: z.array(ServiceCategorySchema),
});

export type CountryProfile = z.infer<typeof CountryProfileSchema>;

// Export Package
export const ExportPackageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  targetCountry: CountryProfileSchema,
  services: z.array(z.object({
    service: DigitalServiceSchema,
    adaptations: z.array(z.string()),
    estimatedCost: z.number(),
    implementationMonths: z.number(),
  })),

  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
    countryPrefix: z.string(), // e.g., "m-" for Malta
  }),

  totalCost: z.number(),
  totalDuration: z.number(),
  createdAt: z.date(),
  status: z.enum(['draft', 'approved', 'in_progress', 'deployed']),
});

export type ExportPackage = z.infer<typeof ExportPackageSchema>;

// Adaptation Recommendation
export interface AdaptationRecommendation {
  serviceId: string;
  adaptationType: 'technical' | 'legal' | 'cultural' | 'infrastructure';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedEffort: number; // person-days
  dependencies: string[];
}

// Market Analysis
export interface MarketAnalysis {
  countryCode: string;
  readinessScore: number; // 0-100
  opportunityScore: number; // 0-100
  riskScore: number; // 0-100
  recommendedServices: ServiceCategory[];
  barriers: string[];
  enablers: string[];
  competitorPresence: string[];
  estimatedMarketSize: number;
}
