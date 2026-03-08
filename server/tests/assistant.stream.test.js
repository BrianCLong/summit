"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const supertest_1 = __importDefault(require("supertest"));
const assistant_js_1 = require("../src/routes/assistant.js");
const requestId_js_1 = require("../src/middleware/requestId.js");
const globals_1 = require("@jest/globals");
// Minimal auth stub for tests
globals_1.jest.mock('../src/middleware/auth', () => ({
    auth: () => (_req, _res, next) => next(),
}));
globals_1.jest.mock('../src/middleware/rateLimit', () => ({
    rateLimit: () => (_req, _res, next) => next(),
}));
globals_1.jest.mock('../src/db/audit', () => ({
    logAssistantEvent: globals_1.jest.fn().mockResolvedValue(undefined),
}));
function makeApp() {
    const app = (0, express_1.default)();
    app.use((0, requestId_js_1.requestId)());
    app.use(body_parser_1.default.json());
    (0, assistant_js_1.mountAssistant)(app);
    return app;
}
(0, globals_1.describe)('POST /assistant/stream', () => {
    (0, globals_1.it)('streams tokens and completes', async () => {
        const app = makeApp();
        const res = await (0, supertest_1.default)(app)
            .post('/assistant/stream')
            .send({ input: 'hello world' })
            .buffer(true) // collect body
            .parse((res, cb) => {
            // Accumulate chunks as text
            res.setEncoding('utf8');
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => cb(null, data));
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.type).toMatch(/text\/plain/);
        (0, globals_1.expect)(res.text.replace(/\s+/g, ' ')).toMatch(/I understand your query: hello world/);
    });
});
