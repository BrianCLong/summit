"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const globals_1 = require("@jest/globals");
let app;
const createToken = (role = 'user') => jsonwebtoken_1.default.sign({ userId: 'tester', email: 'tester@example.com', role }, process.env.JWT_SECRET || 'graph-analytics-secret');
(0, globals_1.describe)('GET /geo/points', () => {
    (0, globals_1.beforeAll)(async () => {
        process.env.JWT_SECRET = 'test-secret';
        globals_1.jest.resetModules();
        const module = await Promise.resolve().then(() => __importStar(require('../server')));
        app = module.app;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('returns spatial points ordered deterministically', async () => {
        const token = createToken();
        const bbox = '-180,-90,180,90';
        const firstResponse = await (0, supertest_1.default)(app)
            .get('/geo/points')
            .query({ bbox })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const secondResponse = await (0, supertest_1.default)(app)
            .get('/geo/points')
            .query({ bbox })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const expectedOrder = [
            'p-delhi-001',
            'p-nyc-002',
            'p-nyc-001',
            'p-la-001',
            'p-lon-001',
            'p-sydney-001',
        ];
        const firstIds = firstResponse.body.points.map((point) => point.id);
        const secondIds = secondResponse.body.points.map((point) => point.id);
        (0, globals_1.expect)(firstIds).toEqual(expectedOrder);
        (0, globals_1.expect)(secondIds).toEqual(expectedOrder);
    });
    (0, globals_1.it)('applies bbox filtering with stable ordering and limits', async () => {
        const token = createToken('admin');
        const bbox = '-75,40,-73,41';
        const firstResponse = await (0, supertest_1.default)(app)
            .get('/geo/points')
            .query({ bbox, limit: 1 })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const secondResponse = await (0, supertest_1.default)(app)
            .get('/geo/points')
            .query({ bbox, limit: 1 })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const expected = ['p-nyc-002'];
        (0, globals_1.expect)(firstResponse.body.points.map((p) => p.id)).toEqual(expected);
        (0, globals_1.expect)(secondResponse.body.points.map((p) => p.id)).toEqual(expected);
    });
    (0, globals_1.it)('rejects requests without a valid bbox', async () => {
        const token = createToken();
        await (0, supertest_1.default)(app)
            .get('/geo/points')
            .query({ bbox: 'bad,bbox' })
            .set('Authorization', `Bearer ${token}`)
            .expect(400);
    });
});
