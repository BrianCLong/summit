"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaConfigService = exports.DEFAULT_PLANS = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'QuotaConfig' });
exports.DEFAULT_PLANS = {
    starter: {
        api_rpm: 100,
        ingest_eps: 10,
        egress_gb_day: 1,
    },
    standard: {
        api_rpm: 6000,
        ingest_eps: 1000,
        egress_gb_day: 50,
    },
    premium: {
        api_rpm: 12000,
        ingest_eps: 2000,
        egress_gb_day: 200,
    },
    enterprise: {
        api_rpm: 100000,
        ingest_eps: 10000,
        egress_gb_day: 1000,
    },
};
const DEFAULT_STATE = {
    tenantPlans: {
        'demo-tenant': 'starter',
        'acme-corp': 'standard',
        'massive-dynamic': 'premium',
    },
    tenantOverrides: {
        'acme-corp': {
            api_rpm: 8000,
        },
    },
    featureAllowlist: {
        write_aware_sharding: ['massive-dynamic', 'acme-corp'],
        entity_resolution_v1: ['massive-dynamic'],
    },
};
class QuotaConfigService {
    static instance;
    state = DEFAULT_STATE;
    storagePath;
    constructor() {
        this.storagePath = path_1.default.join(process.cwd(), 'data', 'quota-config.json');
        this.loadConfig();
    }
    static getInstance() {
        if (!QuotaConfigService.instance) {
            QuotaConfigService.instance = new QuotaConfigService();
        }
        return QuotaConfigService.instance;
    }
    async loadConfig() {
        try {
            const data = await promises_1.default.readFile(this.storagePath, 'utf-8');
            this.state = JSON.parse(data);
            logger.info('Loaded quota configuration');
        }
        catch (error) {
            const err = error;
            if (err.code !== 'ENOENT') {
                logger.error({ err: error }, 'Failed to load quota config, using defaults');
            }
            else {
                // First run, save defaults
                await this.saveConfig();
            }
        }
    }
    async saveConfig() {
        try {
            await promises_1.default.mkdir(path_1.default.dirname(this.storagePath), { recursive: true });
            await promises_1.default.writeFile(this.storagePath, JSON.stringify(this.state, null, 2));
        }
        catch (error) {
            logger.error({ err: error }, 'Failed to save quota config');
        }
    }
    getTenantPlan(tenantId) {
        return this.state.tenantPlans[tenantId] || 'starter';
    }
    getTenantOverrides(tenantId) {
        return this.state.tenantOverrides[tenantId] || {};
    }
    getFeatureAllowlist(feature) {
        return this.state.featureAllowlist[feature] || [];
    }
    // Admin Methods
    async setTenantPlan(tenantId, plan) {
        this.state.tenantPlans[tenantId] = plan;
        await this.saveConfig();
    }
    async setTenantOverride(tenantId, limits) {
        this.state.tenantOverrides[tenantId] = {
            ...this.state.tenantOverrides[tenantId],
            ...limits,
        };
        await this.saveConfig();
    }
}
exports.quotaConfigService = QuotaConfigService.getInstance();
