import { gql } from '@apollo/client';

export const INGESTION_TABLES_QUERY = gql`
  query IngestionTables($schema: String) {
    ingestionTables(schema: $schema) {
      schema
      name
      rowCount
    }
  }
`;

export const DATA_PROFILING_QUERY = gql`
  query DataProfile($table: String!, $schema: String, $sampleSize: Int, $topK: Int) {
    dataProfile(table: $table, schema: $schema, sampleSize: $sampleSize, topK: $topK) {
      table
      schema
      rowCount
      generatedAt
      columns {
        name
        dataType
        nullCount
        nullPercent
        distinctCount
        sampleTopValues {
          value
          count
        }
        numericSummary {
          min
          max
          mean
        }
      }
    }
  }
`;
