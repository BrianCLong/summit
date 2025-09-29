import { gql } from 'graphql-tag';

export const statsTypeDefs = gql`
  """
  Tenant-scoped aggregate counts (kept intentionally generic to avoid tight coupling).
  """
  type CaseCounts {
    byStatus: JSON!
    total: Int!
  }

  type SummaryStats {
    entities: Int!
    relationships: Int!
    investigations: Int!
  }

  extend type Query {
    """
    Counts of investigations by status (generic JSON map).
    """
    caseCounts: CaseCounts!

    """
    Totals across key domain objects.
    """
    summaryStats: SummaryStats!
  }
`;

export default statsTypeDefs;

