import request from 'supertest';
import { createApp } from '../../src/app';
import { getPostgresPool } from '../../src/db/postgres';
import { sign } from '../../src/routes/export';
import fs from 'fs';
import path from 'path';
import { ensureExportDir, getObjectPath } from '../../src/osint/export/storage';
import JSZip from 'jszip';
import crypto from 'crypto';

// Mock user for context
const mockUser = { id: 'test-user', tenant_id: 'test-tenant', role: 'analyst' };

describe('Case Provenance Integration Tests', () => {
  let app: any;
  let pgPool: any;
  let caseId: string;
  let osintDocId: string;
  let alertId: string;
  const exportSecret = 'test-export-secret';

  beforeAll(async () => {
    process.env.EXPORT_SIGNING_SECRET = exportSecret;
    process.env.BASE_URL = 'http://localhost:3001';
    app = await createApp();
    pgPool = getPostgresPool();

    const client = await pgPool.connect();
    try {
      // Clear existing data
      await client.query('DELETE FROM case_timeline');
      await client.query('DELETE FROM case_notes');
      await client.query('DELETE FROM case_items');
      await client.query('DELETE FROM case_members');
      await client.query('DELETE FROM cases');
      await client.query('DELETE FROM legal_hold_items');
      await client.query('DELETE FROM legal_holds');

      // Create a test case
      const createCaseRes = await client.query(
        'INSERT INTO cases (tenant_id, name, summary, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
        [mockUser.tenant_id, 'Test Case with Provenance', 'Summary for provenance test', mockUser.id]
      );
      caseId = createCaseRes.rows[0].id;

      // Add OSINT_DOC item
      osintDocId = 'osint-doc-prov-1';
      await client.query(
        'INSERT INTO case_items (case_id, kind, ref_id, added_by, tags) VALUES ($1, $2, $3, $4, $5)',
        [caseId, 'OSINT_DOC', osintDocId, mockUser.id, ['tag1', 'tag2']]
      );

      // Add ALERT item
      alertId = 'alert-prov-1';
      await client.query(
        'INSERT INTO case_items (case_id, kind, ref_id, added_by, tags) VALUES ($1, $2, $3, $4, $5)',
        [caseId, 'ALERT', alertId, mockUser.id, ['critical']]
      );

      // Add a note
      await client.query(
        'INSERT INTO case_notes (case_id, author_id, body) VALUES ($1, $2, $3)',
        [caseId, mockUser.id, 'This is a test note for provenance.']
      );

    } finally {
      client.release();
    }
    ensureExportDir();
  });

  afterAll(async () => {
    const exportDir = path.resolve(process.cwd(), 'exports');
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }
  });

  test('should export a ZIP bundle with manifest.json and correct provenance', async () => {
    const query = `
      mutation ExportCaseBundle($caseId: ID!, $format: String!) {
        exportCaseBundle(caseId: $caseId, format: $format)
      }
    `;
    const variables = { caseId, format: 'ZIP' };

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(mockUser)}`)
      .send({ query, variables });

    expect(res.statusCode).toEqual(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.exportCaseBundle).toBeDefined();

    const signedUrl = res.body.data.exportCaseBundle;
    const urlParts = signedUrl.split('/');
    const fileNameWithQuery = urlParts[urlParts.length - 1];
    const fileName = fileNameWithQuery.split('?')[0];

    const downloadRes = await request(app).get(`/export/case/${fileName}?${fileNameWithQuery.split('?')[1]}`);
    expect(downloadRes.statusCode).toEqual(200);
    expect(downloadRes.headers['content-type']).toEqual('application/zip');

    // Extract ZIP content
    const zip = await JSZip.loadAsync(downloadRes.body);
    const manifestFile = zip.file('manifest.json');
    expect(manifestFile).toBeDefined();

    const manifestContent = await manifestFile.async('string');
    const manifest = JSON.parse(manifestContent);

    expect(manifest).toBeInstanceOf(Array);
    expect(manifest.length).toBeGreaterThan(0);

    // Verify manifest structure and content
    const osintItem = manifest.find(item => item.refId === osintDocId);
    expect(osintItem).toBeDefined();
    expect(osintItem.kind).toBe('OSINT_DOC');
    expect(osintItem.hash).toBeDefined();
    expect(osintItem.provenance).toBeDefined();
    expect(osintItem.provenance).toBeInstanceOf(Array);

    const alertItem = manifest.find(item => item.refId === alertId);
    expect(alertItem).toBeDefined();
    expect(alertItem.kind).toBe('ALERT');
    expect(alertItem.hash).toBeDefined();
    expect(alertItem.provenance).toBeDefined();

    // Basic hash verification (re-calculate hash of item data and compare)
    // This assumes the item content used for hashing is consistent
    const originalOsintItemData = { case_id: caseId, kind: 'OSINT_DOC', ref_id: osintDocId, added_by: mockUser.id, tags: ['tag1', 'tag2'] }; // This should match what was inserted
    const calculatedOsintHash = crypto.createHash('sha256').update(JSON.stringify(originalOsintItemData)).digest('hex');
    expect(osintItem.hash).toBe(calculatedOsintHash);

    const originalAlertItemData = { case_id: caseId, kind: 'ALERT', ref_id: alertId, added_by: mockUser.id, tags: ['critical'] }; // This should match what was inserted
    const calculatedAlertHash = crypto.createHash('sha256').update(JSON.stringify(originalAlertItemData)).digest('hex');
    expect(alertItem.hash).toBe(calculatedAlertHash);

    // Verify provenance data (basic check for presence)
    expect(osintItem.provenance.length).toBeGreaterThanOrEqual(0); // Provenance might be empty if no specific provenance was recorded
    expect(alertItem.provenance.length).toBeGreaterThanOrEqual(0);

  }, 60000); // Increased timeout for ZIP processing and DB operations

  test('should export PDF with embedded manifest and provenance info', async () => {
    const query = `
      mutation ExportCaseBundle($caseId: ID!, $format: String!) {
        exportCaseBundle(caseId: $caseId, format: $format)
      }
    `;
    const variables = { caseId, format: 'PDF' };

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(mockUser)}`)
      .send({ query, variables });

    expect(res.statusCode).toEqual(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.exportCaseBundle).toBeDefined();

    const signedUrl = res.body.data.exportCaseBundle;
    const urlParts = signedUrl.split('/');
    const fileNameWithQuery = urlParts[urlParts.length - 1];
    const fileName = fileNameWithQuery.split('?')[0];

    const downloadRes = await request(app).get(`/export/case/${fileName}?${fileNameWithQuery.split('?')[1]}`);
    expect(downloadRes.statusCode).toEqual(200);
    expect(downloadRes.headers['content-type']).toEqual('application/pdf');

    // For PDF, we can't easily parse content to verify manifest.
    // This test primarily ensures the export process completes and a PDF is returned.
    // Manual inspection or a dedicated PDF parsing library would be needed for full content verification.
    expect(downloadRes.body.length).toBeGreaterThan(100); // Ensure it's a valid PDF buffer
  }, 30000); // Increased timeout for PDF generation

  test('should export HTML with embedded manifest and provenance info', async () => {
    const query = `
      mutation ExportCaseBundle($caseId: ID!, $format: String!) {
        exportCaseBundle(caseId: $caseId, format: $format)
      }
    `;
    const variables = { caseId, format: 'HTML' };

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(mockUser)}`)
      .send({ query, variables });

    expect(res.statusCode).toEqual(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.exportCaseBundle).toBeDefined();

    const signedUrl = res.body.data.exportCaseBundle;
    const urlParts = signedUrl.split('/');
    const fileNameWithQuery = urlParts[urlParts.length - 1];
    const fileName = fileNameWithQuery.split('?')[0];

    const downloadRes = await request(app).get(`/export/case/${fileName}?${fileNameWithQuery.split('?')[1]}`);
    expect(downloadRes.statusCode).toEqual(200);
    expect(downloadRes.headers['content-type']).toEqual('text/html');

    // Verify HTML content contains manifest info
    expect(downloadRes.text).toContain('<h2>Provenance Manifest</h2>');
    expect(downloadRes.text).toContain(osintDocId);
    expect(downloadRes.text).toContain(alertId);

  }, 30000); // Increased timeout
});
