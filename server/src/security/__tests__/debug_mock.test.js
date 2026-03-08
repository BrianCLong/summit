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
// Explicitly mock the database config using unstable_mockModule for ESM support
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getNeo4jDriver: globals_1.jest.fn().mockReturnValue({}),
}));
describe('Mock Resolution Debug', () => {
    it('should resolve getNeo4jDriver as a mock function', async () => {
        const { getNeo4jDriver } = await Promise.resolve().then(() => __importStar(require('../../config/database.js')));
        const { IntelGraphClientImpl } = await Promise.resolve().then(() => __importStar(require('../../intelgraph/client-impl.js')));
        console.log('getNeo4jDriver type:', typeof getNeo4jDriver);
        const client = new IntelGraphClientImpl();
        // Accessing private property for test verification (cast to any)
        const driver = client.driver;
        console.log('Client driver value:', driver);
        expect(getNeo4jDriver).toBeDefined();
        // Verify it returns the mock object
        expect(getNeo4jDriver()).toEqual({});
    });
});
