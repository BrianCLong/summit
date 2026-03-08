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
// @ts-nocheck
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const database_js_1 = require("../../config/database.js");
(0, globals_1.describe)('Unauthenticated Access Reproduction', () => {
    let app;
    let createApp;
    (0, globals_1.beforeAll)(async () => {
        process.env.NODE_ENV = 'test';
        ({ createApp } = await Promise.resolve().then(() => __importStar(require('../../app.js'))));
        app = await createApp();
    });
    (0, globals_1.afterAll)(async () => {
        await (0, database_js_1.closeConnections)();
    });
    (0, globals_1.it)('should deny unauthenticated access to /dr/backups', async () => {
        const res = await (0, supertest_1.default)(app).get('/dr/backups');
        (0, globals_1.expect)(res.status).toBe(401);
    });
    (0, globals_1.it)('should deny unauthenticated access to /analytics/path', async () => {
        const res = await (0, supertest_1.default)(app).get('/analytics/path');
        (0, globals_1.expect)(res.status).toBe(401);
    });
});
