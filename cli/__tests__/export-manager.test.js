"use strict";
/**
 * Export Manager Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const export_manager_js_1 = require("../src/lib/export-manager.js");
(0, globals_1.describe)('ExportManager', () => {
    let manager;
    let testDir;
    (0, globals_1.beforeEach)(() => {
        testDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'cli-test-'));
        manager = new export_manager_js_1.ExportManager({
            outputDir: testDir,
            compression: false,
            signExports: false,
        });
    });
    (0, globals_1.afterEach)(() => {
        node_fs_1.default.rmSync(testDir, { recursive: true, force: true });
    });
    (0, globals_1.describe)('exportGraph', () => {
        (0, globals_1.it)('should export nodes and relationships', async () => {
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
            const manifest = await manager.exportGraph({ nodes, relationships }, { format: 'json', compress: false });
            (0, globals_1.expect)(manifest).toHaveProperty('exportId');
            (0, globals_1.expect)(manifest).toHaveProperty('timestamp');
            (0, globals_1.expect)(manifest).toHaveProperty('files');
            (0, globals_1.expect)(manifest.stats.totalNodes).toBe(2);
            (0, globals_1.expect)(manifest.stats.totalRelationships).toBe(1);
        });
        (0, globals_1.it)('should create export files', async () => {
            const nodes = [
                { id: 'node-1', labels: ['Test'], properties: {} },
            ];
            const manifest = await manager.exportGraph({ nodes, relationships: [] }, { format: 'json', compress: false });
            const exportDir = node_path_1.default.join(testDir, `export-${manifest.exportId}`);
            (0, globals_1.expect)(node_fs_1.default.existsSync(exportDir)).toBe(true);
            (0, globals_1.expect)(node_fs_1.default.existsSync(node_path_1.default.join(exportDir, 'manifest.json'))).toBe(true);
            (0, globals_1.expect)(node_fs_1.default.existsSync(node_path_1.default.join(exportDir, 'nodes.json'))).toBe(true);
        });
        (0, globals_1.it)('should filter by labels', async () => {
            const nodes = [
                { id: 'node-1', labels: ['Person'], properties: {} },
                { id: 'node-2', labels: ['Company'], properties: {} },
            ];
            const manifest = await manager.exportGraph({ nodes, relationships: [] }, {
                format: 'json',
                compress: false,
                filter: { labels: ['Person'] },
            });
            (0, globals_1.expect)(manifest.stats.totalNodes).toBe(1);
        });
        (0, globals_1.it)('should support CSV format', async () => {
            const nodes = [
                { id: 'node-1', labels: ['Test'], properties: { name: 'Test' } },
            ];
            const manifest = await manager.exportGraph({ nodes, relationships: [] }, { format: 'csv', compress: false });
            (0, globals_1.expect)(manifest.format).toBe('csv');
            (0, globals_1.expect)(manifest.files.some((f) => f.name.endsWith('.csv'))).toBe(true);
        });
    });
    (0, globals_1.describe)('verifyExport', () => {
        (0, globals_1.it)('should verify valid export', async () => {
            const nodes = [
                { id: 'node-1', labels: ['Test'], properties: {} },
            ];
            const manifest = await manager.exportGraph({ nodes, relationships: [] }, { format: 'json', compress: false });
            const exportPath = node_path_1.default.join(testDir, `export-${manifest.exportId}`);
            const result = await manager.verifyExport(exportPath);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect missing files', async () => {
            const nodes = [
                { id: 'node-1', labels: ['Test'], properties: {} },
            ];
            const manifest = await manager.exportGraph({ nodes, relationships: [] }, { format: 'json', compress: false });
            const exportPath = node_path_1.default.join(testDir, `export-${manifest.exportId}`);
            // Delete a file
            node_fs_1.default.unlinkSync(node_path_1.default.join(exportPath, 'nodes.json'));
            const result = await manager.verifyExport(exportPath);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.includes('not found'))).toBe(true);
        });
    });
    (0, globals_1.describe)('listExports', () => {
        (0, globals_1.it)('should list all exports', async () => {
            const nodes = [{ id: 'node-1', labels: ['Test'], properties: {} }];
            await manager.exportGraph({ nodes, relationships: [] }, { compress: false });
            await manager.exportGraph({ nodes, relationships: [] }, { compress: false });
            const exports = await manager.listExports();
            (0, globals_1.expect)(exports.length).toBe(2);
            (0, globals_1.expect)(exports[0]).toHaveProperty('path');
            (0, globals_1.expect)(exports[0]).toHaveProperty('manifest');
        });
        (0, globals_1.it)('should return empty array for no exports', async () => {
            const emptyDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'empty-'));
            const emptyManager = new export_manager_js_1.ExportManager({
                outputDir: emptyDir,
                compression: false,
                signExports: false,
            });
            const exports = await emptyManager.listExports();
            (0, globals_1.expect)(exports).toHaveLength(0);
            node_fs_1.default.rmSync(emptyDir, { recursive: true, force: true });
        });
    });
});
