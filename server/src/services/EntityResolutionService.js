"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolutionService = void 0;
const BehavioralFingerprintService_js_1 = require("./BehavioralFingerprintService.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
const DEFAULT_CONFIG = {
    strategies: ['exact'],
    privacy: {
        saltedHash: false,
        salt: process.env.ER_PRIVACY_SALT,
    },
    thresholds: {
        match: 0.9,
        possible: 0.75,
    },
};
class EntityResolutionService {
    behavioralService = new BehavioralFingerprintService_js_1.BehavioralFingerprintService();
    config;
    ruleConfigs = new Map([
        ['basic', { latencyBudgetMs: 100, similarityThreshold: 0.9 }],
        ['fuzzy', { latencyBudgetMs: 500, similarityThreshold: 0.85 }],
    ]);
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (this.config.privacy.saltedHash && !this.config.privacy.salt) {
            throw new Error('EntityResolutionService: Salt must be provided when saltedHash privacy mode is enabled.');
        }
    }
    normalizeEntityProperties(entity) {
        const normalized = {};
        if (entity.name) {
            normalized.name = String(entity.name).trim().toLowerCase();
        }
        if (entity.email) {
            normalized.email = String(entity.email).trim().toLowerCase();
        }
        return normalized;
    }
    async evaluateMatch(entityA, entityB) {
        const normA = this.normalizeEntityProperties(entityA);
        const normB = this.normalizeEntityProperties(entityB);
        let score = 0;
        if (normA.email && normA.email === normB.email) {
            score = 1.0;
        }
        else if (normA.name && normA.name === normB.name) {
            score = 0.8;
        }
        return score;
    }
}
exports.EntityResolutionService = EntityResolutionService;
