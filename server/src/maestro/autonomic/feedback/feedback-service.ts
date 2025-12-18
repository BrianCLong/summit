
import { FeedbackEvent, FeedbackSummary } from './types';
import { randomUUID } from 'crypto';

export class FeedbackService {
  private feedbackStore: FeedbackEvent[] = [];

  public ingestFeedback(event: Omit<FeedbackEvent, 'id' | 'timestamp'>): FeedbackEvent {
    const fullEvent: FeedbackEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date()
    };
    this.feedbackStore.push(fullEvent);
    // In prod: persist to DB, trigger async learning jobs
    return fullEvent;
  }

  public getAgentSummary(agentId: string): FeedbackSummary {
    const events = this.feedbackStore.filter(e => e.target.agentId === agentId);

    // Ratings
    const ratings = events.filter(e => e.type === 'RATING_1_5').map(e => e.value as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Thumbs
    const thumbs = events.filter(e => e.type === 'THUMBS').map(e => e.value as boolean);
    const positiveRate = thumbs.length > 0 ? thumbs.filter(t => t).length / thumbs.length : 0;

    // Comments
    const comments = events
        .filter(e => e.type === 'TEXT' || e.type === 'CORRECTION')
        .map(e => String(e.value))
        .slice(-5); // Last 5

    return {
      agentId,
      avgRating,
      positiveRate,
      sampleSize: events.length,
      recentComments: comments
    };
  }
}
