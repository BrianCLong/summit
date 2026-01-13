/**
 * Case Workflow Engine - Main exports
 * Complete case management and workflow automation system
 */

// Main service
export { CaseWorkflowService } from './CaseWorkflowService.js';
export type { EventHandler } from './CaseWorkflowService.js';

// Core engines
export { WorkflowStateMachine } from './StateMachine.js';
export type { TransitionContext } from './StateMachine.js';
export { SLATracker } from './SLATracker.js';
export type { SLABreachEvent, SLAAtRiskEvent } from './SLATracker.js';

// Repositories
export { TaskRepo } from './repos/TaskRepo.js';
export { ParticipantRepo } from './repos/ParticipantRepo.js';
export { ApprovalRepo } from './repos/ApprovalRepo.js';

// Types
export * from './types.js';
