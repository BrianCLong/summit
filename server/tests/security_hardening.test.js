"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../src/app.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Security Hardening: Root-Mounted Routes', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = await (0, app_js_1.createApp)();
    });
    (0, globals_1.it)('should require authentication for /airgap', async () => {
        const response = await (0, supertest_1.default)(app).get('/airgap/imports/1');
        (0, globals_1.expect)(response.status).toBe(401);
    });
});
