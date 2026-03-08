"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantConfig = getTenantConfig;
exports.getConfigVersion = getConfigVersion;
// @ts-nocheck
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const configPath = process.env.TENANT_DB_CONFIG ||
    path_1.default.resolve(process.cwd(), 'server/tenant-databases.json');
let configs = {};
let version = 0;
function loadConfigs() {
    try {
        const raw = fs_1.default.readFileSync(configPath, 'utf-8');
        configs = JSON.parse(raw);
        version++;
    }
    catch (err) {
        configs = {};
    }
}
// initial load
loadConfigs();
// hot reload on config changes
try {
    fs_1.default.watch(configPath, { persistent: false }, () => {
        loadConfigs();
    });
}
catch {
    // ignore watch errors; config will not hot reload
}
function getTenantConfig(tenantId) {
    return configs[tenantId];
}
function getConfigVersion() {
    return version;
}
