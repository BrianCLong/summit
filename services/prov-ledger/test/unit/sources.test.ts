/**
 * Unit tests for Source registration endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4010';
const TEST_AUTHORITY = 'test-authority-001';
const TEST_REASON = 'automated testing';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-authority-id': TEST_AUTHORITY,
    'x-reason-for-access': TEST_REASON,
  },
});

describe('Sources API', () => {
  describe('POST /source/register', () => {
    it('should register a source with content hash computed', async () => {
      const sourceData = {
        sourceType: 'document',
        content: 'test document content for hashing',
        originUrl: 'https://example.com/doc.pdf',
        metadata: { title: 'Test Document' },
      };

      const response = await client.post('/source/register', sourceData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.id).toMatch(/^src_/);
      expect(response.data).toHaveProperty('sourceHash');
      expect(response.data.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(response.data.sourceType).toBe('document');
    });

    it('should register a source with provided hash', async () => {
      const sourceHash = 'a'.repeat(64); // Mock SHA-256 hash
      const sourceData = {
        sourceType: 'api',
        sourceHash,
        originUrl: 'https://api.example.com/data',
      };

      const response = await client.post('/source/register', sourceData);

      expect(response.status).toBe(200);
      expect(response.data.sourceHash).toBe(sourceHash);
      expect(response.data.sourceType).toBe('api');
    });

    it('should return idempotent response for duplicate hash', async () => {
      const content = 'unique-idempotent-content-' + Date.now();
      const sourceData = {
        sourceType: 'document',
        content,
      };

      // First registration
      const response1 = await client.post('/source/register', sourceData);
      expect(response1.status).toBe(200);
      const originalId = response1.data.id;

      // Second registration with same content
      const response2 = await client.post('/source/register', sourceData);
      expect(response2.status).toBe(200);
      expect(response2.data.idempotent).toBe(true);
      expect(response2.data.id).toBe(originalId);
    });

    it('should fail without hash or content', async () => {
      try {
        await client.post('/source/register', {
          sourceType: 'document',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('sourceHash or content');
      }
    });

    it('should accept all valid source types', async () => {
      const sourceTypes = ['document', 'database', 'api', 'user_input', 'sensor'];

      for (const sourceType of sourceTypes) {
        const response = await client.post('/source/register', {
          sourceType,
          content: `content-for-${sourceType}-${Date.now()}`,
        });

        expect(response.status).toBe(200);
        expect(response.data.sourceType).toBe(sourceType);
      }
    });

    it('should track license and retention policy', async () => {
      const sourceData = {
        sourceType: 'document',
        content: 'licensed content ' + Date.now(),
        licenseId: 'license-internal',
        retentionPolicy: 'EXTENDED',
      };

      const response = await client.post('/source/register', sourceData);

      expect(response.status).toBe(200);
      expect(response.data.licenseId).toBe('license-internal');
    });
  });

  describe('GET /source/:id', () => {
    let testSourceId: string;

    beforeAll(async () => {
      const response = await client.post('/source/register', {
        sourceType: 'document',
        content: 'test-get-source-' + Date.now(),
        originUrl: 'https://example.com/test',
        metadata: { purpose: 'test retrieval' },
      });
      testSourceId = response.data.id;
    });

    it('should retrieve existing source', async () => {
      const response = await client.get(`/source/${testSourceId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testSourceId);
      expect(response.data).toHaveProperty('sourceHash');
      expect(response.data).toHaveProperty('sourceType');
      expect(response.data).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent source', async () => {
      try {
        await client.get('/source/src_nonexistent');
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});
