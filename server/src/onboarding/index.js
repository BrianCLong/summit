"use strict";
/**
 * Enhanced Onboarding Module
 *
 * Provides guided tours, sample content, and analytics for user education.
 *
 * @module onboarding
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedOnboardingService = exports.EnhancedOnboardingService = void 0;
__exportStar(require("./types.js"), exports);
var EnhancedOnboardingService_js_1 = require("./EnhancedOnboardingService.js");
Object.defineProperty(exports, "EnhancedOnboardingService", { enumerable: true, get: function () { return EnhancedOnboardingService_js_1.EnhancedOnboardingService; } });
Object.defineProperty(exports, "enhancedOnboardingService", { enumerable: true, get: function () { return EnhancedOnboardingService_js_1.enhancedOnboardingService; } });
