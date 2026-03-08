"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const redactor_js_1 = require("../src/redactor.js");
(0, node_test_1.default)('Redactor should redact emails', (t) => {
    const redactor = new redactor_js_1.Redactor();
    const input = 'Contact me at user@example.com';
    const expected = 'Contact me at [REDACTED]';
    node_assert_1.default.strictEqual(redactor.redact(input), expected);
});
(0, node_test_1.default)('Redactor should redact multiple PII', (t) => {
    const redactor = new redactor_js_1.Redactor();
    const input = 'user@example.com and 123-45-6789';
    const expected = '[REDACTED] and [REDACTED]';
    node_assert_1.default.strictEqual(redactor.redact(input), expected);
});
