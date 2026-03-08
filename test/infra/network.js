"use strict";
/**
 * Test Infrastructure: Network Isolation Guard
 *
 * Problem: Tests that make real HTTP calls are slow, flaky, and leak state.
 * They also make tests non-deterministic (dependent on external services).
 *
 * Solution: Block all outbound network calls during unit tests.
 * Use mocks/stubs for external dependencies.
 *
 * Usage:
 *   import { enableNetworkIsolation, disableNetworkIsolation } from '../../test/infra/network';
 *
 *   beforeAll(() => {
 *     enableNetworkIsolation();
 *   });
 *
 *   afterAll(() => {
 *     disableNetworkIsolation();
 *   });
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableNetworkIsolation = enableNetworkIsolation;
exports.disableNetworkIsolation = disableNetworkIsolation;
exports.isNetworkIsolationEnabled = isNetworkIsolationEnabled;
exports.withNetworkAccess = withNetworkAccess;
exports.createMockHttpServer = createMockHttpServer;
exports.stopMockHttpServer = stopMockHttpServer;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
// Store original request functions
let originalHttpRequest;
let originalHttpsRequest;
let isolationEnabled = false;
/**
 * Enable network isolation.
 *
 * This monkey-patches http.request and https.request to throw errors
 * when network calls are attempted during tests.
 *
 * Call this in beforeAll() for unit tests.
 */
function enableNetworkIsolation() {
    if (isolationEnabled) {
        return; // Already enabled
    }
    // Store originals
    originalHttpRequest = http_1.default.request;
    originalHttpsRequest = https_1.default.request;
    // Monkey-patch http.request
    http_1.default.request = function (...args) {
        throw new Error('Network isolation enabled: HTTP requests are blocked in unit tests. ' +
            'Use mocks or move this test to integration suite.');
    };
    // Monkey-patch https.request
    https_1.default.request = function (...args) {
        throw new Error('Network isolation enabled: HTTPS requests are blocked in unit tests. ' +
            'Use mocks or move this test to integration suite.');
    };
    isolationEnabled = true;
}
/**
 * Disable network isolation (restore original behavior).
 *
 * Call this in afterAll() to clean up.
 */
function disableNetworkIsolation() {
    if (!isolationEnabled) {
        return; // Already disabled
    }
    // Restore originals
    if (originalHttpRequest) {
        http_1.default.request = originalHttpRequest;
    }
    if (originalHttpsRequest) {
        https_1.default.request = originalHttpsRequest;
    }
    isolationEnabled = false;
}
/**
 * Check if network isolation is currently enabled.
 */
function isNetworkIsolationEnabled() {
    return isolationEnabled;
}
/**
 * Temporarily allow network access (for specific test cases).
 *
 * Use sparingly. Most tests should use mocks instead.
 *
 * @param callback - Function to run with network access
 * @returns Result of callback
 */
async function withNetworkAccess(callback) {
    const wasEnabled = isolationEnabled;
    if (wasEnabled) {
        disableNetworkIsolation();
    }
    try {
        return await callback();
    }
    finally {
        if (wasEnabled) {
            enableNetworkIsolation();
        }
    }
}
/**
 * Create a mock HTTP server for testing.
 *
 * This is useful for testing HTTP clients without making real network calls.
 *
 * @param handler - Request handler function
 * @returns Server instance and URL
 */
async function createMockHttpServer(handler) {
    const server = http_1.default.createServer(handler);
    return new Promise((resolve, reject) => {
        server.listen(0, () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Failed to get server address'));
                return;
            }
            const url = `http://localhost:${address.port}`;
            resolve({ server, url });
        });
        server.on('error', reject);
    });
}
/**
 * Stop a mock HTTP server.
 *
 * @param server - Server instance to stop
 */
async function stopMockHttpServer(server) {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
