/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Entity = {
  id?: string;
  type?: string;
  properties?: Record<string, any>;
  metadata?: {
    source?: string;
    confidence?: number;
    lastVerified?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  /**
   * Domain-specific labels applied to the entity
   */
  labels?: Array<string>;
};

