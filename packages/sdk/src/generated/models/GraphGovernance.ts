/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GraphGovernance = {
  sensitivity?: GraphGovernance.sensitivity;
  retentionPolicy?: {
    /**
     * Number of days to retain graph data
     */
    retentionDays?: number;
    legalHold?: boolean;
  };
  /**
   * Indicates whether the graph contains PII that requires masking
   */
  pii?: boolean;
  complianceTags?: Array<string>;
  dataQuality?: {
    completeness?: number;
    /**
     * Timestamp of the most recent data refresh
     */
    freshness?: string;
    /**
     * External lineage reference for auditing
     */
    lineageReference?: string;
  };
};
export namespace GraphGovernance {
  export enum sensitivity {
    PUBLIC = 'public',
    INTERNAL = 'internal',
    RESTRICTED = 'restricted',
    CONFIDENTIAL = 'confidential',
  }
}

