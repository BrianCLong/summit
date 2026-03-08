"use strict";
/**
 * Claude Code CLI Types
 *
 * Defines the schema-stable types for deterministic CLI output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXIT_CODES = void 0;
/**
 * Exit codes for the CLI
 * Documented and stable for CI integration.
 */
exports.EXIT_CODES = {
    SUCCESS: 0,
    UNEXPECTED_ERROR: 1,
    USER_ERROR: 2,
    PROVIDER_ERROR: 3,
};
