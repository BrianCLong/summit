/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphCoverage } from './GraphCoverage';
import type { GraphInsight } from './GraphInsight';
export type GraphInsightsResponse = {
  graphId?: string;
  insights?: Array<GraphInsight>;
  coverage?: GraphCoverage;
  generatedAt?: string;
};

