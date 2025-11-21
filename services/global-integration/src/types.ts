/**
 * Global Integration Type Definitions
 */

export type PartnerType = 'government' | 'business' | 'academia' | 'ngo';
export type IntegrationStatus = 'discovered' | 'analyzing' | 'generating' | 'testing' | 'active' | 'suspended';
export type ComplianceFramework = 'GDPR' | 'CCPA' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'NIST' | 'eIDAS' | 'X-Road';
export type MarketRegion = 'EU' | 'NA' | 'APAC' | 'LATAM' | 'MEA' | 'Nordic' | 'Baltic';

export interface GlobalPartner {
  id: string;
  name: string;
  type: PartnerType;
  region: MarketRegion;
  country: string;
  languageCode: string;
  apiEndpoint?: string;
  authMethod: 'oauth2' | 'x-road' | 'mtls' | 'api-key' | 'saml';
  complianceRequirements: ComplianceFramework[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  status: IntegrationStatus;
  discoveredAt: Date;
  activatedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface IntegrationLayer {
  id: string;
  partnerId: string;
  version: string;
  graphqlSchema: string;
  restOpenAPI: string;
  translationMappings: TranslationMapping[];
  compliancePolicy: string;
  rateLimits: RateLimitConfig;
  auditConfig: AuditConfig;
  generatedAt: Date;
}

export interface TranslationMapping {
  sourceField: string;
  targetField: string;
  sourceLocale: string;
  targetLocale: string;
  transformFn?: string;
  validationRule?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  quotaByTier: Record<string, number>;
}

export interface AuditConfig {
  logLevel: 'minimal' | 'standard' | 'detailed' | 'forensic';
  retentionDays: number;
  piiMasking: boolean;
  crossBorderLogging: boolean;
}

export interface MarketExpansionPlan {
  id: string;
  targetRegion: MarketRegion;
  targetCountries: string[];
  partnerTypes: PartnerType[];
  estimatedPartners: number;
  complianceRequirements: ComplianceFramework[];
  languagesRequired: string[];
  timeline: {
    discoveryPhase: Date;
    integrationPhase: Date;
    activationPhase: Date;
  };
  status: 'planning' | 'executing' | 'completed';
}

export interface DiscoveryResult {
  partners: GlobalPartner[];
  apiSpecs: APISpecification[];
  complianceGaps: ComplianceGap[];
  recommendations: IntegrationRecommendation[];
}

export interface APISpecification {
  partnerId: string;
  format: 'openapi' | 'graphql' | 'grpc' | 'soap' | 'x-road';
  version: string;
  endpoints: EndpointSpec[];
  authentication: AuthSpec;
  dataModels: DataModelSpec[];
}

export interface EndpointSpec {
  path: string;
  method: string;
  description: string;
  parameters: ParameterSpec[];
  responses: ResponseSpec[];
  requiredScopes: string[];
}

export interface ParameterSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: string;
}

export interface ResponseSpec {
  statusCode: number;
  schema: Record<string, unknown>;
  description: string;
}

export interface AuthSpec {
  type: string;
  flows?: Record<string, unknown>;
  scopes?: Record<string, string>;
}

export interface DataModelSpec {
  name: string;
  fields: FieldSpec[];
  piiFields: string[];
  classification: string;
}

export interface FieldSpec {
  name: string;
  type: string;
  required: boolean;
  pii: boolean;
  localized: boolean;
}

export interface ComplianceGap {
  partnerId: string;
  framework: ComplianceFramework;
  requirement: string;
  currentState: string;
  remediation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface IntegrationRecommendation {
  partnerId: string;
  type: 'optimize' | 'security' | 'compliance' | 'performance';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
}

export interface GlobalIntegrationConfig {
  autoDiscovery: boolean;
  autoGenerate: boolean;
  autoActivate: boolean;
  requireApproval: boolean;
  defaultComplianceLevel: 'minimum' | 'standard' | 'strict';
  supportedLanguages: string[];
  supportedRegions: MarketRegion[];
  xRoadEnabled: boolean;
  xRoadSecurityServer?: string;
}

export interface IntegrationMetrics {
  totalPartners: number;
  activeIntegrations: number;
  pendingApprovals: number;
  requestsToday: number;
  errorRate: number;
  avgLatencyMs: number;
  complianceScore: number;
  regionBreakdown: Record<MarketRegion, number>;
  partnerTypeBreakdown: Record<PartnerType, number>;
}
