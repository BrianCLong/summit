/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GraphSummary = {
  id?: string;
  name?: string;
  description?: string;
  nodeCount?: number;
  edgeCount?: number;
  tags?: Array<string>;
  createdAt?: string;
  updatedAt?: string;
  status?: GraphSummary.status;
  /**
   * Number of active AI insights associated with the graph
   */
  insightCount?: number;
  /**
   * Timestamp of the most recent AI analysis
   */
  lastAnalyzedAt?: string;
  owner?: {
    id?: string;
    name?: string;
  };
};
export namespace GraphSummary {
  export enum status {
    DRAFT = 'draft',
    ACTIVE = 'active',
    ARCHIVED = 'archived',
  }
}

