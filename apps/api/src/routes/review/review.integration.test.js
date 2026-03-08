"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_js_1 = require("../../app.js");
const ReviewQueueService_js_1 = require("../../review/ReviewQueueService.js");
const ReviewAuditLog_js_1 = require("../../review/ReviewAuditLog.js");
const baseItems = [
    {
        id: 'rev-1',
        type: 'entity',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
        payload: { name: 'Alpha' },
    },
    {
        id: 'rev-2',
        type: 'relationship',
        status: 'pending',
        createdAt: '2024-01-02T00:00:00.000Z',
        payload: { from: 'Alpha', to: 'Beta' },
    },
    {
        id: 'rev-3',
        type: 'entity',
        status: 'decided',
        createdAt: '2024-01-03T00:00:00.000Z',
    },
];
function buildFixtures() {
    const audit = new ReviewAuditLog_js_1.ReviewAuditLog(() => new Date('2024-01-10T00:00:00.000Z'));
    const queue = new ReviewQueueService_js_1.ReviewQueueService({}, audit);
    queue.seed([...baseItems]);
    const { app } = (0, app_js_1.buildApp)({ reviewQueue: queue });
    return { app, queue };
}
(0, vitest_1.describe)('review queue', () => {
    (0, vitest_1.it)('filters by type and status and paginates deterministically', async () => {
        const { app } = buildFixtures();
        const firstPage = await (0, supertest_1.default)(app).get('/review/queue').query({ type: 'entity', status: 'pending', sort: 'createdAt:asc', limit: 1 });
        (0, vitest_1.expect)(firstPage.status).toBe(200);
        (0, vitest_1.expect)(firstPage.body.items).toHaveLength(1);
        (0, vitest_1.expect)(firstPage.body.items[0].id).toBe('rev-1');
        (0, vitest_1.expect)(firstPage.body.nextCursor).toBe('1');
        const secondPage = await (0, supertest_1.default)(app).get('/review/queue').query({ type: 'entity', status: 'pending', cursor: firstPage.body.nextCursor });
        (0, vitest_1.expect)(secondPage.status).toBe(200);
        (0, vitest_1.expect)(secondPage.body.items).toHaveLength(0);
    });
    (0, vitest_1.it)('serves item detail with stable data', async () => {
        const { app } = buildFixtures();
        const response = await (0, supertest_1.default)(app).get('/review/item/rev-2');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.type).toBe('relationship');
        (0, vitest_1.expect)(response.body.status).toBe('pending');
    });
});
(0, vitest_1.describe)('review decisions', () => {
    (0, vitest_1.it)('records an approval decision and audits with correlation id', async () => {
        const { app, queue } = buildFixtures();
        const response = await (0, supertest_1.default)(app)
            .post('/review/item/rev-1/decision')
            .set('x-correlation-id', 'corr-123')
            .send({ action: 'approve', reasonCode: 'rule_match' });
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body.decision.action).toBe('approve');
        (0, vitest_1.expect)(response.body.decision.correlationId).toBe('corr-123');
        const audit = queue.getAuditLog();
        (0, vitest_1.expect)(audit).toHaveLength(1);
        (0, vitest_1.expect)(audit[0]).toMatchObject({
            itemId: 'rev-1',
            correlationId: 'corr-123',
            action: 'approve',
        });
    });
    (0, vitest_1.it)('enforces idempotent decisions based on correlation id', async () => {
        const { app, queue } = buildFixtures();
        await (0, supertest_1.default)(app)
            .post('/review/item/rev-1/decision')
            .set('x-correlation-id', 'corr-repeat')
            .send({ action: 'reject', reasonCode: 'invalid' });
        const repeat = await (0, supertest_1.default)(app)
            .post('/review/item/rev-1/decision')
            .set('x-correlation-id', 'corr-repeat')
            .send({ action: 'reject', reasonCode: 'invalid' });
        (0, vitest_1.expect)(repeat.status).toBe(200);
        (0, vitest_1.expect)(repeat.body.idempotent).toBe(true);
        (0, vitest_1.expect)(queue.getAuditLog()).toHaveLength(1);
    });
});
