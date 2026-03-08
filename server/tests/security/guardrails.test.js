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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Production Guardrails', () => {
    const originalEnv = process.env;
    let exitMock;
    let consoleErrorMock;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
        process.env = { ...originalEnv };
        exitMock = globals_1.jest.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`PROCESS_EXIT_${code}`);
        });
        consoleErrorMock = globals_1.jest.spyOn(console, 'error').mockImplementation(() => { });
    });
    (0, globals_1.afterEach)(() => {
        process.env = originalEnv;
        exitMock.mockRestore();
        consoleErrorMock.mockRestore();
    });
    const importConfig = async () => {
        // In ESM, simply re-importing might not re-execute if not using a query param to bust cache,
        // but jest.resetModules() handles this for us in a Jest environment.
        return await Promise.resolve().then(() => __importStar(require('../../src/config')));
    };
    (0, globals_1.it)('should fail booting in production with default secrets', async () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'secret'; // Too short/default
        process.env.JWT_REFRESH_SECRET = 'secret';
        // Ensure other vars are present to avoid early exit on missing vars
        process.env.DATABASE_URL = 'postgresql://u:p@h:5432/db';
        process.env.NEO4J_URI = 'bolt://h:7687';
        process.env.NEO4J_USER = 'neo4j';
        process.env.NEO4J_PASSWORD = 'p';
        // We expect it to call process.exit(1)
        await (0, globals_1.expect)(importConfig()).rejects.toThrow('PROCESS_EXIT_1');
        const errorOutput = consoleErrorMock.mock.calls.flat().join(' ');
        (0, globals_1.expect)(errorOutput).toMatch(/production|security|configuration/i);
    });
    (0, globals_1.it)('should fail booting in production with localhost CORS', async () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'a_very_long_secure_random_string_of_at_least_32_chars';
        process.env.JWT_REFRESH_SECRET = 'another_very_long_secure_random_string_of_at_least_32_chars';
        process.env.DATABASE_URL = 'postgresql://user:pass@db.prod:5432/db';
        process.env.NEO4J_URI = 'bolt://db.prod:7687';
        process.env.NEO4J_USER = 'neo4j';
        process.env.NEO4J_PASSWORD = 'securepassword';
        process.env.REDIS_PASSWORD = 'securepassword';
        process.env.CORS_ORIGIN = 'http://localhost:3000'; // Fail
        await (0, globals_1.expect)(importConfig()).rejects.toThrow('PROCESS_EXIT_1');
        const errorOutput = consoleErrorMock.mock.calls.flat().join(' ');
        (0, globals_1.expect)(errorOutput).toMatch(/cors|origin/i);
    });
    (0, globals_1.it)('should pass in production with valid config', async () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'a_very_long_secure_random_string_of_at_least_32_chars';
        process.env.JWT_REFRESH_SECRET = 'another_very_long_secure_random_string_of_at_least_32_chars';
        process.env.DATABASE_URL = 'postgresql://user:pass@db.prod:5432/db';
        process.env.NEO4J_URI = 'bolt://db.prod:7687';
        process.env.NEO4J_USER = 'neo4j';
        process.env.NEO4J_PASSWORD = 'securepassword';
        process.env.REDIS_PASSWORD = 'securepassword';
        process.env.CORS_ORIGIN = 'https://app.example.com';
        // Should not throw
        await (0, globals_1.expect)(importConfig()).resolves.not.toThrow();
    });
});
