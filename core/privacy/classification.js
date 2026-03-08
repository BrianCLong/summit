"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REDACTION_RULES = exports.RedactionClass = void 0;
/**
 * Redaction classes for memory privacy.
 * Used to classify sensitive data facets and content within memory records.
 */
var RedactionClass;
(function (RedactionClass) {
    RedactionClass["PII"] = "pii";
    RedactionClass["PHI"] = "phi";
    RedactionClass["FINANCIAL"] = "financial";
    RedactionClass["ACCESSIBILITY"] = "accessibility";
})(RedactionClass || (exports.RedactionClass = RedactionClass = {}));
exports.DEFAULT_REDACTION_RULES = [
    {
        class: RedactionClass.PII,
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: "[EMAIL_REDACTED]",
    },
    {
        class: RedactionClass.FINANCIAL,
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        replacement: "[CARD_REDACTED]",
    },
];
