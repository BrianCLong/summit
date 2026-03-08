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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
// Mock the service
globals_1.jest.unstable_mockModule('../../services/support-tickets.js', () => ({
    getCommentById: globals_1.jest.fn(),
    softDeleteComment: globals_1.jest.fn(),
    restoreComment: globals_1.jest.fn(),
    getComments: globals_1.jest.fn(),
    listTickets: globals_1.jest.fn(),
    getTicketCount: globals_1.jest.fn(),
    createTicket: globals_1.jest.fn(),
    getTicketById: globals_1.jest.fn(),
    updateTicket: globals_1.jest.fn(),
    deleteTicket: globals_1.jest.fn(),
    addComment: globals_1.jest.fn(),
}));
const { getCommentById, softDeleteComment, getTicketById, deleteTicket, } = await Promise.resolve().then(() => __importStar(require('../../services/support-tickets.js')));
const supportRouter = (await Promise.resolve().then(() => __importStar(require('../support-tickets.js')))).default;
(0, globals_1.describe)('Support Tickets Security', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/support', supportRouter);
    });
    (0, globals_1.describe)('resolveActor - Header Spoofing', () => {
        (0, globals_1.it)('blocks header-based identity spoofing', async () => {
            const mockComment = {
                id: 'comment-123',
                ticket_id: 'ticket-456',
                author_id: 'original-author',
                content: 'Hello'
            };
            getCommentById.mockResolvedValue(mockComment);
            const response = await (0, supertest_1.default)(app)
                .post('/api/support/tickets/ticket-456/comments/comment-123/delete')
                .set('x-user-id', 'attacker-id')
                .set('x-user-role', 'admin')
                .send({ reason: 'spoofed' });
            (0, globals_1.expect)(response.status).toBe(401); // actorId is missing because no req.user
            (0, globals_1.expect)(softDeleteComment).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Ownership and RBAC', () => {
        const regularUser = { id: 'user-1', role: 'user' };
        (0, globals_1.it)('GET /tickets/:id - regular user cannot see others ticket', async () => {
            const mockApp = (0, express_1.default)();
            mockApp.use(express_1.default.json());
            mockApp.use((req, res, next) => {
                req.user = regularUser;
                next();
            });
            mockApp.use('/api/support', supportRouter);
            getTicketById.mockResolvedValue({ id: 't-1', reporter_id: 'other-user' });
            const response = await (0, supertest_1.default)(mockApp).get('/api/support/tickets/t-1');
            (0, globals_1.expect)(response.status).toBe(403);
        });
        (0, globals_1.it)('DELETE /tickets/:id - regular user cannot delete ANY ticket', async () => {
            const mockApp = (0, express_1.default)();
            mockApp.use(express_1.default.json());
            mockApp.use((req, res, next) => {
                req.user = regularUser;
                next();
            });
            mockApp.use('/api/support', supportRouter);
            const response = await (0, supertest_1.default)(mockApp).delete('/api/support/tickets/t-1');
            (0, globals_1.expect)(response.status).toBe(403);
            (0, globals_1.expect)(deleteTicket).not.toHaveBeenCalled();
        });
    });
});
