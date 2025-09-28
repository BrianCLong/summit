import { HITLOrchestrator } from '../src';
import request from 'supertest';

describe('HITLOrchestrator', () => {
  let orchestrator: HITLOrchestrator;
  let app: express.Application; // Assuming express is imported in HITLOrchestrator

  beforeAll(() => {
    orchestrator = new HITLOrchestrator();
    // To test with supertest, we need the underlying express app
    // This requires HITLOrchestrator to expose its app or for us to mock more deeply
    // For now, we'll assume a way to get the app instance or test the methods directly
  });

  test('should create a new task', async () => {
    const workflowId = 'wf-123';
    const data = { content: 'review this' };
    // Direct call for now, supertest would be better
    const req = { body: { workflowId, data } } as request.Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as request.Response;

    orchestrator['createTask'](req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ workflowId, data, status: 'pending' }));
  });

  test('should review a task', async () => {
    // First create a task
    const workflowId = 'wf-123';
    const data = { content: 'review this' };
    const createReq = { body: { workflowId, data } } as request.Request;
    const createRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as request.Response;
    orchestrator['createTask'](createReq, createRes);
    const taskId = createRes.json.mock.calls[0][0].taskId;

    // Then review it
    const reviewerId = 'user-abc';
    const decision = 'approved';
    const reviewReq = { params: { taskId }, body: { reviewerId, decision } } as unknown as request.Request;
    const reviewRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as request.Response;

    orchestrator['reviewTask'](reviewReq, reviewRes);

    expect(reviewRes.status).toHaveBeenCalledWith(200);
    expect(reviewRes.json).toHaveBeenCalledWith(expect.objectContaining({ taskId, reviewerId, decision, status: 'approved' }));
  });
});