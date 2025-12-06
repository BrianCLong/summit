/**
 * Tests for API client
 */

import { createApiClient, createMockApiClient } from '../utils/api-client.js';

describe('API Client', () => {
  describe('createApiClient', () => {
    it('should create client with endpoint', () => {
      const client = createApiClient({
        endpoint: 'http://localhost:4000',
      });

      expect(client).toHaveProperty('get');
      expect(client).toHaveProperty('post');
      expect(client).toHaveProperty('put');
      expect(client).toHaveProperty('delete');
    });

    it('should create client with token', () => {
      const client = createApiClient({
        endpoint: 'http://localhost:4000',
        token: 'test-token',
      });

      expect(client).toBeDefined();
    });

    it('should create client with custom timeout', () => {
      const client = createApiClient({
        endpoint: 'http://localhost:4000',
        timeout: 60000,
      });

      expect(client).toBeDefined();
    });
  });

  describe('createMockApiClient', () => {
    it('should create mock client', () => {
      const client = createMockApiClient();

      expect(client).toHaveProperty('get');
      expect(client).toHaveProperty('post');
      expect(client).toHaveProperty('put');
      expect(client).toHaveProperty('delete');
    });

    it('should return success for GET requests', async () => {
      const client = createMockApiClient();
      const response = await client.get('/test');

      expect(response.success).toBe(true);
      expect(response.meta).toHaveProperty('requestId');
      expect(response.meta).toHaveProperty('timestamp');
    });

    it('should return success for POST requests', async () => {
      const client = createMockApiClient();
      const response = await client.post('/test', { data: 'test' });

      expect(response.success).toBe(true);
    });

    it('should return success for PUT requests', async () => {
      const client = createMockApiClient();
      const response = await client.put('/test', { data: 'test' });

      expect(response.success).toBe(true);
    });

    it('should return success for DELETE requests', async () => {
      const client = createMockApiClient();
      const response = await client.delete('/test');

      expect(response.success).toBe(true);
    });
  });
});
