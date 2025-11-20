/**
 * GraphQL Operations for AI Copilot
 *
 * All queries and mutations for the copilot feature.
 * Used with Apollo Client code generation.
 */

import { gql } from '@apollo/client';

// ============================================================================
// Fragments
// ============================================================================

export const CYPHER_PREVIEW_FRAGMENT = gql`
  fragment CypherPreviewFields on CypherPreview {
    cypher
    explanation
    estimatedRows
    estimatedCost
    complexity
    warnings
    allowed
    blockReason
    auditId
  }
`;

export const EXECUTION_SUMMARY_FRAGMENT = gql`
  fragment ExecutionSummaryFields on ExecutionSummary {
    recordCount
    executionTime
  }
`;

export const EXECUTION_RESULT_FRAGMENT = gql`
  fragment ExecutionResultFields on CypherExecutionResult {
    records
    summary {
      ...ExecutionSummaryFields
    }
    citations
    auditId
  }
  ${EXECUTION_SUMMARY_FRAGMENT}
`;

export const EVIDENCE_FRAGMENT = gql`
  fragment EvidenceFields on Evidence {
    id
    type
    description
    strength
    sourceIds
  }
`;

export const HYPOTHESIS_FRAGMENT = gql`
  fragment HypothesisFields on Hypothesis {
    id
    statement
    confidence
    supportingEvidence {
      ...EvidenceFields
    }
    involvedEntities
    suggestedSteps
  }
  ${EVIDENCE_FRAGMENT}
`;

export const WHY_PATH_FRAGMENT = gql`
  fragment WhyPathFields on WhyPath {
    from
    to
    relId
    type
    supportScore
    score_breakdown {
      length
      edgeType
      centrality
    }
  }
`;

export const NARRATIVE_FRAGMENT = gql`
  fragment NarrativeFields on Narrative {
    id
    investigationId
    title
    content
    keyFindings
    citations
    supportingPaths {
      ...WhyPathFields
    }
    confidence
    createdAt
    auditId
  }
  ${WHY_PATH_FRAGMENT}
`;

// ============================================================================
// Queries
// ============================================================================

/**
 * Preview a natural language query without executing it
 */
export const PREVIEW_NL_QUERY = gql`
  query PreviewNLQuery($input: NLQueryInput!) {
    previewNLQuery(input: $input) {
      ...CypherPreviewFields
    }
  }
  ${CYPHER_PREVIEW_FRAGMENT}
`;

/**
 * Get copilot suggestions for the investigation
 */
export const GET_COPILOT_SUGGESTIONS = gql`
  query GetCopilotSuggestions($investigationId: ID!) {
    copilotSuggestions(investigationId: $investigationId)
  }
`;

/**
 * Generate hypotheses from investigation data
 */
export const GENERATE_HYPOTHESES = gql`
  query GenerateHypotheses($input: HypothesisInput!) {
    generateHypotheses(input: $input) {
      ...HypothesisFields
    }
  }
  ${HYPOTHESIS_FRAGMENT}
`;

/**
 * Generate narrative report
 */
export const GENERATE_NARRATIVE = gql`
  query GenerateNarrative($input: NarrativeInput!) {
    generateNarrative(input: $input) {
      ...NarrativeFields
    }
  }
  ${NARRATIVE_FRAGMENT}
`;

// ============================================================================
// Mutations
// ============================================================================

/**
 * Execute a natural language query
 */
export const EXECUTE_NL_QUERY = gql`
  mutation ExecuteNLQuery($input: NLQueryInput!) {
    executeNLQuery(input: $input) {
      ...ExecutionResultFields
    }
  }
  ${EXECUTION_RESULT_FRAGMENT}
`;

/**
 * Execute a pre-approved Cypher query
 */
export const EXECUTE_CYPHER_QUERY = gql`
  mutation ExecuteCypherQuery(
    $cypher: String!
    $investigationId: ID!
    $auditId: ID
  ) {
    executeCypherQuery(
      cypher: $cypher
      investigationId: $investigationId
      auditId: $auditId
    ) {
      ...ExecutionResultFields
    }
  }
  ${EXECUTION_RESULT_FRAGMENT}
`;

/**
 * Save a hypothesis for tracking
 */
export const SAVE_HYPOTHESIS = gql`
  mutation SaveHypothesis(
    $investigationId: ID!
    $hypothesis: String!
    $confidence: Float!
  ) {
    saveHypothesis(
      investigationId: $investigationId
      hypothesis: $hypothesis
      confidence: $confidence
    ) {
      ...HypothesisFields
    }
  }
  ${HYPOTHESIS_FRAGMENT}
`;

/**
 * Save a narrative as an investigation artifact
 */
export const SAVE_NARRATIVE = gql`
  mutation SaveNarrative(
    $investigationId: ID!
    $title: String!
    $content: String!
  ) {
    saveNarrative(
      investigationId: $investigationId
      title: $title
      content: $content
    ) {
      ...NarrativeFields
    }
  }
  ${NARRATIVE_FRAGMENT}
`;

// ============================================================================
// Subscriptions (Future)
// ============================================================================

/**
 * Subscribe to copilot events for real-time updates
 * (Not yet implemented - placeholder for future enhancement)
 */
export const COPILOT_EVENTS_SUBSCRIPTION = gql`
  subscription CopilotEvents($investigationId: ID!) {
    copilotEvents(investigationId: $investigationId) {
      type
      payload
      timestamp
    }
  }
`;

// ============================================================================
// Type Exports for Generated Types
// ============================================================================

export type PreviewNLQueryVariables = {
  input: {
    query: string;
    investigationId: string;
    userId?: string;
    dryRun?: boolean;
  };
};

export type ExecuteNLQueryVariables = {
  input: {
    query: string;
    investigationId: string;
    userId?: string;
    dryRun?: boolean;
  };
};

export type GenerateHypothesesVariables = {
  input: {
    investigationId: string;
    focusEntityIds?: string[];
    count?: number;
  };
};

export type GenerateNarrativeVariables = {
  input: {
    investigationId: string;
    theme?: string;
    keyEntityIds?: string[];
    style?: 'ANALYTICAL' | 'CHRONOLOGICAL' | 'NETWORK_FOCUSED' | 'THREAT_ASSESSMENT';
  };
};

export type SaveHypothesisVariables = {
  investigationId: string;
  hypothesis: string;
  confidence: number;
};

export type SaveNarrativeVariables = {
  investigationId: string;
  title: string;
  content: string;
};
