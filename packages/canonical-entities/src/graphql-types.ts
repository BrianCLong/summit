/**
 * GraphQL Type Definitions for Canonical Entities
 *
 * These types extend the existing Entity type with discriminated
 * entity types and bitemporal fields.
 */

export const canonicalEntityTypeDefs = `
  """
  Bitemporal fields for tracking entity validity and observation times
  """
  interface BitemporalEntity {
    """When this fact became true in the real world (null = unknown)"""
    validFrom: DateTime
    """When this fact stopped being true (null = still valid)"""
    validTo: DateTime
    """When this fact was observed/discovered"""
    observedAt: DateTime
    """When this record was created in the system (immutable)"""
    recordedAt: DateTime!
  }

  """
  Source reference for provenance tracking
  """
  type SourceReference {
    sourceId: String!
    sourceRecordId: String!
    sourceType: String!
    ingestedAt: DateTime!
    sourceHash: String
  }

  """
  Classification levels for data sensitivity
  """
  enum ClassificationLevel {
    UNCLASSIFIED
    CUI
    CONFIDENTIAL
    SECRET
    TOP_SECRET
  }

  """
  Base interface for all canonical entities
  """
  interface CanonicalEntity implements BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!
  }

  """
  Entity type discriminator
  """
  enum EntityType {
    Person
    Organization
    Asset
    Location
    Event
    Document
    Claim
    Case
  }

  # =============================================================================
  # Person Entity
  # =============================================================================

  type PersonIdentification {
    type: String!
    value: String!
    issuingCountry: String
    expiryDate: DateTime
  }

  type PersonContact {
    type: ContactType!
    value: String!
    isPrimary: Boolean
  }

  enum ContactType {
    email
    phone
    address
    social
  }

  enum Gender {
    male
    female
    other
    unknown
  }

  """
  A person entity representing an individual
  """
  type Person implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Person-specific fields
    name: String!
    firstName: String
    lastName: String
    middleName: String
    aliases: [String!]
    dateOfBirth: DateTime
    dateOfDeath: DateTime
    nationalities: [String!]
    gender: Gender
    identifications: [PersonIdentification!]
    contacts: [PersonContact!]
    occupation: String
    employer: String
    riskIndicators: [String!]
    isPEP: Boolean
    sanctionsMatches: [String!]
  }

  # =============================================================================
  # Organization Entity
  # =============================================================================

  enum OrgType {
    corporation
    llc
    partnership
    nonprofit
    government
    other
  }

  type Revenue {
    amount: Float!
    currency: String!
    year: Int!
  }

  """
  An organization entity representing a company, government, or other legal entity
  """
  type Organization implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Organization-specific fields
    name: String!
    tradingNames: [String!]
    orgType: OrgType
    industry: String
    registrationNumber: String
    taxId: String
    incorporationDate: DateTime
    dissolutionDate: DateTime
    incorporationCountry: String
    headquarters: String
    website: String
    employeeCount: Int
    revenue: Revenue
    ticker: String
    lei: String
    riskIndicators: [String!]
    sanctionsMatches: [String!]
  }

  # =============================================================================
  # Asset Entity
  # =============================================================================

  enum AssetType {
    vehicle
    vessel
    aircraft
    real_estate
    financial_account
    cryptocurrency
    intellectual_property
    equipment
    other
  }

  enum AssetStatus {
    active
    inactive
    seized
    disposed
    unknown
  }

  type AssetValue {
    amount: Float!
    currency: String!
    asOfDate: DateTime!
  }

  type VehicleDetails {
    make: String!
    model: String!
    year: Int!
    vin: String
    licensePlate: String
    color: String
  }

  type VesselDetails {
    imo: String
    mmsi: String
    callSign: String
    flag: String
    type: String
    grossTonnage: Float
  }

  type AircraftDetails {
    tailNumber: String
    icaoCode: String
    manufacturer: String
    model: String
    operator: String
  }

  type FinancialAccountDetails {
    accountNumber: String
    bankName: String
    bankCountry: String
    accountType: String
    swift: String
    iban: String
  }

  type CryptocurrencyDetails {
    blockchain: String!
    address: String!
    balance: Float
    token: String
  }

  """
  An asset entity representing physical or financial assets
  """
  type Asset implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Asset-specific fields
    name: String!
    assetType: AssetType!
    serialNumber: String
    registrationNumber: String
    value: AssetValue
    location: String
    status: AssetStatus
    vehicle: VehicleDetails
    vessel: VesselDetails
    aircraft: AircraftDetails
    financialAccount: FinancialAccountDetails
    cryptocurrency: CryptocurrencyDetails
  }

  # =============================================================================
  # Location Entity
  # =============================================================================

  enum LocationType {
    address
    city
    region
    country
    coordinates
    facility
    port
    airport
    other
  }

  type Address {
    street: String
    city: String
    state: String
    postalCode: String
    country: String!
  }

  type Coordinates {
    latitude: Float!
    longitude: Float!
    altitude: Float
    accuracy: Float
  }

  type AdminDivision {
    level: Int!
    name: String!
    code: String
  }

  enum RiskLevel {
    low
    medium
    high
    critical
  }

  """
  A location entity representing a geographic place
  """
  type Location implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Location-specific fields
    name: String!
    locationType: LocationType!
    address: Address
    coordinates: Coordinates
    geohash: String
    timezone: String
    countryCode: String
    adminDivisions: [AdminDivision!]
    poiType: String
    riskLevel: RiskLevel
  }

  # =============================================================================
  # Event Entity
  # =============================================================================

  enum EventSeverity {
    info
    low
    medium
    high
    critical
  }

  enum EventStatus {
    planned
    in_progress
    completed
    cancelled
  }

  type FinancialImpact {
    amount: Float!
    currency: String!
  }

  """
  An event entity representing something that happened at a point in time
  """
  type Event implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Event-specific fields
    name: String!
    eventType: String!
    description: String
    startTime: DateTime!
    endTime: DateTime
    durationSeconds: Int
    location: String
    severity: EventSeverity
    status: EventStatus
    outcome: String
    participantIds: [ID!]
    financialImpact: FinancialImpact
    indicators: [String!]
  }

  # =============================================================================
  # Document Entity
  # =============================================================================

  enum DocumentType {
    report
    email
    chat
    social_media
    news
    legal
    financial
    image
    video
    audio
    other
  }

  type Sentiment {
    score: Float!
    label: SentimentLabel!
  }

  enum SentimentLabel {
    positive
    negative
    neutral
  }

  """
  A document entity representing unstructured content
  """
  type Document implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Document-specific fields
    title: String!
    documentType: DocumentType!
    mimeType: String
    sizeBytes: Int
    hash: String
    storageUrl: String
    filename: String
    language: String
    author: String
    createdDate: DateTime
    modifiedDate: DateTime
    textContent: String
    extractedEntityIds: [ID!]
    ocrConfidence: Float
    pageCount: Int
    wordCount: Int
    summary: String
    keywords: [String!]
    sentiment: Sentiment
  }

  # =============================================================================
  # Claim Entity
  # =============================================================================

  enum ClaimType {
    assertion
    allegation
    hypothesis
    fact
    rumor
    denial
  }

  enum VerificationStatus {
    unverified
    verified
    disputed
    refuted
    retracted
  }

  enum Credibility {
    high
    medium
    low
    unknown
  }

  enum Impact {
    high
    medium
    low
  }

  """
  A claim entity representing an assertion or allegation
  """
  type Claim implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Claim-specific fields
    statement: String!
    claimType: ClaimType!
    subjectId: ID
    verificationStatus: VerificationStatus!
    supportingEvidence: [ID!]
    contradictingEvidence: [ID!]
    claimConfidence: Float!
    sourceCredibility: Credibility
    claimDate: DateTime
    expiryDate: DateTime
    attribution: String
    impact: Impact
    relatedClaimIds: [ID!]
  }

  # =============================================================================
  # Case Entity
  # =============================================================================

  enum CaseStatus {
    open
    in_progress
    pending_review
    escalated
    closed
    archived
  }

  enum Priority {
    low
    medium
    high
    critical
  }

  enum SLAStatus {
    on_track
    at_risk
    breached
  }

  type ValueAmount {
    amount: Float!
    currency: String!
  }

  """
  A case entity representing an investigation or workflow
  """
  type Case implements CanonicalEntity & BitemporalEntity {
    id: ID!
    canonicalId: ID
    entityType: EntityType!
    confidence: Float!
    source: String!
    sources: [SourceReference!]!
    classification: ClassificationLevel!
    compartments: [String!]!
    investigationIds: [ID!]!
    tenantId: String!
    createdBy: String!
    updatedBy: String
    createdAt: DateTime!
    updatedAt: DateTime
    tags: [String!]!
    validFrom: DateTime
    validTo: DateTime
    observedAt: DateTime
    recordedAt: DateTime!

    # Case-specific fields
    title: String!
    caseNumber: String!
    caseType: String!
    description: String
    status: CaseStatus!
    priority: Priority!
    assignedTo: [ID!]
    leadInvestigator: String
    openDate: DateTime!
    closeDate: DateTime
    dueDate: DateTime
    slaStatus: SLAStatus
    relatedEntityIds: [ID!]
    findings: [String!]
    recommendations: [String!]
    outcome: String
    parentCaseId: ID
    childCaseIds: [ID!]
    categories: [String!]
    valueAtRisk: ValueAmount
    recoveredValue: ValueAmount
  }

  # =============================================================================
  # Queries
  # =============================================================================

  extend type Query {
    """Get a person by ID"""
    person(id: ID!): Person

    """Search persons"""
    persons(
      name: String
      nationality: String
      isPEP: Boolean
      limit: Int = 25
      offset: Int = 0
    ): [Person!]!

    """Get an organization by ID"""
    organization(id: ID!): Organization

    """Search organizations"""
    organizations(
      name: String
      industry: String
      country: String
      limit: Int = 25
      offset: Int = 0
    ): [Organization!]!

    """Get an asset by ID"""
    asset(id: ID!): Asset

    """Search assets"""
    assets(
      assetType: AssetType
      status: AssetStatus
      limit: Int = 25
      offset: Int = 0
    ): [Asset!]!

    """Get a location by ID"""
    location(id: ID!): Location

    """Search locations"""
    locations(
      locationType: LocationType
      country: String
      limit: Int = 25
      offset: Int = 0
    ): [Location!]!

    """Get an event by ID"""
    event(id: ID!): Event

    """Search events"""
    events(
      eventType: String
      severity: EventSeverity
      startAfter: DateTime
      startBefore: DateTime
      limit: Int = 25
      offset: Int = 0
    ): [Event!]!

    """Get a document by ID"""
    document(id: ID!): Document

    """Search documents"""
    documents(
      documentType: DocumentType
      author: String
      limit: Int = 25
      offset: Int = 0
    ): [Document!]!

    """Get a claim by ID"""
    claim(id: ID!): Claim

    """Search claims"""
    claims(
      claimType: ClaimType
      verificationStatus: VerificationStatus
      limit: Int = 25
      offset: Int = 0
    ): [Claim!]!

    """Get a case by ID"""
    case(id: ID!): Case

    """Search cases"""
    cases(
      status: CaseStatus
      priority: Priority
      assignedTo: ID
      limit: Int = 25
      offset: Int = 0
    ): [Case!]!

    """
    Query entities at a specific point in time (bitemporal query)
    Returns entities that were valid at the specified time
    """
    entitiesAtTime(
      entityType: EntityType
      asOf: DateTime!
      investigationId: ID
      limit: Int = 25
      offset: Int = 0
    ): [CanonicalEntity!]!
  }
`;

export default canonicalEntityTypeDefs;
