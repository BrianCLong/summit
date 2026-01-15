/**
 * Enhanced Onboarding System Types
 *
 * Provides guided tours, sample content, and analytics for user education.
 * All outputs include GovernanceVerdict for compliance.
 *
 * SOC 2 Controls: CC6.1, CC7.2
 *
 * @module onboarding/types
 */

import { DataClassification } from '../types/data-envelope.js';
import type { GovernanceVerdict } from '../types/data-envelope.js';

/**
 * User personas for role-based onboarding paths
 */
export type OnboardingPersona =
  | 'admin'           // Platform administrators
  | 'analyst'         // Intelligence analysts
  | 'developer'       // Plugin/integration developers
  | 'compliance_officer' // Compliance and audit users
  | 'viewer';         // Read-only users

/**
 * Types of onboarding steps
 */
export type OnboardingStepType =
  | 'welcome'         // Initial welcome screen
  | 'video'           // Video tutorial
  | 'interactive'     // Interactive guided tour
  | 'checklist'       // Action checklist
  | 'sample_action'   // Try a sample action
  | 'quiz'            // Knowledge check
  | 'milestone';      // Achievement milestone

/**
 * Status of an onboarding step
 */
export type OnboardingStepStatus =
  | 'locked'          // Prerequisites not met
  | 'available'       // Ready to start
  | 'in_progress'     // Currently active
  | 'completed'       // Successfully completed
  | 'skipped';        // User opted to skip

/**
 * Onboarding flow definition
 */
export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  persona: OnboardingPersona;
  estimatedDuration: number; // Minutes
  steps: OnboardingStepDefinition[];
  prerequisites: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Definition of a single onboarding step
 */
export interface OnboardingStepDefinition {
  id: string;
  type: OnboardingStepType;
  title: string;
  description: string;
  estimatedDuration: number; // Seconds
  content: OnboardingStepContent;
  prerequisites: string[]; // Step IDs that must be completed first
  requiredActions: RequiredAction[];
  completionCriteria: CompletionCriteria;
  skippable: boolean;
  order: number;
}

/**
 * Content for an onboarding step
 */
export interface OnboardingStepContent {
  /** Main instructional text (supports markdown) */
  body: string;

  /** Video URL if applicable */
  videoUrl?: string;

  /** Image/illustration URL */
  imageUrl?: string;

  /** Interactive tour target elements */
  tourTargets?: TourTarget[];

  /** Checklist items */
  checklistItems?: ChecklistItem[];

  /** Sample action configuration */
  sampleAction?: SampleAction;

  /** Quiz questions */
  quizQuestions?: QuizQuestion[];

  /** Tips and best practices */
  tips?: string[];

  /** Related documentation links */
  docsLinks?: DocLink[];
}

/**
 * Tour target for interactive guidance
 */
export interface TourTarget {
  /** CSS selector for the target element */
  selector: string;

  /** Tooltip content */
  tooltip: string;

  /** Position of the tooltip */
  position: 'top' | 'bottom' | 'left' | 'right';

  /** Action user should take */
  action?: 'click' | 'hover' | 'input' | 'observe';

  /** Order in the tour sequence */
  order: number;
}

/**
 * Checklist item
 */
export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  autoCheck?: boolean; // Auto-detect completion
  verificationEndpoint?: string; // API to verify completion
}

/**
 * Sample action for hands-on learning
 */
export interface SampleAction {
  type: 'create_policy' | 'run_query' | 'install_plugin' | 'generate_report' | 'configure_integration';
  targetResource: string;
  sampleData: Record<string, unknown>;
  expectedOutcome: string;
  rollbackOnComplete: boolean;
}

/**
 * Quiz question for knowledge verification
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

/**
 * Documentation link
 */
export interface DocLink {
  title: string;
  url: string;
  type: 'guide' | 'reference' | 'tutorial' | 'video';
}

/**
 * Required action for step completion
 */
export interface RequiredAction {
  id: string;
  type: 'click' | 'navigate' | 'create' | 'configure' | 'verify';
  description: string;
  targetElement?: string;
  targetRoute?: string;
  verificationMethod: 'api_check' | 'event_listener' | 'manual';
}

/**
 * Criteria for step completion
 */
export interface CompletionCriteria {
  type: 'all_actions' | 'any_action' | 'time_spent' | 'quiz_passed' | 'manual';
  minTimeSpent?: number; // Seconds
  minQuizScore?: number; // Percentage (0-100)
  requiredActionsCount?: number;
}

/**
 * User's onboarding progress
 */
export interface UserOnboardingProgress {
  id: string;
  tenantId: string;
  userId: string;
  flowId: string;
  persona: OnboardingPersona;
  currentStepId: string;
  stepProgress: Map<string, StepProgress>;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  totalTimeSpent: number; // Seconds
  metrics: OnboardingMetrics;
}

/**
 * Progress for a single step
 */
export interface StepProgress {
  stepId: string;
  status: OnboardingStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  timeSpent: number; // Seconds
  actionsCompleted: string[];
  quizScore?: number;
  feedbackRating?: number; // 1-5
  feedbackComment?: string;
}

/**
 * Onboarding metrics for analytics
 */
export interface OnboardingMetrics {
  /** Total steps in flow */
  totalSteps: number;

  /** Steps completed */
  completedSteps: number;

  /** Steps skipped */
  skippedSteps: number;

  /** Average time per step */
  avgTimePerStep: number;

  /** Quiz scores */
  quizScores: number[];

  /** Features discovered */
  featuresDiscovered: string[];

  /** Help requests during onboarding */
  helpRequests: number;

  /** Friction points identified */
  frictionPoints: FrictionPoint[];
}

/**
 * Friction point during onboarding
 */
export interface FrictionPoint {
  stepId: string;
  type: 'confusion' | 'error' | 'long_duration' | 'abandonment' | 'help_request';
  timestamp: Date;
  details?: string;
}

/**
 * Sample content for quick-start
 */
export interface SampleContent {
  id: string;
  type: 'policy' | 'dashboard' | 'report' | 'integration' | 'plugin';
  name: string;
  description: string;
  persona: OnboardingPersona[];
  content: Record<string, unknown>;
  installable: boolean;
  previewUrl?: string;
}

/**
 * Contextual help tooltip
 */
export interface ContextualHelp {
  id: string;
  targetSelector: string;
  targetRoute?: string;
  title: string;
  content: string;
  learnMoreUrl?: string;
  dismissible: boolean;
  showOnce: boolean;
  priority: number;
}

/**
 * Onboarding analytics event
 */
export interface OnboardingAnalyticsEvent {
  eventId: string;
  eventType: OnboardingEventType;
  tenantHash: string; // Anonymized
  userHash: string; // Anonymized
  flowId: string;
  stepId?: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  governanceVerdict: GovernanceVerdict;
}

/**
 * Types of onboarding analytics events
 */
export type OnboardingEventType =
  | 'flow_started'
  | 'flow_completed'
  | 'flow_abandoned'
  | 'step_started'
  | 'step_completed'
  | 'step_skipped'
  | 'help_requested'
  | 'sample_installed'
  | 'feature_discovered'
  | 'friction_detected'
  | 'feedback_submitted';

/**
 * Aggregated onboarding analytics
 */
export interface OnboardingAnalyticsSummary {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalFlowsStarted: number;
    totalFlowsCompleted: number;
    completionRate: number;
    avgCompletionTime: number;
    dropOffByStep: Map<string, number>;
    featureAdoptionRates: Map<string, number>;
    topFrictionPoints: FrictionPoint[];
    personaBreakdown: Map<OnboardingPersona, number>;
  };
  governanceVerdict: GovernanceVerdict;
  classification: DataClassification;
}

/**
 * Onboarding configuration
 */
export interface OnboardingConfig {
  /** Enable onboarding for new users */
  enabled: boolean;

  /** Auto-detect persona based on role */
  autoDetectPersona: boolean;

  /** Show progress indicator */
  showProgress: boolean;

  /** Allow skipping steps */
  allowSkipping: boolean;

  /** Collect feedback after each step */
  collectStepFeedback: boolean;

  /** Analytics opt-in required */
  requireAnalyticsOptIn: boolean;

  /** Supported languages */
  supportedLocales: string[];

  /** Default locale */
  defaultLocale: string;
}
