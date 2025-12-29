
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { extractSnapshot } from '../snapshot-api';
import { compareSnapshots, DiffResult } from '../check-api-compat';

// Jest usually provides __dirname, even in ESM mode if configured right,
// but since we are struggling with import.meta.url in jest, let's use a simple workaround
// or just rely on process.cwd() for temp file or a fixed path.
const tempFile = path.join(process.cwd(), 'scripts', '__tests__', 'temp-spec.yaml');

describe('API Compatibility Scripts', () => {

  afterAll(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  describe('snapshot-api', () => {
    it('should normalize and extract snapshot from yaml', () => {
      const yamlContent = `
openapi: 3.0.0
paths:
  /b:
    get: {}
  /a:
    post: {}
      `;
      // Ensure directory exists
      const dir = path.dirname(tempFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(tempFile, yamlContent);

      const snapshotJson = extractSnapshot(tempFile);
      const snapshot = JSON.parse(snapshotJson);

      // Check normalization (keys sorted)
      const pathKeys = Object.keys(snapshot.paths);
      expect(pathKeys).toEqual(['/a', '/b']);
    });
  });

  describe('check-api-compat', () => {
    it('should detect removed paths as breaking', () => {
      const baseline = {
        paths: {
          '/api/v1/users': { get: {} },
          '/api/v1/posts': { get: {} }
        }
      };
      const current = {
        paths: {
          '/api/v1/users': { get: {} }
        }
      };

      const result = compareSnapshots(baseline, current);
      expect(result.breaking).toContain('Path removed: /api/v1/posts');
    });

    it('should detect removed methods as breaking', () => {
      const baseline = {
        paths: {
          '/api/v1/users': { get: {}, post: {} }
        }
      };
      const current = {
        paths: {
          '/api/v1/users': { get: {} }
        }
      };

      const result = compareSnapshots(baseline, current);
      expect(result.breaking).toContain('Method removed: POST /api/v1/users');
    });

    it('should detect added paths as non-breaking', () => {
      const baseline = {
        paths: {
          '/api/v1/users': { get: {} }
        }
      };
      const current = {
        paths: {
          '/api/v1/users': { get: {} },
          '/api/v1/posts': { get: {} }
        }
      };

      const result = compareSnapshots(baseline, current);
      expect(result.nonBreaking).toContain('Path added: /api/v1/posts');
    });

    it('should ignore summary and description fields', () => {
       const baseline = {
        paths: {
          '/api/v1/users': {
              get: {},
              summary: "Get users"
          }
        }
      };
      const current = {
        paths: {
          '/api/v1/users': { get: {} }
        }
      };
       // removing summary should not be a breaking method change
       const result = compareSnapshots(baseline, current);
       expect(result.breaking).toHaveLength(0);
    });
  });
});
