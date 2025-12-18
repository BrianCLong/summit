import { gql } from 'graphql-tag';

export const documentTypeDefs = gql`
  # A Document entity, based on the master business document taxonomy.
  type Document {
    id: ID!
    tenantId: String!
    # The high-level category of the document (e.g., "Corporate Formation & Governance").
    category: String!
    # The specific subtype of the document (e.g., "Articles of Incorporation").
    subType: String!
    # A list of variants of the document, if applicable.
    variants: [String!]
    # The underlying generic Entity node.
    entity: Entity!
    # Relationships to other documents.
    relationships: [DocumentRelationship!]!
  }

  # Represents a relationship between two documents.
  type DocumentRelationship {
    # The type of the relationship (e.g., "PRECONDITION", "GOVERNING_AGREEMENT").
    type: String!
    # The document at the other end of the relationship.
    document: Document!
  }

  # Input for creating a new Document.
  input DocumentInput {
    tenantId: String!
    name: String!
    category: String!
    # Optional properties to store on the underlying Entity.
    props: JSON
  }

  extend type Query {
    # Get a single document by its ID.
    document(id: ID!, tenantId: String!): Document
    # Get all documents, with optional filtering by category and subtype.
    documents(tenantId: String!, category: String, subType: String, name: String): [Document!]!
  }

  extend type Mutation {
    # Create a new document.
    createDocument(input: DocumentInput!): Document!
  }
`;
