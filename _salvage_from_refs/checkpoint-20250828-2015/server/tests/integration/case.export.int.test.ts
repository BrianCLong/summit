import request from 'supertest';
import { createApp } from '../../src/app';
import { getPostgresPool } from '../../src/db/postgres';
import { sign } from '../../src/routes/export';
import fs from 'fs';
import path from 'path';
import { ensureExportDir, getObjectPath } from '../../src/osint/export/storage';

// Mock user for context
const mockUser = { id: 'test-user', tenant_id: 'test-tenant', role: 'analyst' };

describe('Case Export Integration Tests', () => {
  let app: any;
  let pgPool: any;
  let caseId: string;
  let osintDocId: string;
  const exportSecret = 'test-export-secret';

  beforeAll(async () => {
    process.env.EXPORT_SIGNING_SECRET = exportSecret;
    process.env.BASE_URL = 'http://localhost:3001'; // Ensure base URL for signed URLs
    app = await createApp();
    pgPool = getPostgresPool();

    // Clear existing data and create a test case and OSINT doc
    const client = await pgPool.connect();
    try {
      await client.query('DELETE FROM case_timeline');
      await client.query('DELETE FROM case_notes');
      await client.query('DELETE FROM case_items');
      await client.query('DELETE FROM case_members');
      await client.query('DELETE FROM cases');

      const createCaseRes = await client.query(
        'INSERT INTO cases (tenant_id, name, summary, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
        [mockUser.tenant_id, 'Test Case for Export', 'Summary of test case', mockUser.id]
      );
      caseId = createCaseRes.rows[0].id;

      osintDocId = 'osint-doc-123';
      await client.query(
        'INSERT INTO case_items (case_id, kind, ref_id, added_by) VALUES ($1, $2, $3, $4)',
        [caseId, 'OSINT_DOC', osintDocId, mockUser.id]
      );
    } finally {
      client.release();
    }
    ensureExportDir();
  });

  afterAll(async () => {
    // Clean up created files
    const exportDir = path.resolve(process.cwd(), 'exports');
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
    }
    // No need to close pgPool here, as it's managed by the app lifecycle
  });

  test('should export case as PDF and return a valid signed URL', async () => {
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
    expect(signedUrl).toMatch(/^http:\/\/localhost:3001\/export\/case\/case-[a-f0-9\-]+\.pdf\?ts=\d+&sig=[a-f0-9]+$/);

    // Verify the downloaded content
    const urlParts = signedUrl.split('/');
    const fileNameWithQuery = urlParts[urlParts.length - 1];
    const fileName = fileNameWithQuery.split('?')[0];

    const downloadRes = await request(app).get(`/export/case/${fileName}?${fileNameWithQuery.split('?')[1]}`);
    expect(downloadRes.statusCode).toEqual(200);
    expect(downloadRes.headers['content-type']).toEqual('application/pdf');
    expect(downloadRes.headers['content-disposition']).toMatch(`attachment; filename="${fileName}"`);
    expect(downloadRes.body.length).toBeGreaterThan(100); // PDF content should be substantial
  }, 30000); // Increased timeout for PDF generation

  test('should export case as HTML and return a valid signed URL', async () => {
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
    expect(signedUrl).toMatch(/^http:\/\/localhost:3001\/export\/case\/case-[a-f0-9\-]+\.html\?ts=\d+&sig=[a-f0-9]+$/);

    // Verify the downloaded content
    const urlParts = signedUrl.split('/');
    const fileNameWithQuery = urlParts[urlParts.length - 1];
    const fileName = fileNameWithQuery.split('?')[0];

    const downloadRes = await request(app).get(`/export/case/${fileName}?${fileNameWithQuery.split('?')[1]}`);
    expect(downloadRes.statusCode).toEqual(200);
    expect(downloadRes.headers['content-type']).toEqual('text/html');
    expect(downloadRes.headers['content-disposition']).toMatch(`attachment; filename="${fileName}"`);
    expect(downloadRes.text).toContain('<h1>Case Report: Test Case for Export</h1>');
  });

  test('should export case as ZIP and return a valid signed URL', async () => {
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
    expect(signedUrl).toMatch(/^http:\/\/localhost:3001\/export\/case\/case-[a-f0-9\-]+\.zip\?ts=\d+&sig=[a-f0-9]+$/);

    // Verify the downloaded content
    const urlParts = signedUrl.split('/');
    const fileNameWithQuery = urlParts[urlParts.length - 1];
    const fileName = fileNameWithQuery.split('?')[0];

    const downloadRes = await request(app).get(`/export/case/${fileName}?${fileNameWithQuery.split('?')[1]}`);
    expect(downloadRes.statusCode).toEqual(200);
    expect(downloadRes.headers['content-type']).toEqual('application/zip');
    expect(downloadRes.headers['content-disposition']).toMatch(`attachment; filename="${fileName}"`);
    expect(downloadRes.body.length).toBeGreaterThan(100); // ZIP content should be substantial
  });

  test('should prevent export if case is on legal hold and policy dictates', async () => {
    // First, put the case on legal hold
    const createHoldQuery = `
      mutation CreateLegalHold($name: String!) {
        createLegalHold(name: $name) {
          id
        }
      }
    `;
    const createHoldRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(mockUser)}`)
      .send({ query: createHoldQuery, variables: { name: 'Export Block Hold' } });
    const holdId = createHoldRes.body.data.createLegalHold.id;

    const addToHoldQuery = `
      mutation AddToLegalHold($holdId: ID!, $kind: String!, $refId: String!) {
        addToLegalHold(holdId: $holdId, kind: $kind, refId: $refId) {
          hold_id
        }
      }
    `;
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(mockUser)}`)
      .send({ query: addToHoldQuery, variables: { holdId, kind: 'CASE', refId: caseId } });

    // Now attempt to export - this test assumes a policy is in place to block exports
    // For a real OPA integration, you'd mock OPA responses or configure it.
    const exportQuery = `
      mutation ExportCaseBundle($caseId: ID!, $format: String!) {
        exportCaseBundle(caseId: $caseId, format: $format)
      }
    `;
    const exportVariables = { caseId, format: 'PDF' };

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(mockUser)}`)
      .send({ query: exportQuery, variables: exportVariables });

    // Expect an error indicating the export was blocked
    expect(res.statusCode).toEqual(200); // GraphQL errors still return 200 usually
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toContain('Export blocked due to legal hold policy.');
  });

  test('should deny export if reason-for-access is spoofed', async () => {
    const query = `
      mutation ExportCaseBundle($caseId: ID!, $format: String!) {
        exportCaseBundle(caseId: $caseId, format: $format)
      }
    `;
    const variables = { caseId, format: 'PDF' };

    // Spoof the user context to include a purpose that is not allowed for export
    const spoofedUser = { ...mockUser, purpose: 'spoofed-purpose' }; // Assuming 'spoofed-purpose' is not allowed by OPA

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${JSON.stringify(spoofedUser)}`) // Pass spoofed user in Authorization header
      .send({ query, variables });

    expect(res.statusCode).toEqual(200); // GraphQL errors still return 200 usually
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toContain('Unauthorized to export case bundle.'); // Or the specific OPA denial reason
  });
});
