export const typeDefs = `#graphql
  """Citizen profile aggregated from all form submissions"""
  type CitizenProfile {
    id: ID!
    personal: PersonalInfo!
    contact: ContactInfo!
    address: AddressInfo!
    identifiers: Identifiers
    employment: EmploymentInfo
    documents: [Document!]!
    submissions: [Submission!]!
    lastUpdated: String!
  }

  type PersonalInfo {
    firstName: String!
    lastName: String!
    middleName: String
    dateOfBirth: String!
    gender: String
    maritalStatus: String
  }

  type ContactInfo {
    email: String!
    phone: String!
    alternatePhone: String
  }

  type AddressInfo {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  type Identifiers {
    ssn: String
    driverLicense: String
    passportNumber: String
    nationalId: String
  }

  type EmploymentInfo {
    employer: String!
    occupation: String!
    income: Float!
    employmentStatus: String!
  }

  type Document {
    type: String!
    documentId: String!
    uploadedAt: String!
    expiresAt: String
  }

  type Submission {
    formId: String!
    submittedAt: String!
    status: String!
  }

  """Predicted service need for proactive resolution"""
  type ServiceNeed {
    id: ID!
    citizenId: ID!
    serviceType: String!
    predictedNeedDate: String!
    confidence: Float!
    triggers: [String!]!
    status: ServiceNeedStatus!
    autoResolvable: Boolean!
  }

  enum ServiceNeedStatus {
    PREDICTED
    NOTIFIED
    RESOLVED
    DISMISSED
  }

  """Form auto-complete result"""
  type AutocompleteResult {
    values: JSON!
    completedCount: Int!
    totalFields: Int!
    completionRate: Float!
  }

  """Workload reduction metrics"""
  type WorkloadMetrics {
    period: String!
    totalRequests: Int!
    autoCompletedFields: Int!
    reusedDataPoints: Int!
    proactiveResolutions: Int!
    manualInterventions: Int!
    timeSavedMinutes: Float!
    workloadReductionPercent: Float!
  }

  type WorkloadTarget {
    met: Boolean!
    currentReduction: Float!
    target: Float!
  }

  """Auto-resolve result"""
  type AutoResolveResult {
    resolved: Boolean!
    action: String
    nextSteps: [String!]
  }

  """Form submission handling result"""
  type SubmissionResult {
    profileUpdated: Boolean!
    newNeedsDetected: Int!
    autoResolved: Int!
  }

  input FormFieldInput {
    id: String!
    name: String!
    type: String!
    required: Boolean!
    profileMapping: String
  }

  input SubmissionDataInput {
    key: String!
    value: String!
  }

  scalar JSON

  type Query {
    """Get citizen profile by ID"""
    citizenProfile(id: ID!): CitizenProfile

    """Find citizen by identifier (email, ssn, phone)"""
    findCitizenByIdentifier(type: String!, value: String!): CitizenProfile

    """Get predicted service needs for a citizen"""
    serviceNeeds(citizenId: ID!): [ServiceNeed!]!

    """Get pending (unresolved) service needs"""
    pendingServiceNeeds(citizenId: ID!): [ServiceNeed!]!

    """Auto-complete form fields for a citizen"""
    autocompleteForm(citizenId: ID!, fields: [FormFieldInput!]!): AutocompleteResult!

    """Get workload metrics for a period"""
    workloadMetrics(period: String!): WorkloadMetrics

    """Get aggregated metrics for date range"""
    aggregatedMetrics(startDate: String!, endDate: String!): WorkloadMetrics!

    """Check if 70% workload reduction target is met"""
    workloadTargetStatus: WorkloadTarget!
  }

  type Mutation {
    """Create a new citizen profile"""
    createCitizenProfile(
      firstName: String!
      lastName: String!
      email: String!
      phone: String!
      dateOfBirth: String!
    ): CitizenProfile!

    """Handle form submission with full automation"""
    handleFormSubmission(
      citizenId: ID!
      formId: String!
      data: [SubmissionDataInput!]!
    ): SubmissionResult!

    """Attempt to auto-resolve a service need"""
    autoResolveServiceNeed(needId: ID!, citizenId: ID!): AutoResolveResult!

    """Predict service needs for a citizen"""
    predictServiceNeeds(citizenId: ID!): [ServiceNeed!]!

    """Notify citizen of a predicted need"""
    notifyCitizen(citizenId: ID!, needId: ID!): Boolean!

    """Run daily proactive scan for multiple citizens"""
    runProactiveScan(citizenIds: [ID!]!): ProactiveScanResult!
  }

  type ProactiveScanResult {
    scanned: Int!
    needsIdentified: Int!
    autoResolved: Int!
    notificationsSent: Int!
  }
`;
