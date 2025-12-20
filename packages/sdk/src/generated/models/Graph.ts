/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphGovernance } from './GraphGovernance';
import type { GraphSummary } from './GraphSummary';
export type Graph = (GraphSummary & {
  configuration?: {
    layout?: Graph.layout;
    theme?: Graph.theme;
    autoSave?: boolean;
  };
  statistics?: {
    density?: number;
    clusteringCoefficient?: number;
    averageDegree?: number;
  };
  governance?: GraphGovernance;
});
export namespace Graph {
  export enum layout {
    FORCE_DIRECTED = 'force-directed',
    HIERARCHICAL = 'hierarchical',
    CIRCULAR = 'circular',
  }
  export enum theme {
    LIGHT = 'light',
    DARK = 'dark',
    HIGH_CONTRAST = 'high-contrast',
  }
}

