"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../src/config/database', () => {
    const query = globals_1.jest.fn().mockResolvedValue({});
    return {
        getNeo4jDriver: () => ({
            session: () => ({
                run: globals_1.jest.fn().mockResolvedValue({
                    records: [
                        {
                            get: () => ({
                                properties: { uuid: '123', label: 'Test Entity' },
                            }),
                        },
                    ],
                }),
                close: globals_1.jest.fn().mockResolvedValue(undefined),
            }),
        }),
        getPostgresPool: () => ({ query }),
    };
});
globals_1.jest.mock('../src/middleware/auth', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = { id: 'user1' };
        next();
    },
    requireRole: () => (_req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
}));
const entitiesRouter = require('../src/routes/entities');
const { getPostgresPool } = require('../src/config/database');
(0, globals_1.describe)('Entities route audit logging', () => {
    (0, globals_1.it)('logs view audit with null details', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/entities', entitiesRouter);
        const pool = getPostgresPool();
        await (0, supertest_1.default)(app).get('/entities/123').expect(200);
        (0, globals_1.expect)(pool.query).toHaveBeenCalledTimes(1);
        const params = pool.query.mock.calls[0][1];
        (0, globals_1.expect)(params[4]).toBeNull();
    });
});
