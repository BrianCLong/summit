import { gql } from 'graphql-tag';

export const canonicalTypeDefs = gql`
  # -- Canonical Policy Types --
  type PolicyLabels {
    origin: String
    sensitivity: String
    clearance: String
    legalBasis: String
    needToKnow: [String!]
    purpose: [String!]
    retention: String
    licenseClass: String
  }

  input PolicyLabelsInput {
    origin: String
    sensitivity: String
    clearance: String
    legalBasis: String
    needToKnow: [String!]
    purpose: [String!]
    retention: String
    licenseClass: String
  }

  # -- Canonical Interfaces --
  interface CanonicalEntity {
    id: ID!
    tenantId: String!
    entityType: String!
    schemaVersion: String!

    # Bitemporal Fields
    validFrom: DateTime!
    validTo: DateTime
    observedAt: DateTime!
    recordedAt: DateTime!

    # Provenance & Policy
    provenanceId: String!
    policy: PolicyLabels

    # Metadata
    props: JSON
  }

  # -- Concrete Canonical Types --

  type Person implements CanonicalEntity {
    id: ID!
    tenantId: String!
    entityType: String!
    schemaVersion: String!
    validFrom: DateTime!
    validTo: DateTime
    observedAt: DateTime!
    recordedAt: DateTime!
    provenanceId: String!
    policy: PolicyLabels
    props: JSON

    # Person Specific
    name: PersonName!
    identifiers: PersonIdentifiers
    demographics: PersonDemographics
    status: String
    occupations: [String!]
  }

  type PersonName {
    given: String
    middle: String
    family: String
    full: String!
    aliases: [String!]
  }

  type PersonIdentifiers {
    emails: [String!]
    phones: [JSON!] # Simplified for now
    nationalIds: [JSON!]
  }

  type PersonDemographics {
    dateOfBirth: DateTime
    gender: String
    nationalities: [String!]
  }

  type Organization implements CanonicalEntity {
    id: ID!
    tenantId: String!
    entityType: String!
    schemaVersion: String!
    validFrom: DateTime!
    validTo: DateTime
    observedAt: DateTime!
    recordedAt: DateTime!
    provenanceId: String!
    policy: PolicyLabels
    props: JSON

    name: String!
    industry: String
  }

  # Generic fallback for other types until fully detailed
  type GenericCanonicalEntity implements CanonicalEntity {
    id: ID!
    tenantId: String!
    entityType: String!
    schemaVersion: String!
    validFrom: DateTime!
    validTo: DateTime
    observedAt: DateTime!
    recordedAt: DateTime!
    provenanceId: String!
    policy: PolicyLabels
    props: JSON
  }

  # -- Inputs --
  input TemporalQueryInput {
    asOf: DateTime
    asKnownAt: DateTime
    includeHistory: Boolean
  }

  # -- Queries --
  extend type Query {
    canonicalEntity(id: ID!, temporal: TemporalQueryInput): CanonicalEntity

    canonicalPerson(id: ID!, temporal: TemporalQueryInput): Person

    searchCanonicalEntities(
      query: String!
      types: [String!]
      temporal: TemporalQueryInput
      limit: Int = 50
    ): [CanonicalEntity!]!
  }
`;
