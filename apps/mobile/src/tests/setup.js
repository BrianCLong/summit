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
/**
 * Test Setup
 * Configure test environment
 */
require("@testing-library/jest-dom");
const vitest_1 = require("vitest");
// Mock crypto.subtle for Node.js environment
if (!globalThis.crypto?.subtle) {
    const { webcrypto } = await Promise.resolve().then(() => __importStar(require('crypto')));
    globalThis.crypto = webcrypto;
}
// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vitest_1.vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vitest_1.vi.fn(),
        removeListener: vitest_1.vi.fn(),
        addEventListener: vitest_1.vi.fn(),
        removeEventListener: vitest_1.vi.fn(),
        dispatchEvent: vitest_1.vi.fn(),
    })),
});
// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: {
        register: vitest_1.vi.fn().mockResolvedValue({}),
        getRegistrations: vitest_1.vi.fn().mockResolvedValue([]),
    },
});
// Mock IndexedDB
const mockIndexedDB = {
    open: vitest_1.vi.fn(),
    databases: vitest_1.vi.fn().mockResolvedValue([]),
    deleteDatabase: vitest_1.vi.fn(),
};
Object.defineProperty(window, 'indexedDB', {
    writable: true,
    value: mockIndexedDB,
});
// Mock localStorage
const localStorageMock = {
    getItem: vitest_1.vi.fn(),
    setItem: vitest_1.vi.fn(),
    removeItem: vitest_1.vi.fn(),
    clear: vitest_1.vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: localStorageMock,
});
// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    value: localStorageMock,
});
// Mock navigator.credentials
Object.defineProperty(navigator, 'credentials', {
    writable: true,
    value: {
        get: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
    },
});
// Mock PublicKeyCredential
globalThis.PublicKeyCredential = {
    isUserVerifyingPlatformAuthenticatorAvailable: vitest_1.vi.fn().mockResolvedValue(false),
};
// Clean up after each test
afterEach(() => {
    vitest_1.vi.clearAllMocks();
});
