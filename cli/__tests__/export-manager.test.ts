/**
 * Export Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExportManager } from '../src/lib/export-manager.js';

describe('ExportManager', () => {
  let manager: ExportManager;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    manager = new ExportManager({
      outputDir: testDir,
      compression: false,
      signExports: false,
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('exportGraph', () => {
    it('should export nodes and relationships', async () => {
      const nodes = [
        { id: 'node-1', labels: ['Person'], properties: { name: 'Alice' } },
        { id: 'node-2', labels: ['Person'], properties: { name: 'Bob' } },
      ];

      const relationships = [
        {
          id: 'rel-1',
          type: 'KNOWS',
          startNodeId: 'node-1',
          endNodeId: 'node-2',
          properties: { since: 2020 },
        },
      ];

      const manifest = await manager.exportGraph(
        { nodes, relationships },
        { format: 'json', compress: false }
      );

      expect(manifest).toHaveProperty('exportId');
      expect(manifest).toHaveProperty('timestamp');
      expect(manifest).toHaveProperty('files');
      expect(manifest.stats.totalNodes).toBe(2);
      expect(manifest.stats.totalRelationships).toBe(1);
    });

    it('should create export files', async () => {
      const nodes = [
        { id: 'node-1', labels: ['Test'], properties: {} },
      ];

      const manifest = await manager.exportGraph(
        { nodes, relationships: [] },
        { format: 'json', compress: false }
      );

      const exportDir = path.join(testDir, `export-${manifest.exportId}`);
      expect(fs.existsSync(exportDir)).toBe(true);
      expect(fs.existsSync(path.join(exportDir, 'manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(exportDir, 'nodes.json'))).toBe(true);
    });

    it('should filter by labels', async () => {
      const nodes = [
        { id: 'node-1', labels: ['Person'], properties: {} },
        { id: 'node-2', labels: ['Company'], properties: {} },
      ];

      const manifest = await manager.exportGraph(
        { nodes, relationships: [] },
        {
          format: 'json',
          compress: false,
          filter: { labels: ['Person'] },
        }
      );

      expect(manifest.stats.totalNodes).toBe(1);
    });

    it('should support CSV format', async () => {
      const nodes = [
        { id: 'node-1', labels: ['Test'], properties: { name: 'Test' } },
      ];

      const manifest = await manager.exportGraph(
        { nodes, relationships: [] },
        { format: 'csv', compress: false }
      );

      expect(manifest.format).toBe('csv');
      expect(manifest.files.some((f) => f.name.endsWith('.csv'))).toBe(true);
    });
  });

  describe('verifyExport', () => {
    it('should verify valid export', async () => {
      const nodes = [
        { id: 'node-1', labels: ['Test'], properties: {} },
      ];

      const manifest = await manager.exportGraph(
        { nodes, relationships: [] },
        { format: 'json', compress: false }
      );

      const exportPath = path.join(testDir, `export-${manifest.exportId}`);
      const result = await manager.verifyExport(exportPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing files', async () => {
      const nodes = [
        { id: 'node-1', labels: ['Test'], properties: {} },
      ];

      const manifest = await manager.exportGraph(
        { nodes, relationships: [] },
        { format: 'json', compress: false }
      );

      const exportPath = path.join(testDir, `export-${manifest.exportId}`);

      // Delete a file
      fs.unlinkSync(path.join(exportPath, 'nodes.json'));

      const result = await manager.verifyExport(exportPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
    });
  });

  describe('listExports', () => {
    it('should list all exports', async () => {
      const nodes = [{ id: 'node-1', labels: ['Test'], properties: {} }];

      await manager.exportGraph({ nodes, relationships: [] }, { compress: false });
      await manager.exportGraph({ nodes, relationships: [] }, { compress: false });

      const exports = await manager.listExports();

      expect(exports.length).toBe(2);
      expect(exports[0]).toHaveProperty('path');
      expect(exports[0]).toHaveProperty('manifest');
    });

    it('should return empty array for no exports', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
      const emptyManager = new ExportManager({
        outputDir: emptyDir,
        compression: false,
        signExports: false,
      });

      const exports = await emptyManager.listExports();

      expect(exports).toHaveLength(0);

      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
