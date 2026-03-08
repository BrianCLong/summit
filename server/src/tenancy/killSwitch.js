"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantKillSwitch = exports.TenantKillSwitch = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'tenant-kill-switch' });
class TenantKillSwitch {
    filePath;
    cache = {};
    lastLoadedAt = 0;
    lastState = new Map();
    lastExists = false;
    constructor(filePath = process.env.TENANT_KILL_SWITCH_FILE ||
        path_1.default.join(process.cwd(), 'config', 'tenant-killswitch.json')) {
        this.filePath = filePath;
    }
    loadConfig() {
        try {
            const exists = fs_1.default.existsSync(this.filePath);
            if (!exists) {
                if (this.lastExists !== exists) {
                    logger.warn({ filePath: this.filePath }, 'Kill-switch config file missing; tenants cannot be deactivated until it exists');
                }
                this.lastExists = false;
                this.cache = {};
                return {};
            }
            this.lastExists = true;
            const stats = fs_1.default.statSync(this.filePath);
            if (stats.mtimeMs <= this.lastLoadedAt) {
                return this.cache;
            }
            const raw = fs_1.default.readFileSync(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            this.cache = parsed;
            this.lastLoadedAt = stats.mtimeMs;
            return parsed;
        }
        catch (error) {
            logger.warn({ filePath: this.filePath, error }, 'Kill-switch config unavailable, continuing without overrides');
            this.cache = {};
            return {};
        }
    }
    isDisabled(tenantId) {
        const config = this.loadConfig();
        const disabled = Boolean(config[tenantId]);
        const previous = this.lastState.get(tenantId);
        if (previous !== disabled) {
            const action = disabled ? 'activated' : 'cleared';
            logger.warn({ tenantId, action }, `Tenant kill switch ${action} for ${tenantId}`);
            this.lastState.set(tenantId, disabled);
        }
        return disabled;
    }
    hasConfig() {
        return this.lastExists || fs_1.default.existsSync(this.filePath);
    }
}
exports.TenantKillSwitch = TenantKillSwitch;
exports.tenantKillSwitch = new TenantKillSwitch();
