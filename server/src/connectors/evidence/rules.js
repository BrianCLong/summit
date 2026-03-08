"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_RULES = exports.SOURCE_REFERENCE_RULE = exports.REDACTION_MARKER_PRESENCE_RULE = exports.REQUIRED_FIELDS_RULE = void 0;
exports.REQUIRED_FIELDS_RULE = {
    id: 'required-fields',
    description: 'Checks for presence of essential fields (id, timestamp, content)',
    weight: 0.5,
    evaluate: (data) => {
        return !!(data && data.id && data.timestamp && data.content);
    }
};
exports.REDACTION_MARKER_PRESENCE_RULE = {
    id: 'redaction-marker-presence',
    description: 'Checks if content contains explicit redaction markers',
    weight: 0.3,
    evaluate: (data) => {
        // Check content for [REDACTED] or similar patterns
        const content = JSON.stringify(data);
        return /\[REDACTED\]|\[PROTECTED\]|\*{3,}/.test(content);
    }
};
exports.SOURCE_REFERENCE_RULE = {
    id: 'source-reference',
    description: 'Checks for source attribution',
    weight: 0.2,
    evaluate: (data) => {
        // Check for url or provenance
        return !!(data && (data.url || (data.metadata && data.metadata.source) || data.provenance));
    }
};
exports.ALL_RULES = [exports.REQUIRED_FIELDS_RULE, exports.REDACTION_MARKER_PRESENCE_RULE, exports.SOURCE_REFERENCE_RULE];
