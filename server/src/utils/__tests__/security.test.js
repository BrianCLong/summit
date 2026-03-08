"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const security_js_1 = require("../security.js"); // Import from local file
(0, node_test_1.describe)('validateArtifactId', () => {
    (0, node_test_1.it)('should return true for simple filenames', () => {
        node_assert_1.default.strictEqual((0, security_js_1.validateArtifactId)('file.txt'), true);
        node_assert_1.default.strictEqual((0, security_js_1.validateArtifactId)('data.json'), true);
        node_assert_1.default.strictEqual((0, security_js_1.validateArtifactId)(undefined), true);
    });
    (0, node_test_1.it)('should return false for relative paths', () => {
        node_assert_1.default.strictEqual((0, security_js_1.validateArtifactId)('../file.txt'), false);
        node_assert_1.default.strictEqual((0, security_js_1.validateArtifactId)('a/b.txt'), false);
    });
    (0, node_test_1.it)('should return false for absolute paths', () => {
        node_assert_1.default.strictEqual((0, security_js_1.validateArtifactId)('/etc/passwd'), false);
    });
});
