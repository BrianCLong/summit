"use strict";
/**
 * Test Infrastructure: Test Server (Integration Tests)
 *
 * Problem: Integration tests need a running server instance.
 *
 * Solution: Start/stop server programmatically for tests.
 *
 * Usage:
 *   import { startServer, stopServer } from '../../test/infra/server';
 *
 *   beforeAll(async () => {
 *     await startServer();
 *   });
 *
 *   afterAll(async () => {
 *     await stopServer();
 *   });
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
exports.stopServer = stopServer;
exports.getTestServer = getTestServer;
exports.request = request;
exports.get = get;
exports.post = post;
exports.put = put;
exports.del = del;
const http_1 = __importDefault(require("http"));
let testServer = null;
/**
 * Start a test server.
 *
 * This dynamically imports and starts the application server.
 * The server is started on a random available port.
 *
 * @param options - Server options
 * @returns Test server instance
 */
async function startServer(options) {
    if (testServer) {
        throw new Error('Test server already running. Call stopServer() first.');
    }
    try {
        // Import server module (adjust path as needed)
        // Note: This is a placeholder - adjust to your actual server entry point
        const { createServer } = await Promise.resolve().then(() => __importStar(require('../../server/index.js'))).catch(() => ({
            createServer: null,
        }));
        if (!createServer) {
            // Fallback: create minimal server for testing
            const server = http_1.default.createServer((req, res) => {
                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                }
                else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            });
            return new Promise((resolve, reject) => {
                const port = options?.port || 0; // 0 = random available port
                server.listen(port, () => {
                    const address = server.address();
                    if (!address || typeof address === 'string') {
                        reject(new Error('Failed to get server address'));
                        return;
                    }
                    testServer = {
                        server,
                        port: address.port,
                        url: `http://localhost:${address.port}`,
                        pool: options?.pool,
                        redis: options?.redisClient,
                    };
                    resolve(testServer);
                });
                server.on('error', reject);
            });
        }
        // Use actual server implementation
        const server = await createServer({
            pool: options?.pool,
            redis: options?.redisClient,
        });
        return new Promise((resolve, reject) => {
            const port = options?.port || 0;
            server.listen(port, () => {
                const address = server.address();
                if (!address || typeof address === 'string') {
                    reject(new Error('Failed to get server address'));
                    return;
                }
                testServer = {
                    server,
                    port: address.port,
                    url: `http://localhost:${address.port}`,
                    pool: options?.pool,
                    redis: options?.redisClient,
                };
                resolve(testServer);
            });
            server.on('error', reject);
        });
    }
    catch (err) {
        throw new Error(`Failed to start test server: ${err}`);
    }
}
/**
 * Stop the test server.
 */
async function stopServer() {
    if (!testServer) {
        return;
    }
    return new Promise((resolve, reject) => {
        testServer.server.close((err) => {
            if (err) {
                reject(err);
            }
            else {
                testServer = null;
                resolve();
            }
        });
    });
}
/**
 * Get the current test server instance.
 *
 * @returns Test server instance or null if not running
 */
function getTestServer() {
    return testServer;
}
/**
 * Make an HTTP request to the test server.
 *
 * @param path - Request path (e.g., "/api/users")
 * @param options - Fetch options
 * @returns Fetch response
 */
async function request(path, options) {
    if (!testServer) {
        throw new Error('Test server not running. Call startServer() first.');
    }
    const url = `${testServer.url}${path}`;
    return fetch(url, options);
}
/**
 * Make a GET request to the test server.
 *
 * @param path - Request path
 * @returns Fetch response
 */
async function get(path) {
    return request(path, { method: 'GET' });
}
/**
 * Make a POST request to the test server.
 *
 * @param path - Request path
 * @param body - Request body (will be JSON stringified)
 * @returns Fetch response
 */
async function post(path, body) {
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
}
/**
 * Make a PUT request to the test server.
 *
 * @param path - Request path
 * @param body - Request body (will be JSON stringified)
 * @returns Fetch response
 */
async function put(path, body) {
    return request(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
}
/**
 * Make a DELETE request to the test server.
 *
 * @param path - Request path
 * @returns Fetch response
 */
async function del(path) {
    return request(path, { method: 'DELETE' });
}
