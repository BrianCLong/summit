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

import http from 'http';
import https from 'https';

// Store original request functions
let originalHttpRequest: typeof http.request;
let originalHttpsRequest: typeof https.request;
let isolationEnabled = false;

/**
 * Enable network isolation.
 *
 * This monkey-patches http.request and https.request to throw errors
 * when network calls are attempted during tests.
 *
 * Call this in beforeAll() for unit tests.
 */
export function enableNetworkIsolation(): void {
  if (isolationEnabled) {
    return; // Already enabled
  }

  // Store originals
  originalHttpRequest = http.request;
  originalHttpsRequest = https.request;

  // Monkey-patch http.request
  (http.request as any) = function (...args: any[]) {
    throw new Error(
      'Network isolation enabled: HTTP requests are blocked in unit tests. ' +
        'Use mocks or move this test to integration suite.'
    );
  };

  // Monkey-patch https.request
  (https.request as any) = function (...args: any[]) {
    throw new Error(
      'Network isolation enabled: HTTPS requests are blocked in unit tests. ' +
        'Use mocks or move this test to integration suite.'
    );
  };

  isolationEnabled = true;
}

/**
 * Disable network isolation (restore original behavior).
 *
 * Call this in afterAll() to clean up.
 */
export function disableNetworkIsolation(): void {
  if (!isolationEnabled) {
    return; // Already disabled
  }

  // Restore originals
  if (originalHttpRequest) {
    (http.request as any) = originalHttpRequest;
  }
  if (originalHttpsRequest) {
    (https.request as any) = originalHttpsRequest;
  }

  isolationEnabled = false;
}

/**
 * Check if network isolation is currently enabled.
 */
export function isNetworkIsolationEnabled(): boolean {
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
export async function withNetworkAccess<T>(
  callback: () => Promise<T>
): Promise<T> {
  const wasEnabled = isolationEnabled;

  if (wasEnabled) {
    disableNetworkIsolation();
  }

  try {
    return await callback();
  } finally {
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
export async function createMockHttpServer(
  handler: http.RequestListener
): Promise<{ server: http.Server; url: string }> {
  const server = http.createServer(handler);

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
export async function stopMockHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
