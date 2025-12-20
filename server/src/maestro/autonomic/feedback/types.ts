
export interface FeedbackEvent {
  id: string;
  timestamp: Date;
  source: 'USER' | 'SYSTEM' | 'REVIEWER';
  type: 'RATING_1_5' | 'THUMBS' | 'TEXT' | 'CORRECTION' | 'BLOCK';
  value: any; // 1-5, boolean, string, etc.
  target: {
    taskId?: string;
    agentId?: string;
    graphId?: string;
  };
  tenantId: string;
}

export interface FeedbackSummary {
  agentId: string;
  avgRating: number;
  positiveRate: number; // For thumbs
  sampleSize: number;
  recentComments: string[];
}
