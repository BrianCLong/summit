import { gql } from '@apollo/client';

export const EXPLAIN_DECISION_QUERY = gql`
  query ExplainDecision($paragraphId: ID!) {
    decisionExplanation(paragraphId: $paragraphId) {
      paragraphId
      metadata {
        heading
        headingCitation
        preparedBy
        updatedAt
        updatedAtCitation
      }
      evidenceSummary
      dissentSummary
      policySummary
      evidence {
        id
        label
        labelCitation
        detail
        provenance
        provenanceCitation
      }
      dissents {
        id
        author
        authorCitation
        excerpt
      }
      policies {
        id
        title
        titleCitation
        authority
      }
    }
  }
`;

export type ExplainDecisionQueryResult = {
  decisionExplanation: {
    __typename: string;
    paragraphId: string;
    metadata: {
      __typename: string;
      heading: string;
      headingCitation: string;
      preparedBy: string;
      updatedAt: string;
      updatedAtCitation: string;
    };
    evidenceSummary: string;
    dissentSummary: string;
    policySummary: string;
    evidence: Array<{
      __typename: string;
      id: string;
      label: string;
      labelCitation: string;
      detail: string;
      provenance: string;
      provenanceCitation: string;
    }>;
    dissents: Array<{
      __typename: string;
      id: string;
      author: string;
      authorCitation: string;
      excerpt: string;
    }>;
    policies: Array<{
      __typename: string;
      id: string;
      title: string;
      titleCitation: string;
      authority: string;
    }>;
  };
};
