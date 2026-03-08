"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEOUT_MS = exports.FEATURE_UI_AUTOMATION = void 0;
/**
 * Feature flag for UI Automation.
 * Defaults to false for safety.
 */
exports.FEATURE_UI_AUTOMATION = process.env.FEATURE_UI_AUTOMATION === 'true' || false;
exports.DEFAULT_TIMEOUT_MS = 30000;
