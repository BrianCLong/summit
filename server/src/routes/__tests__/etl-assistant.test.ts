/**
 * ETL Assistant API Tests
 * Tests for schema preview, PII scanning, and license checking endpoints
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { createETLAssistantRouter } from '../etl-assistant.js';

// Mock pg pool
const mockPgPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

describe('ETL Assistant API', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/etl', createETLAssistantRouter(mockPgPool as any));
  });

  describe('POST /etl/preview-schema', () => {
    it('should infer schema from sample data', async () => {
      const sampleData = [
        { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
      ];

      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.fields).toHaveLength(3);
      expect(response.body.record_count).toBe(2);
      expect(response.body.suggested_mappings.length).toBeGreaterThan(0);
      expect(response.body.processing_time_ms).toBeDefined();
    });

    it('should suggest Person entity mappings for person-like fields', async () => {
      const sampleData = [
        { first_name: 'Alice', email: 'alice@test.com', phone: '+1-555-0123' },
      ];

      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.primary_entity).toBe('Person');

      const firstNameMapping = response.body.suggested_mappings.find(
        (m: any) => m.source_field === 'first_name'
      );
      expect(firstNameMapping).toBeDefined();
      expect(firstNameMapping.canonical_entity).toBe('Person');
      expect(firstNameMapping.canonical_property).toBe('firstName');
      expect(firstNameMapping.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should suggest Org entity mappings for organization fields', async () => {
      const sampleData = [
        { company_name: 'Acme Corp', industry: 'Technology', city: 'SF' },
      ];

      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);

      const companyMapping = response.body.suggested_mappings.find(
        (m: any) => m.source_field === 'company_name'
      );
      expect(companyMapping).toBeDefined();
      expect(companyMapping.canonical_entity).toBe('Org');
    });

    it('should return validation error for empty sample_rows', async () => {
      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: [],
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return validation error for missing tenant_id', async () => {
      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: [{ name: 'Test' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle large datasets within time limit', async () => {
      // Generate 100 rows with 20 fields
      const sampleData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        first_name: `User${i}`,
        last_name: `Last${i}`,
        email: `user${i}@example.com`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        company: `Company ${i % 10}`,
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        created_at: '2024-01-01T12:00:00Z',
        score: i * 1.5,
        active: i % 2 === 0,
        tags: 'tag1,tag2',
        notes: 'Some notes here',
        amount: 100.5,
        quantity: 5,
        status: 'active',
        priority: 'high',
        category: 'A',
        subcategory: 'A1',
      }));

      const startTime = Date.now();
      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });
      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.record_count).toBe(100);
      expect(response.body.fields.length).toBe(20);
      // Should complete in well under 10 seconds (target: 10 minutes)
      expect(elapsed).toBeLessThan(10000);
    });
  });

  describe('POST /etl/pii-scan', () => {
    it('should detect SSN as critical PII', async () => {
      const sampleData = [
        { ssn: '123-45-6789', name: 'John Doe' },
        { ssn: '987-65-4321', name: 'Jane Smith' },
      ];

      const response = await request(app)
        .post('/etl/pii-scan')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.overall_risk).toBe('critical');
      expect(response.body.requires_dpia).toBe(true);

      const ssnMatch = response.body.pii_matches.find(
        (m: any) => m.category === 'ssn'
      );
      expect(ssnMatch).toBeDefined();
      expect(ssnMatch.severity).toBe('critical');
      expect(ssnMatch.recommended_strategy).toBe('hash');
      expect(ssnMatch.sample_value).toContain('***');
    });

    it('should detect email as medium risk PII', async () => {
      const sampleData = [
        { email_address: 'user@example.com' },
        { email_address: 'admin@example.com' },
      ];

      const response = await request(app)
        .post('/etl/pii-scan')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.pii_matches.length).toBeGreaterThan(0);

      const emailMatch = response.body.pii_matches.find(
        (m: any) => m.category === 'email'
      );
      expect(emailMatch).toBeDefined();
      expect(emailMatch.severity).toBe('medium');
    });

    it('should return no PII for safe data', async () => {
      const sampleData = [
        { product_id: 'ABC123', quantity: 5, price: 19.99 },
        { product_id: 'DEF456', quantity: 3, price: 29.99 },
      ];

      const response = await request(app)
        .post('/etl/pii-scan')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.overall_risk).toBe('none');
      expect(response.body.pii_matches).toHaveLength(0);
      expect(response.body.requires_dpia).toBe(false);
    });

    it('should redact sample values in PII matches', async () => {
      const sampleData = [
        { credit_card: '4532-1234-5678-9010' },
      ];

      const response = await request(app)
        .post('/etl/pii-scan')
        .send({
          sample_rows: sampleData,
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);

      // Sample value should be redacted
      const match = response.body.pii_matches[0];
      expect(match.sample_value).not.toContain('4532');
      expect(match.sample_value).toContain('***');
    });
  });

  describe('POST /etl/license-check', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return warning for unregistered source', async () => {
      mockPgPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/etl/license-check')
        .send({
          source_name: 'unknown-source',
          source_type: 'csv',
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.compliance_status).toBe('warn');
      expect(response.body.reason).toContain('not registered');
    });

    it('should return allow for compliant source', async () => {
      // Mock data source lookup
      mockPgPool.query.mockResolvedValueOnce({
        rows: [{ id: 'ds_123' }],
      });
      // Mock license check
      mockPgPool.query.mockResolvedValueOnce({
        rows: [
          {
            name: 'test-source',
            license_name: 'cc-by-4.0',
            compliance_level: 'allow',
            restrictions: { export_allowed: true },
          },
        ],
      });

      const response = await request(app)
        .post('/etl/license-check')
        .send({
          source_name: 'test-source',
          source_type: 'csv',
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.compliance_status).toBe('allow');
      expect(response.body.violations).toHaveLength(0);
      expect(response.body.appeal_path).toBeNull();
    });

    it('should block export-restricted source', async () => {
      mockPgPool.query.mockResolvedValueOnce({
        rows: [{ id: 'ds_456' }],
      });
      mockPgPool.query.mockResolvedValueOnce({
        rows: [
          {
            name: 'restricted-source',
            license_name: 'commercial-restricted',
            compliance_level: 'warn',
            restrictions: { export_allowed: false },
          },
        ],
      });

      const response = await request(app)
        .post('/etl/license-check')
        .send({
          source_name: 'restricted-source',
          source_type: 'api',
          operation: 'export',
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.compliance_status).toBe('block');
      expect(response.body.violations.length).toBeGreaterThan(0);
      expect(response.body.appeal_path).toBe('/ombudsman/appeals');

      // Should have human-readable reason
      expect(response.body.reason).toContain('Export not permitted');
    });

    it('should return human-readable reason for blocked operations', async () => {
      mockPgPool.query.mockResolvedValueOnce({
        rows: [{ id: 'ds_789' }],
      });
      mockPgPool.query.mockResolvedValueOnce({
        rows: [
          {
            name: 'blocked-source',
            license_name: 'proprietary',
            compliance_level: 'block',
            restrictions: {},
          },
        ],
      });

      const response = await request(app)
        .post('/etl/license-check')
        .send({
          source_name: 'blocked-source',
          source_type: 'database',
          tenant_id: 'test-tenant',
        });

      expect(response.status).toBe(200);
      expect(response.body.compliance_status).toBe('block');
      expect(response.body.reason.length).toBeGreaterThan(20);
      expect(response.body.reason).toMatch(/blocked|compliance|license/i);
    });
  });

  describe('Configurations CRUD', () => {
    it('should save configuration', async () => {
      mockPgPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/etl/configurations')
        .send({
          tenant_id: 'test-tenant',
          source_name: 'test-source',
          source_type: 'csv',
          field_mappings: [
            {
              source_field: 'name',
              canonical_entity: 'Person',
              canonical_property: 'name',
              confidence: 0.95,
            },
          ],
          pii_handling: [],
          created_by: 'test-user',
        });

      expect(response.status).toBe(201);
      expect(response.body.config_id).toBeDefined();
      expect(response.body.config_id).toMatch(/^etl_/);
    });

    it('should retrieve configuration', async () => {
      mockPgPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'etl_123',
            tenant_id: 'test-tenant',
            source_name: 'test-source',
            field_mappings: [],
          },
        ],
      });

      const response = await request(app)
        .get('/etl/configurations/etl_123?tenant_id=test-tenant');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('etl_123');
    });

    it('should return 404 for non-existent configuration', async () => {
      mockPgPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/etl/configurations/nonexistent?tenant_id=test-tenant');

      expect(response.status).toBe(404);
    });
  });

  describe('Performance', () => {
    it('should complete schema inference within acceptable time', async () => {
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        field1: `value${i}`,
        field2: i,
        field3: i % 2 === 0,
        email: `user${i}@test.com`,
      }));

      const start = Date.now();
      const response = await request(app)
        .post('/etl/preview-schema')
        .send({
          sample_rows: largeDataset,
          tenant_id: 'perf-test',
        });
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(response.body.processing_time_ms).toBeLessThan(5000);
    });
  });
});
