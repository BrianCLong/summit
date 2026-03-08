"use strict";
/**
 * Safety Boundary Service
 *
 * Implements "shipping controls" derived from safety research.
 * specifically Artifact B (Input Sanitization) and Artifact A (Constitution Check).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safetyBoundary = exports.SafetyBoundary = void 0;
const logger_js_1 = require("../utils/logger.js");
class SafetyBoundary {
    static instance;
    // Basic Constitution: Disallow specific high-risk patterns in OUTPUT
    constitution = {
        name: 'Basic Safety Constitution',
        rules: [
            /ignore previous instructions/i, // Potential output leak or jailbreak echo
            /as an AI language model/i, // Standard refusal (sometimes we want to catch this to handle gracefully)
            /\[INST\]/i, // Leaked tokens
        ],
        failureMode: 'BLOCK'
    };
    constructor() { }
    static getInstance() {
        if (!SafetyBoundary.instance) {
            SafetyBoundary.instance = new SafetyBoundary();
        }
        return SafetyBoundary.instance;
    }
    /**
     * Artifact B: Indirect Prompt Injection Defense
     * Wraps untrusted user/retrieved content in XML tags to delineate it from system instructions.
     * This is a "product mechanism" to enforce boundary separation.
     */
    sanitizeInput(input, tag = 'user_data') {
        // 1. Remove any existing tags that might try to close the boundary
        const sanitized = input.replace(new RegExp(`</?${tag}>`, 'gi'), '[REDACTED_TAG]');
        // 2. Wrap in explicit boundary tags
        return `<${tag}>\n${sanitized}\n</${tag}>`;
    }
    /**
     * Artifact A: Constitution Check
     * Validates output against defined safety policies.
     */
    verifyOutput(output, policy = this.constitution) {
        for (const rule of policy.rules) {
            if (rule.test(output)) {
                logger_js_1.logger.warn(`Safety Boundary Violation: Output matched rule ${rule}`);
                return {
                    safe: false,
                    reason: `Violated policy rule: ${rule}`
                };
            }
        }
        // Heuristic: Check for common injection success indicators if checking output of an "injection test"
        // (This is context dependent, but for a general safety boundary, we look for leaks)
        return { safe: true };
    }
    /**
     * Checks for specific injection patterns in INPUT (Pre-flight check).
     * While "Sanitization" wraps it, this explicitly rejects known attacks.
     */
    scanInputForInjection(input) {
        const injectionPatterns = [
            /ignore previous/i,
            /system instruction/i,
            /debug mode/i,
            /admin access/i
        ];
        for (const pattern of injectionPatterns) {
            if (pattern.test(input)) {
                logger_js_1.logger.warn(`Safety Boundary Alert: Potential Injection detected: ${pattern}`);
                return {
                    safe: false,
                    reason: 'Potential Prompt Injection Detected'
                };
            }
        }
        return { safe: true };
    }
}
exports.SafetyBoundary = SafetyBoundary;
exports.safetyBoundary = SafetyBoundary.getInstance();
