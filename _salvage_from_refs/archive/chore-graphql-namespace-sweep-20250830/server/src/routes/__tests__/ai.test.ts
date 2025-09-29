// @jest-environment node
import request from 'supertest';
import { mockEsmModule, asDefault } from '../../tests/utils/esmMock';

// Mock ESM services used by the AI routes
await jest.unstable_mockModule('../../services/EntityLinkingService.js', () => asDefault({
  suggestLinksForEntity: jest.fn().mockResolvedValue({
    success: true,
    jobId: 'job-1',
    taskId: 'task-1',
    candidates: [],
    modelName: 'mock-model'
  })
}));

await jest.unstable_mockModule('bullmq', () => ({
  Queue: jest.fn(() => ({ add: jest.fn().mockResolvedValue({ id: 'test-job-id' }), getJob: jest.fn() })),
  QueueScheduler: jest.fn(),
  Worker: jest.fn()
}));

await jest.unstable_mockModule('../../ai/ExtractionEngine.js', () => ({
  ExtractionEngine: jest.fn(() => ({ processExtraction: jest.fn().mockResolvedValue({ frames: 0 }) }))
}));

await jest.unstable_mockModule('../../db/redis.js', () => ({
  getRedisClient: jest.fn(() => ({ on: jest.fn(), ping: jest.fn() }))
}));

await jest.unstable_mockModule('../../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(() => ({ session: jest.fn(() => ({ run: jest.fn(), close: jest.fn() })) }))
}));

// Import the app AFTER mocks are set up
const appModule: any = await import('../../app.js');
const app = typeof appModule.createApp === 'function' ? await appModule.createApp() : (appModule.default ?? appModule);

describe('AI routes (ESM-safe)', () => {
  it('POST /api/ai/predict-links returns 200 and mocked payload', async () => {
    const res = await request(app)
      .post('/api/ai/predict-links')
      .send({ entityId: 'e1', topK: 3 });
    expect([200, 201]).toContain(res.status);
    expect(res.body?.success).toBeTruthy();
    expect(res.body?.candidates).toBeDefined();
  });

  it('POST /api/ai/extract-video returns 202 and jobId', async () => {
    const res = await request(app)
      .post('/api/ai/extract-video')
      .send({ mediaPath: '/path/to/video.mp4', mediaType: 'VIDEO', extractionMethods: ['video_analysis'], options: { frameRate: 1 } });
    expect(res.status).toBe(202);
    expect(res.body?.success).toBe(true);
    expect(res.body?.jobId).toBeDefined();
  });
});
