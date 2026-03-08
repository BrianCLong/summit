"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const redact_js_1 = require("../src/redact.js");
(0, node_test_1.default)('redactUrl strips query and fragment', () => {
    const url = 'https://api.cursor.com/v1/conversations/12345?token=secret#part1';
    const result = (0, redact_js_1.redactUrl)(url);
    node_assert_1.default.strictEqual(result.redactedUrl, 'https://api.cursor.com/v1/conversations/12345');
    node_assert_1.default.ok(result.urlHash.length > 0);
});
(0, node_test_1.default)('redactUrl with allowlist', () => {
    const url = 'https://api.example.com/v1';
    const result = (0, redact_js_1.redactUrl)(url, ['api.cursor.com']);
    node_assert_1.default.strictEqual(result.redactedUrl, 'redacted://hidden');
});
(0, node_test_1.default)('redactUrl with allowed domain', () => {
    const url = 'https://api.cursor.com/v1';
    const result = (0, redact_js_1.redactUrl)(url, ['api.cursor.com']);
    node_assert_1.default.strictEqual(result.redactedUrl, 'https://api.cursor.com/v1');
});
