import { gql } from "@apollo/client";

export const INSIGHTS_QUERY = gql`
  query GetInsights($status: String) { 
    insights(status: $status) { 
      id 
      kind 
      payload 
      status 
      createdAt
      jobId
    } 
  }
`;

export const APPROVE_MUT = gql`
  mutation ApproveInsight($id: ID!) { 
    approveInsight(id: $id) { 
      id 
      status 
      decidedAt
    } 
  }
`;

export const REJECT_MUT = gql`
  mutation RejectInsight($id: ID!, $reason: String) { 
    rejectInsight(id: $id, reason: $reason) { 
      id 
      status 
      decidedAt
    } 
  }
`;

export const AI_EXTRACT_ENTITIES_MUT = gql`
  mutation ExtractEntities($docs: [JSON!]!, $jobId: ID) {
    aiExtractEntities(docs: $docs, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

export const AI_LINK_PREDICT_MUT = gql`
  mutation PredictLinks($graphSnapshotId: ID!, $topK: Int, $jobId: ID) {
    aiLinkPredict(graphSnapshotId: $graphSnapshotId, topK: $topK, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

export const AI_COMMUNITY_DETECT_MUT = gql`
  mutation DetectCommunities($graphSnapshotId: ID!, $jobId: ID) {
    aiCommunityDetect(graphSnapshotId: $graphSnapshotId, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

export function useInsightApproval() {
  return {
    async approveInsight(apollo, id) {
      return apollo.mutate({ mutation: APPROVE_MUT, variables: { id } });
    },
    async rejectInsight(apollo, id, reason) {
      return apollo.mutate({ mutation: REJECT_MUT, variables: { id, reason } });
    }
  };
}

export function useAIOperations() {
  return {
    async extractEntities(apollo, docs, jobId) {
      return apollo.mutate({ mutation: AI_EXTRACT_ENTITIES_MUT, variables: { docs, jobId } });
    },
    async predictLinks(apollo, graphSnapshotId, topK = 50, jobId) {
      return apollo.mutate({ mutation: AI_LINK_PREDICT_MUT, variables: { graphSnapshotId, topK, jobId } });
    },
    async detectCommunities(apollo, graphSnapshotId, jobId) {
      return apollo.mutate({ mutation: AI_COMMUNITY_DETECT_MUT, variables: { graphSnapshotId, jobId } });
    }
  };
}