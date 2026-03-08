"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const validate_js_1 = require("../src/validate.js");
const __dirname = (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
(0, node_test_1.default)('validateTraceRecord with minimal valid record', () => {
    const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'fixtures/valid/minimal.json'), 'utf8'));
    const result = (0, validate_js_1.validateTraceRecord)(data);
    node_assert_1.default.strictEqual(result.valid, true, `Expected valid, got errors: ${result.errors?.join(', ')}`);
});
(0, node_test_1.default)('validateTraceRecord with missing files', () => {
    const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'fixtures/invalid/missing_files.json'), 'utf8'));
    const result = (0, validate_js_1.validateTraceRecord)(data);
    node_assert_1.default.strictEqual(result.valid, false);
    node_assert_1.default.ok(result.errors?.some(e => e.includes('required property \'files\'')));
});
(0, node_test_1.default)('validateTraceRecord with bad UUID', () => {
    const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'fixtures/invalid/bad_uuid.json'), 'utf8'));
    const result = (0, validate_js_1.validateTraceRecord)(data);
    node_assert_1.default.strictEqual(result.valid, false);
    node_assert_1.default.ok(result.errors?.some(e => e.includes('must match format "uuid"')));
});
(0, node_test_1.default)('validateTraceRecord with invalid line bounds', () => {
    const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'fixtures/valid/minimal.json'), 'utf8'));
    data.files[0].conversations[0].ranges[0].start_line = 100;
    data.files[0].conversations[0].ranges[0].end_line = 50;
    const result = (0, validate_js_1.validateTraceRecord)(data);
    node_assert_1.default.strictEqual(result.valid, false);
    node_assert_1.default.ok(result.errors?.some(e => e.includes('start_line (100) > end_line (50)')));
});
