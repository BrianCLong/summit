import { jest } from '@jest/globals';
import { feedbackResolvers } from '../../graphql/resolvers/feedback';
import { userFeedbackRepository } from '../../db/repositories/userFeedback.js';
import type { FeedbackRecord } from '../../db/repositories/userFeedback.js';

const mockRedisClient = { lpush: jest.fn(() => Promise.resolve(1)) };

jest.mock('../../db/redis.js', () => ({
  getRedisClient: () => mockRedisClient,
}));

jest.mock('../../db/repositories/userFeedback.js', () => {
  const actual = jest.requireActual('../../db/repositories/userFeedback.js');
  return {
    ...actual,
    userFeedbackRepository: {
      createFeedback: jest.fn(),
      listFeedback: jest.fn(),
      updateStatus: jest.fn(),
    },
  };
});

describe('feedbackResolvers', () => {
  const mockRepo = userFeedbackRepository as jest.Mocked<typeof userFeedbackRepository>;
  const sampleRecord: FeedbackRecord = {
    id: 'fb-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    userEmail: 'user@example.com',
    category: 'BUG',
    title: 'Broken panel',
    description: 'The SLA widget never loads',
    status: 'NEW',
    metadata: { contact: 'ops@example.com' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FEEDBACK_NOTIFICATION_EMAIL = 'product@summit.test';
  });

  afterEach(() => {
    delete process.env.FEEDBACK_NOTIFICATION_EMAIL;
  });

  it('submits feedback and queues email notification', async () => {
    mockRepo.createFeedback.mockResolvedValue(sampleRecord);

    const result = await feedbackResolvers.Mutation.submitFeedback(
      null,
      { input: { category: 'BUG', title: 'Broken panel', description: 'details', contact: 'ops@example.com' } },
      { user: { id: 'user-1', email: 'user@example.com', tenantId: 'tenant-1' } },
    );

    expect(mockRepo.createFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        category: 'BUG',
        title: 'Broken panel',
        description: 'details',
      }),
    );
    expect(mockRedisClient.lpush).toHaveBeenCalledTimes(1);
    expect(result.id).toEqual(sampleRecord.id);
  });

  it('throws for non-admin feedback listing', async () => {
    await expect(
      feedbackResolvers.Query.feedbackSubmissions(null, {}, { user: { role: 'VIEWER' } }),
    ).rejects.toThrow('forbidden');
  });

  it('lists feedback with tenant scoping', async () => {
    mockRepo.listFeedback.mockResolvedValue({ total: 1, items: [sampleRecord] });
    const res = await feedbackResolvers.Query.feedbackSubmissions(
      null,
      { filter: { status: 'NEW' } },
      { user: { role: 'ADMIN', tenantId: 'tenant-1' } },
    );

    expect(mockRepo.listFeedback).toHaveBeenCalledWith({ status: 'NEW', tenantId: 'tenant-1' });
    expect(res.total).toBe(1);
    expect(res.items[0].id).toBe(sampleRecord.id);
  });

  it('updates feedback status as admin', async () => {
    const updated: FeedbackRecord = { ...sampleRecord, status: 'RESOLVED' };
    mockRepo.updateStatus.mockResolvedValue(updated);

    const res = await feedbackResolvers.Mutation.updateFeedbackStatus(
      null,
      { input: { id: sampleRecord.id, status: 'RESOLVED' } },
      { user: { role: 'ADMIN' } },
    );

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(sampleRecord.id, 'RESOLVED');
    expect(res.status).toBe('RESOLVED');
  });
});
