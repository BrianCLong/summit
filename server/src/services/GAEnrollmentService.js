"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAEnrollmentService = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Default configuration - can be overridden by env vars or DB
const DEFAULT_CONFIG = {
    status: process.env.GA_STATUS || 'public',
    maxTenants: parseInt(process.env.GA_MAX_TENANTS || '1000', 10),
    maxUsers: parseInt(process.env.GA_MAX_USERS || '10000', 10),
    allowedDomains: process.env.GA_ALLOWED_DOMAINS ? process.env.GA_ALLOWED_DOMAINS.split(',') : ['*'],
    blockedDomains: process.env.GA_BLOCKED_DOMAINS ? process.env.GA_BLOCKED_DOMAINS.split(',') : ['gmail.com', 'yahoo.com', 'hotmail.com'],
    allowedRegions: ['us-east-1', 'eu-central-1'],
};
class GAEnrollmentService {
    static instance;
    memoryCacheConfig = null;
    lastFetch = 0;
    CACHE_TTL = 30000; // 30 seconds
    constructor() {
        // Lazy init pool
    }
    get pool() {
        return (0, database_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!GAEnrollmentService.instance) {
            GAEnrollmentService.instance = new GAEnrollmentService();
        }
        return GAEnrollmentService.instance;
    }
    async init() {
        // Ensure table exists
        const client = await this.pool.connect();
        try {
            await client.query(`
            CREATE TABLE IF NOT EXISTS system_kv_store (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
            // Insert default if not exists
            await client.query(`
            INSERT INTO system_kv_store (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO NOTHING
        `, ['ga_enrollment_config', JSON.stringify(DEFAULT_CONFIG)]);
        }
        finally {
            client.release();
        }
    }
    async updateConfig(newConfig) {
        const current = await this.getConfig();
        const updated = { ...current, ...newConfig };
        const client = await this.pool.connect();
        try {
            await client.query(`
            INSERT INTO system_kv_store (key, value, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
        `, ['ga_enrollment_config', JSON.stringify(updated)]);
            this.memoryCacheConfig = updated;
            this.lastFetch = Date.now();
            logger_js_1.default.info('GA Enrollment Configuration updated', updated);
        }
        finally {
            client.release();
        }
    }
    async getConfig() {
        if (this.memoryCacheConfig && (Date.now() - this.lastFetch < this.CACHE_TTL)) {
            return this.memoryCacheConfig;
        }
        const client = await this.pool.connect();
        try {
            const res = await client.query('SELECT value FROM system_kv_store WHERE key = $1', ['ga_enrollment_config']);
            if (res.rows.length === 0) {
                return DEFAULT_CONFIG;
            }
            this.memoryCacheConfig = res.rows[0].value;
            this.lastFetch = Date.now();
            return this.memoryCacheConfig;
        }
        catch (e) {
            logger_js_1.default.error('Failed to fetch GA config, using default', e);
            return DEFAULT_CONFIG;
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if a new user can register.
     */
    async checkUserEnrollmentEligibility(email) {
        const config = await this.getConfig();
        // 1. Check Status
        if (config.status === 'closed') {
            return { eligible: false, reason: 'Enrollment is currently closed.' };
        }
        // 2. Check Domain
        const domain = email.split('@')[1];
        if (!domain)
            return { eligible: false, reason: 'Invalid email format' };
        if (config.blockedDomains.includes(domain)) {
            return { eligible: false, reason: 'Email domain not allowed.' };
        }
        if (!config.allowedDomains.includes('*') && !config.allowedDomains.includes(domain)) {
            return { eligible: false, reason: 'Email domain not allowed.' };
        }
        // 3. Check Capacity
        const capacity = await this.checkUserCapacity(config);
        if (!capacity.available) {
            return { eligible: false, reason: capacity.reason };
        }
        return { eligible: true };
    }
    /**
     * Check if a new tenant can be created.
     */
    async checkTenantEnrollmentEligibility(region) {
        const config = await this.getConfig();
        // 1. Check Status
        if (config.status === 'closed') {
            return { eligible: false, reason: 'Enrollment is currently closed.' };
        }
        // 2. Check Region
        if (!config.allowedRegions.includes(region)) {
            return { eligible: false, reason: `Region ${region} is not supported in GA.` };
        }
        // 3. Check Capacity
        const capacity = await this.checkTenantCapacity(config);
        if (!capacity.available) {
            return { eligible: false, reason: capacity.reason };
        }
        return { eligible: true };
    }
    async checkUserCapacity(config) {
        const client = await this.pool.connect();
        try {
            const res = await client.query('SELECT COUNT(*) as count FROM users');
            const count = parseInt(res.rows[0].count, 10);
            if (count >= config.maxUsers) {
                return { available: false, reason: 'Maximum user capacity reached.' };
            }
            return { available: true };
        }
        finally {
            client.release();
        }
    }
    async checkTenantCapacity(config) {
        const client = await this.pool.connect();
        try {
            const res = await client.query('SELECT COUNT(*) as count FROM tenants');
            const count = parseInt(res.rows[0].count, 10);
            if (count >= config.maxTenants) {
                return { available: false, reason: 'Maximum tenant capacity reached.' };
            }
            return { available: true };
        }
        finally {
            client.release();
        }
    }
}
exports.GAEnrollmentService = GAEnrollmentService;
exports.default = GAEnrollmentService.getInstance();
