"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../../services/nlq/src/index.js");
const globals_1 = require("@jest/globals");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(index_js_1.router);
(0, globals_1.describe)('nlq routes', () => {
    (0, globals_1.it)('compiles natural language to cypher', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/nlq/compile')
            .send({ nl: 'find all people' });
        (0, globals_1.expect)(res.body.cypher).toBe('MATCH (p:Person) RETURN p LIMIT $limit');
    });
});
