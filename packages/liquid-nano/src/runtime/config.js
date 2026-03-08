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
exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
const crypto = __importStar(require("node:crypto"));
const DEFAULT_CONFIG = {
    id: crypto.randomUUID(),
    environment: 'dev',
    telemetry: {
        mode: 'console',
        sampleRate: 0.1
    },
    security: {
        allowDynamicPlugins: false,
        redactFields: ['secret', 'token'],
        validateSignatures: true
    },
    performance: {
        maxConcurrency: 4,
        highWatermark: 100,
        adaptiveThrottling: true
    },
    auditTrail: {
        enabled: true,
        sink: 'memory'
    }
};
function loadConfig(partial = {}) {
    const merged = {
        ...DEFAULT_CONFIG,
        ...partial,
        telemetry: {
            ...DEFAULT_CONFIG.telemetry,
            ...partial.telemetry
        },
        security: {
            ...DEFAULT_CONFIG.security,
            ...partial.security
        },
        performance: {
            ...DEFAULT_CONFIG.performance,
            ...partial.performance
        },
        auditTrail: {
            ...DEFAULT_CONFIG.auditTrail,
            ...partial.auditTrail
        }
    };
    validateConfig(merged);
    return merged;
}
function validateConfig(config) {
    if (!config.id) {
        throw new Error('runtime config must include an id');
    }
    if (config.performance.maxConcurrency <= 0) {
        throw new Error('maxConcurrency must be greater than zero');
    }
    if (config.performance.highWatermark < config.performance.maxConcurrency) {
        throw new Error('highWatermark must be >= maxConcurrency');
    }
    if (config.telemetry.mode === 'otlp' && !config.telemetry.endpoint) {
        throw new Error('otlp telemetry requires an endpoint');
    }
    if (!['dev', 'staging', 'prod', 'test'].includes(config.environment)) {
        throw new Error(`invalid environment: ${config.environment}`);
    }
}
