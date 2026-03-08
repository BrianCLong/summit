"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
exports.validateEgress = validateEgress;
const classification_1 = require("./classification");
/**
 * Redacts sensitive content based on allowed classes.
 * If a class is NOT in the allowed list, its patterns are applied to the text.
 */
function redact(text, allowedClasses) {
    let redactedText = text;
    for (const rule of classification_1.DEFAULT_REDACTION_RULES) {
        if (!allowedClasses.includes(rule.class)) {
            redactedText = redactedText.replace(rule.pattern, rule.replacement);
        }
    }
    return redactedText;
}
/**
 * Validates a tool egress request against the tool's manifest.
 * Deny-by-default if the tool is not in the manifest.
 */
function validateEgress(toolId, contextSpace, manifest) {
    const toolEntry = manifest.tools?.[toolId];
    if (!toolEntry) {
        return false;
    }
    return toolEntry.allowedContextSpaces.includes(contextSpace);
}
