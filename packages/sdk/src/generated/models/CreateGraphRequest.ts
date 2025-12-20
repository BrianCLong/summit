/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateGraphRequest = {
  name: string;
  description?: string;
  tags?: Array<string>;
  configuration?: {
    layout?: CreateGraphRequest.layout;
  };
};
export namespace CreateGraphRequest {
  export enum layout {
    FORCE_DIRECTED = 'force-directed',
    HIERARCHICAL = 'hierarchical',
    CIRCULAR = 'circular',
  }
}

