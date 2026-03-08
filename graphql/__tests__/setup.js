"use strict";
/**
 * Jest setup file for GraphQL governance tests
 *
 * Runs before each test suite to set up global test environment
 */
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
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output
// Global test timeout
jest.setTimeout(10000);
// Global beforeAll hook
beforeAll(async () => {
    // Ensure test directories exist
    const testDirs = [
        path.join(__dirname, 'tmp'),
        path.join(__dirname, 'fixtures'),
    ];
    for (const dir of testDirs) {
        await fs.mkdir(dir, { recursive: true }).catch(() => { });
    }
});
// Global afterAll hook
afterAll(async () => {
    // Cleanup test directories
    const testDirs = [
        path.join(__dirname, 'tmp'),
    ];
    for (const dir of testDirs) {
        await fs.rm(dir, { recursive: true, force: true }).catch(() => { });
    }
});
// Add custom matchers if needed
expect.extend({
    toBeValidGraphQL(received) {
        const { buildSchema } = require('graphql');
        try {
            buildSchema(received);
            return {
                message: () => `expected ${received} not to be valid GraphQL`,
                pass: true,
            };
        }
        catch (error) {
            return {
                message: () => `expected ${received} to be valid GraphQL: ${error}`,
                pass: false,
            };
        }
    },
});
