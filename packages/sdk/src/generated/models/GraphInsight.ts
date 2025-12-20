/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphInsightEntityRef } from './GraphInsightEntityRef';
export type GraphInsight = {
  id?: string;
  title?: string;
  summary?: string;
  severity?: GraphInsight.severity;
  confidence?: number;
  tags?: Array<string>;
  relatedEntities?: Array<GraphInsightEntityRef>;
  remediation?: string;
  generatedAt?: string;
};
export namespace GraphInsight {
  export enum severity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
  }
}

