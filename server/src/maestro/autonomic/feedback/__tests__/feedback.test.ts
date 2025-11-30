
import { FeedbackService } from '../feedback-service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    service = new FeedbackService();
  });

  it('should calculate summary stats correctly', () => {
    service.ingestFeedback({
      source: 'USER',
      type: 'RATING_1_5',
      value: 5,
      target: { agentId: 'gpt-4' },
      tenantId: 't1'
    });
    service.ingestFeedback({
      source: 'USER',
      type: 'RATING_1_5',
      value: 3,
      target: { agentId: 'gpt-4' },
      tenantId: 't1'
    });
    service.ingestFeedback({
        source: 'USER',
        type: 'THUMBS',
        value: true,
        target: { agentId: 'gpt-4' },
        tenantId: 't1'
      });

    const summary = service.getAgentSummary('gpt-4');
    expect(summary.avgRating).toBe(4); // (5+3)/2
    expect(summary.positiveRate).toBe(1.0); // 1/1
    expect(summary.sampleSize).toBe(3);
  });
});
