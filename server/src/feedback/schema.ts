export type FeedbackType = 'bug' | 'feature' | 'ux_friction' | 'reliability' | 'performance';
export type FeedbackSource = 'in-app' | 'support_portal' | 'email' | 'meeting';

export interface Feedback {
  id?: string;
  tenantId: string;
  userId: string;
  timestamp: string; // ISO Date
  type: FeedbackType;
  source: FeedbackSource;

  /**
   * High-level summary of the feedback
   */
  summary: string;

  /**
   * Detailed description
   */
  description?: string;

  /**
   * Context data (URL, component, state)
   */
  context?: Record<string, any>;

  /**
   * If related to a specific pilot feature
   */
  relatedPilotFeature?: string;

  /**
   * Urgency level
   */
  priority?: 'low' | 'medium' | 'high' | 'critical';
}
