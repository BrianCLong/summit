"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../../app.js");
const EpicService_js_1 = require("../../services/EpicService.js");
describe('Epics router', () => {
    const epicService = new EpicService_js_1.EpicService();
    const app = (0, app_js_1.buildApp)({ epicService });
    it('lists all epics with progress snapshots', async () => {
        const response = await (0, supertest_1.default)(app).get('/epics').expect(200);
        expect(response.body.epics).toBeDefined();
        expect(Array.isArray(response.body.epics)).toBe(true);
        expect(response.body.epics[0]).toEqual(expect.objectContaining({
            id: 'epic-ux-surface-reduction',
            progress: expect.any(Number),
        }));
    });
    it('returns 404 for missing epic', async () => {
        const response = await (0, supertest_1.default)(app).get('/epics/unknown-epic');
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('epic_not_found');
    });
    it('updates task status and recalculates progress', async () => {
        const epicId = 'epic-ux-surface-reduction';
        const taskId = 'component-library';
        const initial = await (0, supertest_1.default)(app).get(`/epics/${epicId}`).expect(200);
        expect(initial.body.progress).toBe(0);
        const updated = await (0, supertest_1.default)(app)
            .post(`/epics/${epicId}/tasks/${taskId}/status`)
            .send({ status: 'completed', owner: 'ux-lead', note: 'Library published' })
            .expect(200);
        expect(updated.body.tasks.find((task) => task.id === taskId)).toEqual(expect.objectContaining({ status: 'completed', owner: 'ux-lead', note: 'Library published' }));
        expect(updated.body.progress).toBeGreaterThan(0);
    });
    it('rejects invalid status updates', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/epics/epic-ux-surface-reduction/tasks/component-library/status')
            .send({ status: 'invalid' })
            .expect(400);
        expect(response.body.error).toBe('invalid_status');
    });
});
