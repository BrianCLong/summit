/**
 * Unit tests for Claims endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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

describe('Claims API', () => {
  describe('POST /claims', () => {
    it('should create a claim with all fields', async () => {
      const claimData = {
        content: {
          title: 'Test Claim',
          data: 'sample data',
        },
        metadata: {
          source: 'test suite',
        },
        sourceRef: 'file://test.txt',
        policyLabels: ['public', 'test'],
      };

      const response = await client.post('/claims', claimData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.id).toMatch(/^claim_/);
      expect(response.data).toHaveProperty('hash');
      expect(response.data.content).toEqual(claimData.content);
      expect(response.data.sourceRef).toBe(claimData.sourceRef);
      expect(response.data.policyLabels).toEqual(claimData.policyLabels);
      expect(response.data).toHaveProperty('created_at');
    });

    it('should create a minimal claim', async () => {
      const claimData = {
        content: {
          data: 'minimal test',
        },
      };

      const response = await client.post('/claims', claimData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.policyLabels).toEqual([]);
    });

    it('should fail without required content', async () => {
      try {
        await client.post('/claims', {});
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should fail without authority headers', async () => {
      const noAuthClient = axios.create({
        baseURL: BASE_URL,
      });

      try {
        await noAuthClient.post('/claims', {
          content: { test: 'data' },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect([403, 500]).toContain(error.response.status);
      }
    });
  });

  describe('GET /claims/:id', () => {
    let testClaimId: string;

    beforeAll(async () => {
      // Create a test claim
      const response = await client.post('/claims', {
        content: { test: 'get claim test' },
      });
      testClaimId = response.data.id;
    });

    it('should retrieve an existing claim', async () => {
      const response = await client.get(`/claims/${testClaimId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testClaimId);
      expect(response.data).toHaveProperty('hash');
      expect(response.data).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent claim', async () => {
      try {
        await client.get('/claims/claim_nonexistent');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('Hash consistency', () => {
    it('should generate the same hash for identical content', async () => {
      const content = {
        data: 'identical content',
        value: 123,
      };

      const response1 = await client.post('/claims', { content });
      const response2 = await client.post('/claims', { content });

      // Hashes should be the same
      expect(response1.data.hash).toBe(response2.data.hash);

      // But IDs should be different
      expect(response1.data.id).not.toBe(response2.data.id);
    });
  });
});
