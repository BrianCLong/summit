/**
 * @summit/reporting
 *
 * Comprehensive intelligence product generation and reporting platform
 */

// Core types
export * from './core/types.js';

// Core classes
export { ReportGenerator } from './core/ReportGenerator.js';
export type { ReportGeneratorOptions } from './core/ReportGenerator.js';

export { WorkflowManager } from './core/WorkflowManager.js';
export type {
  Workflow,
  WorkflowStep,
  Comment
} from './core/WorkflowManager.js';

export { AnalyticsTracker } from './core/AnalyticsTracker.js';
export type {
  ViewEvent,
  DownloadEvent,
  FeedbackEvent
} from './core/AnalyticsTracker.js';
