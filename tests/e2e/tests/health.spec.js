"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const testHarness_1 = require("./testHarness"); // Assuming testHarness exists or will be created
describe('health', () => {
    it('is alive', async () => {
        const app = await (0, testHarness_1.createServer)();
        const res = await (0, supertest_1.default)(app).get('/healthz');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});
