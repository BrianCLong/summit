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

import http from 'http';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';

export interface TestServer {
  server: http.Server;
  port: number;
  url: string;
  pool?: Pool;
  redis?: RedisClientType;
}

let testServer: TestServer | null = null;

/**
 * Start a test server.
 *
 * This dynamically imports and starts the application server.
 * The server is started on a random available port.
 *
 * @param options - Server options
 * @returns Test server instance
 */
export async function startServer(options?: {
  pool?: Pool;
  redisClient?: RedisClientType;
  port?: number;
}): Promise<TestServer> {
  if (testServer) {
    throw new Error('Test server already running. Call stopServer() first.');
  }

  try {
    // Import server module (adjust path as needed)
    // Note: This is a placeholder - adjust to your actual server entry point
    const { createServer } = await import('../../server/index.js').catch(() => ({
      createServer: null,
    }));

    if (!createServer) {
      // Fallback: create minimal server for testing
      const server = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } else {
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
  } catch (err) {
    throw new Error(`Failed to start test server: ${err}`);
  }
}

/**
 * Stop the test server.
 */
export async function stopServer(): Promise<void> {
  if (!testServer) {
    return;
  }

  return new Promise((resolve, reject) => {
    testServer!.server.close((err) => {
      if (err) {
        reject(err);
      } else {
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
export function getTestServer(): TestServer | null {
  return testServer;
}

/**
 * Make an HTTP request to the test server.
 *
 * @param path - Request path (e.g., "/api/users")
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function request(
  path: string,
  options?: RequestInit
): Promise<Response> {
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
export async function get(path: string): Promise<Response> {
  return request(path, { method: 'GET' });
}

/**
 * Make a POST request to the test server.
 *
 * @param path - Request path
 * @param body - Request body (will be JSON stringified)
 * @returns Fetch response
 */
export async function post(path: string, body?: any): Promise<Response> {
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
export async function put(path: string, body?: any): Promise<Response> {
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
export async function del(path: string): Promise<Response> {
  return request(path, { method: 'DELETE' });
}
