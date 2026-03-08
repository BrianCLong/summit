"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = __importDefault(require("../src/app.js"));
test('provenance route', async () => {
    const res = await (0, supertest_1.default)(app_js_1.default).get('/api/provenance/v1.2.3');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
});
