/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphExportFilters } from './GraphExportFilters';
export type GraphExportRequest = {
  format: GraphExportRequest.format;
  includeProperties?: boolean;
  filters?: GraphExportFilters;
  /**
   * Optional email to notify when the export is ready
   */
  notificationEmail?: string;
};
export namespace GraphExportRequest {
  export enum format {
    CSV = 'csv',
    JSON = 'json',
    PARQUET = 'parquet',
  }
}

