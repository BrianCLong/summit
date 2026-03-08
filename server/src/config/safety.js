"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedFeatureFlagService = getCachedFeatureFlagService;
exports.isGlobalKillSwitchEnabled = isGlobalKillSwitchEnabled;
exports.isSafeModeEnabled = isSafeModeEnabled;
exports.getSafetyState = getSafetyState;
const logger_js_1 = require("./logger.js");
const GLOBAL_KILL_SWITCH_FLAG_KEY = 'platform.kill-switch.global';
const SAFE_MODE_FLAG_KEY = 'platform.safe-mode';
let cachedFeatureFlagService;
const truthy = (value) => {
    if (!value)
        return false;
    const normalized = value.toLowerCase();
    return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
};
async function getCachedFeatureFlagService() {
    if (cachedFeatureFlagService !== undefined) {
        return cachedFeatureFlagService || undefined;
    }
    return Promise.resolve().then(() => __importStar(require('../feature-flags/setup.js'))).then((module) => {
        const service = module.getFeatureFlagService();
        cachedFeatureFlagService = service;
        return service;
    })
        .catch((error) => {
        const msg = 'Feature flag service unavailable for safety checks';
        if (logger_js_1.logger && typeof logger_js_1.logger.debug === 'function') {
            logger_js_1.logger.debug({ err: error }, msg);
        }
        else {
            console.warn(`[safety.ts] ${msg}:`, error?.message || error);
        }
        cachedFeatureFlagService = null;
        return undefined;
    });
}
async function evaluateFlag(flagService, key) {
    if (!flagService)
        return false;
    try {
        // Cast to any for method compatibility across different FeatureFlagService implementations
        return await flagService.isEnabled(key, { key: 'system' }, false);
    }
    catch (error) {
        logger_js_1.logger.warn({ err: error, flag: key }, 'Feature flag evaluation failed');
        return false;
    }
}
async function isGlobalKillSwitchEnabled(flagService) {
    if (truthy(process.env.KILL_SWITCH_GLOBAL)) {
        return true;
    }
    const key = process.env.KILL_SWITCH_FLAG_KEY || GLOBAL_KILL_SWITCH_FLAG_KEY;
    return evaluateFlag(flagService, key);
}
async function isSafeModeEnabled(flagService) {
    if (truthy(process.env.SAFE_MODE)) {
        return true;
    }
    const key = process.env.SAFE_MODE_FLAG_KEY || SAFE_MODE_FLAG_KEY;
    return evaluateFlag(flagService, key);
}
async function getSafetyState(flagService) {
    const service = flagService ?? (await getCachedFeatureFlagService());
    const [killSwitch, safeMode] = await Promise.all([
        isGlobalKillSwitchEnabled(service),
        isSafeModeEnabled(service),
    ]);
    return { killSwitch, safeMode };
}
