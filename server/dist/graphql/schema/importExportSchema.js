import { gql } from 'graphql-tag';
export const importExportTypeDefs = gql `
  scalar Upload

  type ImportExportResult {
    success: Boolean!
    message: String!
    stats: ImportStats
    downloadUrl: String
    stream: String
    metadata: JSON
  }

  type ImportStats {
    totalRows: Int!
    successfulRows: Int!
    failedRows: Int!
    duration: Int
    rowsPerSecond: Int
    passed: Boolean
    errors: [ImportError!]
  }

  type ImportError {
    row: Int!
    error: String!
  }

  type PerformanceTestResult {
    success: Boolean!
    stats: ImportStats!
  }

  extend type Query {
    # Export entities from investigation
    exportEntities(
      investigationId: ID!
      format: ExportFormat = CSV
    ): ImportExportResult!

    # Performance test for 100k entity import (admin only)
    testImportPerformance: PerformanceTestResult!
  }

  extend type Mutation {
    # Import entities from CSV file upload
    importEntitiesFromCSV(
      file: Upload!
      investigationId: ID!
      batchSize: Int = 1000
    ): ImportExportResult!

    # Import relationships from CSV file upload
    importRelationshipsFromCSV(
      file: Upload!
      investigationId: ID!
      batchSize: Int = 1000
    ): ImportExportResult!

    # Import from JSON data
    importFromJSON(
      data: String!
      investigationId: ID!
    ): ImportExportResult!

    # Bulk create entities (optimized for large imports)
    bulkCreateEntities(
      entities: [BulkEntityInput!]!
      investigationId: ID!
      batchSize: Int = 1000
    ): ImportExportResult!
  }

  input BulkEntityInput {
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    confidence: Float
    source: String
  }

  enum ExportFormat {
    CSV
    JSON
    EXCEL
  }
`;
//# sourceMappingURL=importExportSchema.js.map