/**
 * Tests for Swagger/OpenAPI documentation module
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

describe('OpenAPI Specification', () => {
  const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

  describe('spec.yaml', () => {
    it('should exist at expected path', () => {
      // In test environment, check relative to services/api
      const altPath = path.resolve(process.cwd(), '..', '..', 'openapi', 'spec.yaml');
      const exists = fs.existsSync(specPath) || fs.existsSync(altPath);
      expect(exists).toBe(true);
    });

    it('should be valid YAML', () => {
      const actualPath = fs.existsSync(specPath)
        ? specPath
        : path.resolve(process.cwd(), '..', '..', 'openapi', 'spec.yaml');

      if (fs.existsSync(actualPath)) {
        const content = fs.readFileSync(actualPath, 'utf8');
        expect(() => yaml.load(content)).not.toThrow();
      }
    });

    it('should contain required OpenAPI fields', () => {
      const actualPath = fs.existsSync(specPath)
        ? specPath
        : path.resolve(process.cwd(), '..', '..', 'openapi', 'spec.yaml');

      if (fs.existsSync(actualPath)) {
        const content = fs.readFileSync(actualPath, 'utf8');
        const spec = yaml.load(content) as Record<string, unknown>;

        expect(spec).toHaveProperty('openapi');
        expect(spec).toHaveProperty('info');
        expect(spec).toHaveProperty('paths');
        expect((spec as any).openapi).toMatch(/^3\./);
      }
    });

    it('should have info with title and version', () => {
      const actualPath = fs.existsSync(specPath)
        ? specPath
        : path.resolve(process.cwd(), '..', '..', 'openapi', 'spec.yaml');

      if (fs.existsSync(actualPath)) {
        const content = fs.readFileSync(actualPath, 'utf8');
        const spec = yaml.load(content) as Record<string, unknown>;
        const info = (spec as any).info;

        expect(info).toHaveProperty('title');
        expect(info).toHaveProperty('version');
        expect(typeof info.title).toBe('string');
        expect(typeof info.version).toBe('string');
      }
    });

    it('should have security schemes defined', () => {
      const actualPath = fs.existsSync(specPath)
        ? specPath
        : path.resolve(process.cwd(), '..', '..', 'openapi', 'spec.yaml');

      if (fs.existsSync(actualPath)) {
        const content = fs.readFileSync(actualPath, 'utf8');
        const spec = yaml.load(content) as Record<string, unknown>;

        expect(spec).toHaveProperty('components');
        expect((spec as any).components).toHaveProperty('securitySchemes');
      }
    });

    it('should have all expected API paths', () => {
      const actualPath = fs.existsSync(specPath)
        ? specPath
        : path.resolve(process.cwd(), '..', '..', 'openapi', 'spec.yaml');

      if (fs.existsSync(actualPath)) {
        const content = fs.readFileSync(actualPath, 'utf8');
        const spec = yaml.load(content) as Record<string, unknown>;
        const paths = Object.keys((spec as any).paths || {});

        // Check for key API endpoints
        expect(paths.some(p => p.includes('/cases'))).toBe(true);
        expect(paths.some(p => p.includes('/evidence'))).toBe(true);
        expect(paths.some(p => p.includes('/ingest'))).toBe(true);
        expect(paths.some(p => p.includes('/triage'))).toBe(true);
        expect(paths.some(p => p.includes('/admin'))).toBe(true);
        expect(paths.some(p => p.includes('/health'))).toBe(true);
      }
    });
  });
});
