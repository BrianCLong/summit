"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
describe('HITLOrchestrator', () => {
    let orchestrator;
    let app; // Assuming express is imported in HITLOrchestrator
    beforeAll(() => {
        orchestrator = new src_1.HITLOrchestrator();
        // To test with supertest, we need the underlying express app
        // This requires HITLOrchestrator to expose its app or for us to mock more deeply
        // For now, we'll assume a way to get the app instance or test the methods directly
    });
    test('should create a new task', async () => {
        const workflowId = 'wf-123';
        const data = { content: 'review this' };
        // Direct call for now, supertest would be better
        const req = { body: { workflowId, data } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        orchestrator['createTask'](req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ workflowId, data, status: 'pending' }));
    });
    test('should review a task', async () => {
        // First create a task
        const workflowId = 'wf-123';
        const data = { content: 'review this' };
        const createReq = { body: { workflowId, data } };
        const createRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        orchestrator['createTask'](createReq, createRes);
        const taskId = createRes.json.mock.calls[0][0].taskId;
        // Then review it
        const reviewerId = 'user-abc';
        const decision = 'approved';
        const reviewReq = { params: { taskId }, body: { reviewerId, decision } };
        const reviewRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        orchestrator['reviewTask'](reviewReq, reviewRes);
        expect(reviewRes.status).toHaveBeenCalledWith(200);
        expect(reviewRes.json).toHaveBeenCalledWith(expect.objectContaining({ taskId, reviewerId, decision, status: 'approved' }));
    });
});
