import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ============================================================================
  # ENUMS
  # ============================================================================

  enum DataAssetCategory {
    STRUCTURED
    UNSTRUCTURED
    GEOSPATIAL
    TIMESERIES
    GRAPH
    MEDIA
    SENSOR
    TRANSACTION
    BEHAVIORAL
    DEMOGRAPHIC
  }

  enum DataQualityLevel {
    RAW
    CLEANSED
    ENRICHED
    CURATED
    CERTIFIED
  }

  enum SensitivityLevel {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    RESTRICTED
    TOP_SECRET
  }

  enum ComplianceFramework {
    GDPR
    CCPA
    HIPAA
    SOC2
    ISO27001
    FEDRAMP
    PCI_DSS
    LGPD
    PIPEDA
  }

  enum ComplianceStatus {
    PENDING
    PASSED
    FAILED
    REQUIRES_REVIEW
  }

  enum PricingModel {
    ONE_TIME
    SUBSCRIPTION
    PAY_PER_USE
    TIERED
    REVENUE_SHARE
    FREEMIUM
    AUCTION
  }

  enum DeliveryMethod {
    API
    BULK_DOWNLOAD
    STREAMING
    DATABASE_LINK
    SFTP
    CLOUD_STORAGE
    EMBEDDED_ANALYTICS
  }

  enum AccessLevel {
    PREVIEW
    SAMPLE
    FULL
    AGGREGATED
    ANONYMIZED
  }

  enum ContractStatus {
    DRAFT
    PENDING_APPROVAL
    NEGOTIATION
    ACTIVE
    SUSPENDED
    TERMINATED
    EXPIRED
  }

  enum ContractType {
    DATA_LICENSE
    DATA_SHARING
    DATA_PROCESSING
    JOINT_CONTROLLER
    SUB_PROCESSOR
  }

  enum ListingStatus {
    DRAFT
    PENDING_REVIEW
    ACTIVE
    PAUSED
    SOLD_OUT
    EXPIRED
    REMOVED
  }

  enum TransactionType {
    PURCHASE
    SUBSCRIPTION
    USAGE
    REFUND
    ADJUSTMENT
  }

  enum TransactionStatus {
    PENDING
    COMPLETED
    FAILED
    REFUNDED
  }

  # ============================================================================
  # DATA ASSET TYPES
  # ============================================================================

  type DataAsset {
    id: ID!
    name: String!
    description: String
    category: DataAssetCategory!
    qualityLevel: DataQualityLevel!
    sensitivityLevel: SensitivityLevel!
    sourceSystem: String!
    schema: JSON
    metadata: AssetMetadata!
    tags: [String!]!
    owner: String!
    tenantId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    complianceChecks: [ComplianceCheck!]
    valuation: DataValuation
  }

  type AssetMetadata {
    recordCount: Int
    sizeBytes: Float
    lastUpdated: DateTime
    refreshFrequency: String
    dataLineage: [String!]
  }

  # ============================================================================
  # COMPLIANCE TYPES
  # ============================================================================

  type ComplianceCheck {
    id: ID!
    assetId: ID!
    framework: ComplianceFramework!
    status: ComplianceStatus!
    legalBasis: String
    piiDetected: [String!]!
    findings: [ComplianceFinding!]!
    consentRequirements: [String!]!
    crossBorderRestrictions: [String!]!
    anonymizationRequired: Boolean!
    retentionPolicy: RetentionPolicy
    checkedAt: DateTime!
    checkedBy: String!
    validUntil: DateTime
  }

  type ComplianceFinding {
    code: String!
    severity: String!
    description: String!
    recommendation: String
    field: String
  }

  type RetentionPolicy {
    maxRetentionDays: Int
    reviewDate: DateTime
    deletionRequired: Boolean!
  }

  type ComplianceSummary {
    overallStatus: String!
    passRate: Float!
    criticalFindings: Int!
    recommendations: [String!]!
  }

  # ============================================================================
  # DATA PRODUCT TYPES
  # ============================================================================

  type DataProduct {
    id: ID!
    name: String!
    description: String!
    shortDescription: String
    version: String!
    assets: [ID!]!
    category: DataAssetCategory!
    accessLevel: AccessLevel!
    pricing: ProductPricing!
    deliveryMethods: [DeliveryMethod!]!
    sla: ServiceLevelAgreement!
    complianceCertifications: [ComplianceFramework!]!
    targetAudiences: [String!]!
    useCases: [String!]!
    sampleDataUrl: String
    documentationUrl: String
    status: String!
    publishedAt: DateTime
    owner: String!
    tenantId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProductPricing {
    model: PricingModel!
    basePriceCents: Int!
    currency: String!
    tiers: [PricingTier!]
    revenueSharePercent: Float
  }

  type PricingTier {
    name: String!
    priceCents: Int!
    limits: JSON!
  }

  type ServiceLevelAgreement {
    availabilityPercent: Float!
    latencyMs: Int
    supportTier: String!
    refreshFrequency: String
  }

  # ============================================================================
  # CONTRACT TYPES
  # ============================================================================

  type DataContract {
    id: ID!
    contractNumber: String!
    type: ContractType!
    status: ContractStatus!
    productId: ID!
    providerId: String!
    providerName: String!
    consumerId: String!
    consumerName: String!
    terms: ContractTerms!
    pricing: ContractPricing!
    dataRights: DataRights!
    compliance: ContractCompliance!
    signatures: [Signature!]!
    amendments: [Amendment!]!
    documentText: String
    tenantId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ContractTerms {
    startDate: DateTime!
    endDate: DateTime
    autoRenewal: Boolean!
    renewalPeriodDays: Int
    terminationNoticeDays: Int!
  }

  type ContractPricing {
    totalValueCents: Int!
    currency: String!
    paymentTerms: String!
    billingFrequency: String!
  }

  type DataRights {
    allowedPurposes: [String!]!
    prohibitedUses: [String!]!
    geographicRestrictions: [String!]!
    sublicensing: Boolean!
    derivativeWorks: Boolean!
    attribution: Boolean!
    exclusivity: Boolean!
  }

  type ContractCompliance {
    frameworks: [ComplianceFramework!]!
    dataProtectionOfficer: String
    securityMeasures: [String!]!
    auditRights: Boolean!
    breachNotificationHours: Int!
  }

  type Signature {
    party: String!
    signedBy: String!
    signedAt: DateTime!
    ipAddress: String
  }

  type Amendment {
    id: ID!
    description: String!
    effectiveDate: DateTime!
    approvedAt: DateTime
  }

  # ============================================================================
  # MARKETPLACE TYPES
  # ============================================================================

  type MarketplaceListing {
    id: ID!
    productId: ID!
    title: String!
    headline: String!
    description: String!
    highlights: [String!]!
    status: ListingStatus!
    visibility: String!
    featuredUntil: DateTime
    analytics: ListingAnalytics!
    ratings: ListingRatings!
    media: [ListingMedia!]!
    categories: [String!]!
    tags: [String!]!
    tenantId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    publishedAt: DateTime
  }

  type ListingAnalytics {
    views: Int!
    inquiries: Int!
    purchases: Int!
    revenue: Float!
  }

  type ListingRatings {
    average: Float!
    count: Int!
  }

  type ListingMedia {
    type: String!
    url: String!
    caption: String
  }

  type MarketplaceSearchResult {
    listings: [MarketplaceListing!]!
    total: Int!
  }

  # ============================================================================
  # VALUATION TYPES
  # ============================================================================

  type DataValuation {
    id: ID!
    assetId: ID!
    estimatedValueCents: Int!
    confidenceScore: Float!
    methodology: String!
    factors: [ValuationFactor!]!
    recommendation: ValuationRecommendation!
    validUntil: DateTime!
    createdAt: DateTime!
  }

  type ValuationFactor {
    name: String!
    weight: Float!
    score: Float!
    impact: String!
  }

  type ValuationRecommendation {
    suggestedPriceCents: Int!
    priceRangeLow: Int!
    priceRangeHigh: Int!
    pricingModel: PricingModel!
    rationale: String!
  }

  # ============================================================================
  # TRANSACTION & REVENUE TYPES
  # ============================================================================

  type Transaction {
    id: ID!
    contractId: ID!
    productId: ID!
    type: TransactionType!
    amountCents: Int!
    currency: String!
    status: TransactionStatus!
    providerId: String!
    consumerId: String!
    processedAt: DateTime
    tenantId: String!
    createdAt: DateTime!
  }

  type RevenueReport {
    period: ReportPeriod!
    totalRevenueCents: Int!
    totalTransactions: Int!
    byProduct: [ProductRevenue!]!
    byRegion: [RegionRevenue!]!
    trends: RevenueTrends!
  }

  type ReportPeriod {
    start: DateTime!
    end: DateTime!
  }

  type ProductRevenue {
    productId: ID!
    productName: String!
    revenueCents: Int!
    transactions: Int!
  }

  type RegionRevenue {
    region: String!
    revenueCents: Int!
    transactions: Int!
  }

  type RevenueTrends {
    revenueGrowthPercent: Float!
    transactionGrowthPercent: Float!
    averageOrderValueCents: Int!
  }

  # ============================================================================
  # INPUT TYPES
  # ============================================================================

  input CreateDataAssetInput {
    name: String!
    description: String
    category: DataAssetCategory!
    qualityLevel: DataQualityLevel!
    sensitivityLevel: SensitivityLevel!
    sourceSystem: String!
    schema: JSON
    metadata: AssetMetadataInput
    tags: [String!]
  }

  input AssetMetadataInput {
    recordCount: Int
    sizeBytes: Float
    lastUpdated: DateTime
    refreshFrequency: String
  }

  input ComplianceCheckInput {
    assetId: ID!
    frameworks: [ComplianceFramework!]!
    deepScan: Boolean
  }

  input CreateDataProductInput {
    name: String!
    description: String!
    shortDescription: String
    assets: [ID!]!
    category: DataAssetCategory!
    accessLevel: AccessLevel!
    pricing: ProductPricingInput!
    deliveryMethods: [DeliveryMethod!]!
    sla: SLAInput!
    complianceCertifications: [ComplianceFramework!]
    targetAudiences: [String!]
    useCases: [String!]
  }

  input ProductPricingInput {
    model: PricingModel!
    basePriceCents: Int!
    currency: String
    revenueSharePercent: Float
  }

  input SLAInput {
    availabilityPercent: Float
    latencyMs: Int
    supportTier: String!
    refreshFrequency: String
  }

  input CreateContractInput {
    type: ContractType!
    productId: ID!
    providerId: String!
    providerName: String!
    consumerId: String!
    consumerName: String!
    terms: ContractTermsInput!
    pricing: ContractPricingInput!
    dataRights: DataRightsInput!
    compliance: ContractComplianceInput!
  }

  input ContractTermsInput {
    startDate: DateTime!
    endDate: DateTime
    autoRenewal: Boolean
    renewalPeriodDays: Int
    terminationNoticeDays: Int
  }

  input ContractPricingInput {
    totalValueCents: Int!
    currency: String
    paymentTerms: String!
    billingFrequency: String!
  }

  input DataRightsInput {
    allowedPurposes: [String!]!
    prohibitedUses: [String!]
    geographicRestrictions: [String!]
    sublicensing: Boolean
    derivativeWorks: Boolean
    attribution: Boolean
    exclusivity: Boolean
  }

  input ContractComplianceInput {
    frameworks: [ComplianceFramework!]!
    dataProtectionOfficer: String
    securityMeasures: [String!]
    auditRights: Boolean
    breachNotificationHours: Int
  }

  input CreateListingInput {
    productId: ID!
    headline: String!
    highlights: [String!]
    visibility: String
  }

  input MarketplaceSearchInput {
    query: String
    categories: [String!]
    visibility: String
    limit: Int
    offset: Int
  }

  input DiscoverySourceInput {
    type: String!
    connectionString: String!
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  type Query {
    # Data Assets
    dataAsset(id: ID!): DataAsset
    dataAssets(limit: Int, offset: Int): [DataAsset!]!

    # Compliance
    complianceCheck(id: ID!): ComplianceCheck
    assetComplianceChecks(assetId: ID!): [ComplianceCheck!]!
    supportedFrameworks: [ComplianceFramework!]!

    # Data Products
    dataProduct(id: ID!): DataProduct
    dataProducts(limit: Int, offset: Int): [DataProduct!]!

    # Contracts
    contract(id: ID!): DataContract
    contracts(status: ContractStatus, limit: Int, offset: Int): [DataContract!]!

    # Marketplace
    listing(id: ID!): MarketplaceListing
    searchListings(input: MarketplaceSearchInput!): MarketplaceSearchResult!
    featuredListings(limit: Int): [MarketplaceListing!]!
    topListings(metric: String!, limit: Int): [MarketplaceListing!]!

    # Valuations
    valuation(assetId: ID!): DataValuation

    # Revenue
    revenueReport(startDate: DateTime!, endDate: DateTime!): RevenueReport!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  type Mutation {
    # Data Assets
    createDataAsset(input: CreateDataAssetInput!): DataAsset!
    updateDataAsset(id: ID!, input: CreateDataAssetInput!): DataAsset!
    deleteDataAsset(id: ID!): Boolean!
    discoverAssets(sources: [DiscoverySourceInput!]!): [DataAsset!]!

    # Compliance
    runComplianceCheck(input: ComplianceCheckInput!): [ComplianceCheck!]!

    # Data Products
    createDataProduct(input: CreateDataProductInput!): DataProduct!
    updateDataProduct(id: ID!, input: CreateDataProductInput!): DataProduct!
    publishDataProduct(id: ID!): DataProduct!

    # Contracts
    generateContract(input: CreateContractInput!): DataContract!
    signContract(contractId: ID!, party: String!, signedBy: String!): DataContract!

    # Marketplace
    createListing(input: CreateListingInput!): MarketplaceListing!
    publishListing(id: ID!): MarketplaceListing!
    recordListingView(id: ID!): Boolean!
    recordListingInquiry(id: ID!): Boolean!
    purchaseProduct(listingId: ID!, contractId: ID!): Transaction!
    rateListing(id: ID!, rating: Float!): MarketplaceListing!

    # Valuations
    valuateAsset(assetId: ID!): DataValuation!
  }
`;
