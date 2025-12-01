export const marketplaceTypeDefs = /* GraphQL */ `
  enum PersonaType {
    citizen
    business
    developer
  }

  enum PricingModel {
    free
    freemium
    subscription
    usage
  }

  type Publisher {
    id: ID!
    name: String!
    verified: Boolean!
  }

  type Pricing {
    model: PricingModel!
    basePrice: Float
    currency: String!
  }

  type AIExperience {
    id: ID!
    name: String!
    description: String!
    persona: PersonaType!
    category: String!
    tags: [String!]!
    capabilities: [String!]!
    supportedLocales: [String!]!
    version: String!
    rating: Float
    reviewCount: Int!
    pricing: Pricing!
    publisher: Publisher!
    createdAt: String!
    updatedAt: String!
  }

  type Recommendation {
    experienceId: ID!
    experience: AIExperience
    score: Float!
    reasons: [String!]!
    personalizedDescription: String
  }

  type UserPreferences {
    userId: ID!
    persona: PersonaType
    locale: String!
    timezone: String
    interests: [String!]!
    skills: [String!]!
    industry: String
    preferredCategories: [String!]!
    dislikedCategories: [String!]!
  }

  input MarketplaceFilterInput {
    persona: PersonaType
    categories: [String!]
    tags: [String!]
    locale: String
    priceModel: PricingModel
    minRating: Float
    search: String
    limit: Int
    offset: Int
  }

  input UserPreferencesInput {
    persona: PersonaType
    locale: String
    timezone: String
    interests: [String!]
    skills: [String!]
    industry: String
    preferredCategories: [String!]
    dislikedCategories: [String!]
  }

  input PublishExperienceInput {
    name: String!
    description: String!
    persona: PersonaType!
    category: String!
    tags: [String!]!
    capabilities: [String!]!
    supportedLocales: [String!]!
    version: String!
    pricingModel: PricingModel!
    basePrice: Float
    currency: String
  }

  extend type Query {
    # Get personalized recommendations
    marketplaceRecommendations(filter: MarketplaceFilterInput): [Recommendation!]!

    # Browse marketplace experiences
    marketplaceBrowse(filter: MarketplaceFilterInput): [AIExperience!]!

    # Get single experience
    marketplaceExperience(id: ID!): AIExperience

    # Get user's installed experiences
    marketplaceInstalled: [AIExperience!]!

    # Get user preferences
    marketplacePreferences: UserPreferences!
  }

  extend type Mutation {
    # Install an experience
    marketplaceInstall(experienceId: ID!): Boolean!

    # Uninstall an experience
    marketplaceUninstall(experienceId: ID!): Boolean!

    # Rate an experience
    marketplaceRate(experienceId: ID!, rating: Int!): Boolean!

    # Record experience usage
    marketplaceRecordUsage(experienceId: ID!, durationSeconds: Int!): Boolean!

    # Update user preferences
    marketplaceUpdatePreferences(input: UserPreferencesInput!): UserPreferences!

    # Publish new experience (for developers)
    marketplacePublish(input: PublishExperienceInput!): AIExperience!
  }
`;
